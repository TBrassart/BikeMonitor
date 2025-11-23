import { supabase } from './api';

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
const getRedirectUri = () => {
    return window.location.origin + '/strava-callback';
};

export const stravaService = {
    // --- AUTHENTIFICATION ---

    async initiateAuth() {
        if (!CLIENT_ID) {
            alert("Erreur Config : VITE_STRAVA_CLIENT_ID manquant.");
            return;
        }
        // Scopes nécessaires pour lire le profil et les activités
        const redirectUri = getRedirectUri();
        console.log("🚀 Redirection Strava vers :", redirectUri);
        const scope = 'read,activity:read_all';
        const authUrl = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;        window.location.href = authUrl;
    },

    async handleCallback(code) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Utilisateur non connecté");

        // Échange du code contre un token
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

        // Sauvegarde dans profile_integrations (liée à l'user_id)
        const { error } = await supabase
            .from('profile_integrations')
            .upsert({
                profile_id: user.id,
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

    async disconnect() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('profile_integrations')
            .delete()
            .eq('profile_id', user.id)
            .eq('provider', 'strava');
            
        if (error) throw error;
    },

    // --- SYNCHRONISATION & USURE (FONCTIONS RESTAURÉES) ---

    async syncActivities() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { added: 0 };

        console.log("🔄 Début de la synchro Strava...");

        // 1. Récupérer les tokens
        const { data: integration } = await supabase
            .from('profile_integrations')
            .select('*')
            .eq('profile_id', user.id)
            .eq('provider', 'strava')
            .single();

        if (!integration) {
            console.log("Pas de compte Strava relié.");
            return { added: 0 };
        }

        // 2. Refresh token si nécessaire
        const token = await this.refreshAccessTokenIfNeeded(integration);

        // 3. Trouver la date de dernière synchro pour ne pas tout re-télécharger
        const { data: lastActivity } = await supabase
            .from('activities')
            .select('start_date')
            .eq('profile_id', user.id)
            .order('start_date', { ascending: false })
            .limit(1)
            .single();

        const after = lastActivity ? new Date(lastActivity.start_date).getTime() / 1000 : 0;

        // 4. Récupérer les activités depuis Strava
        const activities = await this.fetchStravaActivities(token, after);
        console.log(`📥 ${activities.length} nouvelles activités trouvées.`);

        let addedCount = 0;

        // 5. Traitement
        for (const act of activities) {
            // On cherche si un vélo correspond au gear_id de Strava
            const { data: bike } = await supabase
                .from('bikes')
                .select('id, total_km')
                .eq('strava_gear_id', act.gear_id)
                .single();

            const bikeId = bike ? bike.id : null;

            // Insertion en base
            const { error } = await supabase
                .from('activities')
                .upsert({
                    id: act.id.toString(), // ID Strava comme clé primaire
                    profile_id: user.id,
                    bike_id: bikeId,
                    name: act.name,
                    type: act.type,
                    distance: act.distance / 1000, // Mètres -> Km
                    moving_time: act.moving_time,
                    total_elevation_gain: act.total_elevation_gain,
                    start_date: act.start_date,
                    map_polyline: act.map?.summary_polyline,
                    external_data: act
                }, { onConflict: 'id' });

            if (!error) {
                addedCount++;
                // Si un vélo est lié, on met à jour son usure
                if (bikeId) {
                    await this.calculateWear(bikeId, act.distance / 1000);
                }
            }
        }

        return { added: addedCount };
    },

    // Met à jour le kilométrage du vélo et l'usure des pièces
    async calculateWear(bikeId, kmDelta) {
        // 1. Vélo
        const { data: bike } = await supabase.from('bikes').select('total_km').eq('id', bikeId).single();
        if (bike) {
            const newTotal = (bike.total_km || 0) + kmDelta;
            await supabase.from('bikes').update({ total_km: Math.round(newTotal) }).eq('id', bikeId);
        }

        // 2. Pièces
        const { data: parts } = await supabase.from('parts').select('*').eq('bike_id', bikeId);
        if (parts) {
            for (const part of parts) {
                const newKm = (part.km_current || 0) + kmDelta;
                let wearPct = 0;
                if (part.life_target_km > 0) {
                    wearPct = (newKm / part.life_target_km) * 100;
                }
                
                // Mise à jour statut
                let status = 'ok';
                if (wearPct >= 100) status = 'critical';
                else if (wearPct >= 75) status = 'warning';

                await supabase.from('parts').update({
                    km_current: Math.round(newKm),
                    wear_percentage: Math.round(wearPct),
                    status: status
                }).eq('id', part.id);
            }
        }
    },

    // Helpers internes
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