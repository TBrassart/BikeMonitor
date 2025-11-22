import { supabase } from '../supabaseClient';

// CONFIGURATION
const CLIENT_ID = '178503'; 
const CLIENT_SECRET = 'd303be516b179e3f5cb9ed1b32bf7c6e44da1fcf'; 
const REDIRECT_URI = window.location.origin + '/settings/';

export const stravaService = {
    
    initiateAuth() {
        const scope = 'read,activity:read_all,profile:read_all';
        window.location.href = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&approval_prompt=force&scope=${scope}`;
    },

    async handleAuthCallback(code, profileId) {
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

        if (data.errors || data.message === 'Bad Request') {
            throw new Error(data.message || "Identifiants invalides ou Code expiré");
        }

        const { error } = await supabase
            .from('profile_integrations')
            .upsert({
                profile_id: profileId,
                provider: 'strava',
                athlete_id: data.athlete.id,
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: data.expires_at,
                updated_at: new Date()
            }, { onConflict: 'profile_id, provider' });

        if (error) throw error;
        return data.athlete;
    },

    async getIntegrationStatus(profileId) {
        const { data } = await supabase
            .from('profile_integrations')
            .select('*')
            .eq('profile_id', profileId)
            .eq('provider', 'strava')
            .maybeSingle();
        return !!data;
    },

    // --- IMPORT DES VÉLOS ---
    async importUserBikes(profileId) {
        console.log("🚀 Démarrage importUserBikes...");

        // 1. Récupérer l'intégration
        const { data: integration } = await supabase
            .from('profile_integrations')
            .select('*')
            .eq('profile_id', profileId)
            .eq('provider', 'strava')
            .maybeSingle();
            
        if (!integration) {
            console.log("ℹ️ Pas de compte Strava connecté. Arrêt.");
            return;
        }

        // 2. Appel Strava
        const response = await fetch('https://www.strava.com/api/v3/athlete', {
            headers: { Authorization: `Bearer ${integration.access_token}` }
        });
        
        if (!response.ok) return;

        const athlete = await response.json();
        const stravaBikes = athlete.bikes || [];

        if (stravaBikes.length === 0) {
            console.log("⚠️ Aucun vélo trouvé sur Strava.");
            return;
        }

        // 3. Récupérer l'utilisateur connecté
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // --- CORRECTION : DÉFINITION DE LA VARIABLE PROFILE ---
        const { data: profile } = await supabase
            .from('family_members')
            .select('name')
            .eq('id', profileId)
            .maybeSingle();
            
        const ownerName = profile ? profile.name : "Profil importé";
        // -----------------------------------------------------

        // 4. Boucle sur les vélos
        for (const bike of stravaBikes) {
            const kmStrava = Math.round(bike.distance / 1000);
            
            const { data: existing } = await supabase
                .from('bikes')
                .select('id, total_km')
                .eq('strava_gear_id', bike.id)
                .maybeSingle(); 

            if (!existing) {
                console.log(`➕ Création vélo : ${bike.name}`);
                await supabase.from('bikes').insert([{
                    user_id: user.id,
                    owner: ownerName, // On utilise la variable définie plus haut
                    name: bike.name,
                    type: 'Route',
                    strava_gear_id: bike.id,
                    total_km: kmStrava
                }]);
            } else {
                if (existing.total_km !== kmStrava) {
                    console.log(`🔄 Mise à jour KM pour ${bike.name}`);
                    await supabase
                        .from('bikes')
                        .update({ total_km: kmStrava })
                        .eq('id', existing.id);
                }
            }
        }
    },

    // --- SYNCHRO ACTIVITÉS ---
    async syncActivities(profileId) {
        // On importe d'abord les vélos pour être sûr qu'ils existent
        await this.importUserBikes(profileId);
        
        const { data: integration } = await supabase
            .from('profile_integrations')
            .select('*')
            .eq('profile_id', profileId)
            .eq('provider', 'strava')
            .maybeSingle();

        if (!integration) return { added: 0, totalFetched: 0 };

        let accessToken = integration.access_token;
        const now = Math.floor(Date.now() / 1000);
        
        // Refresh Token
        if (integration.expires_at < now) {
            const refreshRes = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: integration.refresh_token })
            });
            const refreshData = await refreshRes.json();
            await supabase.from('profile_integrations').update({
                access_token: refreshData.access_token, refresh_token: refreshData.refresh_token, expires_at: refreshData.expires_at
            }).eq('id', integration.id);
            accessToken = refreshData.access_token;
        }

        // Map des vélos connus
        const { data: knownBikes } = await supabase
            .from('bikes')
            .select('id, strava_gear_id')
            .not('strava_gear_id', 'is', null);
            
        const bikeMap = {};
        if (knownBikes) {
            knownBikes.forEach(b => { bikeMap[b.strava_gear_id] = b.id; });
        }

        // Date dernière activité
        const { data: lastActivity } = await supabase
            .from('activities')
            .select('start_date')
            .eq('profile_id', profileId)
            .order('start_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        const afterTimestamp = lastActivity ? Math.floor(new Date(lastActivity.start_date).getTime() / 1000) : 946684800; 

        let page = 1;
        let allActivities = [];
        let keepFetching = true;

        while (keepFetching) {
            const url = `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}&after=${afterTimestamp}`;
            const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
            
            if (response.status === 429) { console.warn("⛔ Rate Limit Strava atteint."); keepFetching = false; break; }
            if (!response.ok) throw new Error(`Erreur API Strava: ${response.status}`);
            
            const activitiesPage = await response.json();

            if (activitiesPage.length === 0) {
                keepFetching = false;
            } else {
                allActivities = [...allActivities, ...activitiesPage];
                page++;
            }
            if (page > 50) keepFetching = false;
        }

        // Sauvegarde
        let addedCount = 0;
        for (const act of allActivities) {
            const matchedBikeId = act.gear_id && bikeMap[act.gear_id] ? bikeMap[act.gear_id] : null;
            
            const { error } = await supabase.from('activities').upsert({
                id: String(act.id),
                profile_id: profileId,
                name: act.name,
                type: act.type,
                distance: act.distance,
                moving_time: act.moving_time,
                start_date: act.start_date,
                total_elevation_gain: act.total_elevation_gain,
                map_polyline: act.map?.summary_polyline || null,
                external_data: act,
                bike_id: matchedBikeId
            }, { onConflict: 'id' });

            if (!error) addedCount++;
        }

        return { added: addedCount, totalFetched: allActivities.length };
    }
};