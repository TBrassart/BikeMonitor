import { supabase, authService } from './api'; // On ajoute authService aux imports

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET;

const getRedirectUri = () => {
    return window.location.origin + '/strava-callback';
};

export const stravaService = {
    async initiateAuth() {
        if (!CLIENT_ID) {
            alert("Erreur Config : VITE_STRAVA_CLIENT_ID manquant dans Vercel.");
            return;
        }
        
        const redirectUri = getRedirectUri();
        const scope = 'read,activity:read_all,profile:read_all';
        const authUrl = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
        
        window.location.href = authUrl;
    },

    async handleCallback(code) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Utilisateur non connecté");

        let profile = await authService.getMyProfile();
        if (!profile) profile = await authService.createInitialProfile(user);

        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code'
            })
        });

        const data = await response.json();
        if (data.errors) throw new Error(JSON.stringify(data.errors));

        const { error } = await supabase
            .from('profile_integrations')
            .upsert({
                profile_id: profile.id,
                provider: 'strava',
                athlete_id: data.athlete.id.toString(),
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: data.expires_at,
                updated_at: new Date()
            }, { onConflict: 'profile_id,provider' });

        if (error) throw error;
        return data.athlete;
    },

    // --- DISCONNECT ---
    async disconnect() {
        const profile = await authService.getMyProfile();
        if (!profile) return;
        const { error } = await supabase.from('profile_integrations').delete().eq('profile_id', profile.id).eq('provider', 'strava');
        if (error) throw error;
    },

    // --- SYNCHRO INTELLIGENTE ---

    async syncActivities() {
        const profile = await authService.getMyProfile();
        if (!profile) return { added: 0 };

        const { data: integration } = await supabase
            .from('profile_integrations')
            .select('*')
            .eq('profile_id', profile.id)
            .eq('provider', 'strava')
            .single();

        if (!integration) return { added: 0 };

        const token = await this.refreshAccessTokenIfNeeded(integration);

        // Récupérer la dernière activité pour ne charger que les nouvelles
        const { data: lastActivity } = await supabase
            .from('activities')
            .select('start_date')
            .eq('profile_id', profile.id)
            .order('start_date', { ascending: false })
            .limit(1)
            .single();

        const after = lastActivity ? new Date(lastActivity.start_date).getTime() / 1000 : 0;
        
        // On récupère les activités
        const activities = await this.fetchStravaActivities(token, after);
        console.log(`📥 Strava: ${activities.length} nouvelles activités.`);

        let addedCount = 0;

        for (const act of activities) {
            // LOGIQUE AUTO-CREATE : On trouve ou on crée le vélo
            let bikeId = null;
            if (act.gear_id) {
                bikeId = await this.getOrCreateBike(act.gear_id, token, profile.user_id);
            }

            const { error } = await supabase.from('activities').upsert({
                id: act.id.toString(),
                profile_id: profile.id,
                bike_id: bikeId,
                name: act.name,
                type: act.type,
                distance: act.distance,
                moving_time: act.moving_time,
                total_elevation_gain: act.total_elevation_gain,
                start_date: act.start_date,
                map_polyline: act.map?.summary_polyline,
                external_data: act
            }, { onConflict: 'id' });

            if (!error) {
                addedCount++;
                if (bikeId) await this.calculateWear(bikeId, act.distance / 1000);
            }
        }
        return { added: addedCount };
    },

    // --- FONCTION MAGIQUE : GET OR CREATE BIKE ---
    async getOrCreateBike(stravaGearId, accessToken, userId) {
        if (!stravaGearId) return null;

        // 1. Est-ce qu'on l'a déjà ?
        const { data: existingBike } = await supabase
            .from('bikes')
            .select('id')
            .eq('strava_gear_id', stravaGearId)
            .single();

        if (existingBike) return existingBike.id;

        // 2. Si non, on demande les détails à Strava
        console.log(`🚲 Nouveau vélo détecté (${stravaGearId}), création en cours...`);
        try {
            const res = await fetch(`https://www.strava.com/api/v3/gear/${stravaGearId}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (!res.ok) return null; // Si Strava ne le trouve pas, tant pis

            const gearData = await res.json();

            // 3. On le crée dans le Garage
            const { data: newBike, error } = await supabase
                .from('bikes')
                .insert([{
                    user_id: userId,
                    name: gearData.name || 'Vélo Strava', // Ex: "Tarmac SL7"
                    brand: gearData.brand_name || 'Inconnu',
                    model: gearData.model_name || '',
                    strava_gear_id: stravaGearId,
                    total_km: Math.round(gearData.distance / 1000), // On reprend le km réel de Strava
                    type: 'Route' // Par défaut, l'utilisateur changera si besoin
                }])
                .select()
                .single();

            if (error) {
                console.error("Erreur création vélo auto:", error);
                return null;
            }

            return newBike.id;

        } catch (e) {
            console.error("Erreur fetch gear Strava:", e);
            return null;
        }
    },

    async calculateWear(bikeId, kmDelta) {
        const { data: bike } = await supabase.from('bikes').select('total_km').eq('id', bikeId).single();
        if (bike) {
            const newTotal = (bike.total_km || 0) + kmDelta;
            await supabase.from('bikes').update({ total_km: Math.round(newTotal) }).eq('id', bikeId);
        }
        const { data: parts } = await supabase.from('parts').select('*').eq('bike_id', bikeId);
        if (parts) {
            for (const part of parts) {
                const newKm = (part.km_current || 0) + kmDelta;
                let wearPct = 0;
                if (part.life_target_km > 0) wearPct = (newKm / part.life_target_km) * 100;
                let status = wearPct >= 100 ? 'critical' : (wearPct >= 75 ? 'warning' : 'ok');
                await supabase.from('parts').update({
                    km_current: Math.round(newKm),
                    wear_percentage: Math.round(wearPct),
                    status: status
                }).eq('id', part.id);
            }
        }
    },

    async refreshAccessTokenIfNeeded(integration) {
        const now = Math.floor(Date.now() / 1000);
        if (integration.expires_at && integration.expires_at < now + 300) {
            const res = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: 'refresh_token',
                    refresh_token: integration.refresh_token
                })
            });
            const data = await res.json();
            await supabase.from('profile_integrations').update({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: data.expires_at
            }).eq('id', integration.id);
            return data.access_token;
        }
        return integration.access_token;
    },

    async fetchStravaActivities(token, afterTimestamp) {
        let page = 1;
        let allActivities = [];
        let keepFetching = true;
        while (keepFetching) {
            const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${afterTimestamp}&page=${page}&per_page=30`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) break;
            const data = await res.json();
            if (!data || data.length === 0) keepFetching = false;
            else {
                allActivities = [...allActivities, ...data];
                page++;
            }
        }
        return allActivities;
    }
};