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
        const scope = 'read,activity:read_all';
        const authUrl = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
        
        window.location.href = authUrl;
    },

    async handleCallback(code) {
        // 1. On récupère l'utilisateur connecté
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Utilisateur non connecté");

        // 2. CRITIQUE : On récupère le PROFIL associé à cet utilisateur
        // C'est cet ID (profile.id) qu'il faut stocker, pas user.id
        let profile = await authService.getMyProfile();
        
        // Sécurité : si le profil n'existe pas (bug de migration), on le force
        if (!profile) {
            console.log("Profil introuvable, création à la volée...");
            profile = await authService.createInitialProfile(user);
        }

        if (!profile || !profile.id) {
            throw new Error("Impossible de récupérer un profil valide pour lier Strava.");
        }

        // 3. Échange du code Strava
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

        // 4. Sauvegarde avec le bon profile_id
        const { error } = await supabase
            .from('profile_integrations')
            .upsert({
                profile_id: profile.id, // <-- CORRECTION ICI (C'était user.id avant)
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
        const user = await authService.getCurrentUser();
        if (!user) return;
        
        const profile = await authService.getMyProfile();
        if (!profile) return;

        const { error } = await supabase
            .from('profile_integrations')
            .delete()
            .eq('profile_id', profile.id) // Correction ici aussi
            .eq('provider', 'strava');
            
        if (error) throw error;
    },

    // --- SYNCHRO ---
    async syncActivities() {
        const user = await authService.getCurrentUser();
        if (!user) return { added: 0 };

        const profile = await authService.getMyProfile();
        if (!profile) return { added: 0 };

        // On cherche l'intégration avec le profile_id
        const { data: integration } = await supabase
            .from('profile_integrations')
            .select('*')
            .eq('profile_id', profile.id)
            .eq('provider', 'strava')
            .single();

        if (!integration) return { added: 0 };

        const token = await this.refreshAccessTokenIfNeeded(integration);

        const { data: lastActivity } = await supabase
            .from('activities')
            .select('start_date')
            .eq('profile_id', profile.id) // Correction
            .order('start_date', { ascending: false })
            .limit(1)
            .single();

        const after = lastActivity ? new Date(lastActivity.start_date).getTime() / 1000 : 0;
        const activities = await this.fetchStravaActivities(token, after);

        let addedCount = 0;
        for (const act of activities) {
            const { data: bike } = await supabase
                .from('bikes')
                .select('id, total_km')
                .eq('strava_gear_id', act.gear_id)
                .single();

            const bikeId = bike ? bike.id : null;

            const { error } = await supabase.from('activities').upsert({
                id: act.id.toString(),
                profile_id: profile.id, // Correction
                bike_id: bikeId,
                name: act.name,
                type: act.type,
                distance: act.distance / 1000,
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