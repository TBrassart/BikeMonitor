import { supabase } from './api';

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_STRAVA_REDIRECT_URI || window.location.origin + '/strava-callback';

export const stravaService = {
    // --- AUTHENTIFICATION ---

    async initiateAuth() {
        if (!STRAVA_CLIENT_ID) {
            console.error("Client ID Strava manquant dans .env");
            return;
        }
        // Scopes : read (profil), activity:read_all (activités)
        const scope = 'read,activity:read_all';
        const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&approval_prompt=force&scope=${scope}`;
        window.location.href = authUrl;
    },

    async handleCallback(code) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Utilisateur non connecté");

        // Échange du code
        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code'
            })
        });

        const data = await response.json();
        if (data.errors) throw new Error(JSON.stringify(data.errors));

        // Sauvegarde dans profile_integrations
        const { error } = await supabase
            .from('profile_integrations')
            .upsert({
                profile_id: user.id, // Adaptation : profile_id est maintenant l'user_id
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

    // --- SYNCHRONISATION DES ACTIVITÉS ---

    async syncActivities() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { added: 0, updated: 0 };

        console.log("🔄 Début de la synchro Strava pour l'utilisateur...");

        // On récupère l'intégration Strava de l'utilisateur
        const { data: integration, error: intError } = await supabase
            .from('profile_integrations')
            .select('*')
            .eq('profile_id', user.id)
            .eq('provider', 'strava')
            .single();

        if (intError || !integration) {
            console.log("Pas d'intégration Strava trouvée.");
            return { added: 0, updated: 0 };
        }

        let addedCount = 0;
        let updatedCount = 0;

        try {
            // 1. Refresh du token si besoin
            const token = await this.refreshAccessTokenIfNeeded(integration);

            // 2. Récupérer la dernière activité sync
            const { data: lastActivity } = await supabase
                .from('activities')
                .select('start_date')
                .eq('profile_id', user.id)
                .order('start_date', { ascending: false })
                .limit(1)
                .single();

            const after = lastActivity ? new Date(lastActivity.start_date).getTime() / 1000 : 0;
            
            // 3. Appel API Strava
            const activities = await this.fetchStravaActivities(token, after);
            console.log(`📥 ${activities.length} activités récupérées de Strava.`);

            // 4. Traitement des activités
            for (const act of activities) {
                // Trouver le vélo correspondant via gear_id
                const { data: bike } = await supabase
                    .from('bikes')
                    .select('id, total_km')
                    .eq('strava_gear_id', act.gear_id)
                    .single();

                const bikeId = bike ? bike.id : null;

                // Insérer l'activité
                const { error: insertError } = await supabase
                    .from('activities')
                    .upsert({
                        id: act.id.toString(),
                        profile_id: user.id,
                        bike_id: bikeId,
                        name: act.name,
                        type: act.type,
                        distance: act.distance / 1000, // mètres -> km
                        moving_time: act.moving_time, // secondes
                        total_elevation_gain: act.total_elevation_gain,
                        start_date: act.start_date,
                        map_polyline: act.map?.summary_polyline,
                        external_data: act
                    }, { onConflict: 'id' });

                if (!insertError) {
                    addedCount++;
                    // 5. Mise à jour du vélo et usure
                    if (bikeId) {
                        // Incrémenter km vélo (si pas déjà compté, logique simplifiée ici)
                        // Note: Pour faire propre, Strava donne le km total du vélo, on pourrait juste sync ça
                        // Mais ici on utilise ta logique de calcul d'usure basée sur les activités
                        await this.calculateWear(bikeId, act.distance / 1000);
                        updatedCount++;
                    }
                }
            }

        } catch (e) {
            console.error("Erreur durant la synchro:", e);
        }

        return { added: addedCount, updated: updatedCount };
    },

    // --- UTILITAIRES ---

    async refreshAccessTokenIfNeeded(integration) {
        const now = Math.floor(Date.now() / 1000);
        
        // Si expire dans moins de 5 min
        if (integration.expires_at && integration.expires_at < now + 300) {
            console.log("Token expiré, rafraîchissement...");
            const response = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: STRAVA_CLIENT_ID,
                    client_secret: STRAVA_CLIENT_SECRET,
                    grant_type: 'refresh_token',
                    refresh_token: integration.refresh_token
                })
            });

            const data = await response.json();
            if (data.errors) throw new Error("Impossible de rafraîchir le token");

            // Sauvegarde du nouveau token
            await supabase
                .from('profile_integrations')
                .update({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expires_at: data.expires_at
                })
                .eq('id', integration.id);

            return data.access_token;
        }
        return integration.access_token;
    },

    async fetchStravaActivities(token, afterTimestamp) {
        let page = 1;
        let allActivities = [];
        let keepFetching = true;

        while (keepFetching) {
            const url = `https://www.strava.com/api/v3/athlete/activities?after=${afterTimestamp}&page=${page}&per_page=30`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) break;
            
            const data = await res.json();
            if (data.length === 0) {
                keepFetching = false;
            } else {
                allActivities = [...allActivities, ...data];
                page++;
            }
        }
        return allActivities;
    },

    // --- CALCUL D'USURE ---

    async calculateWear(bikeId, kmDelta) {
        // 1. Mettre à jour le total KM du vélo
        // On récupère le vélo
        const { data: bike } = await supabase.from('bikes').select('total_km').eq('id', bikeId).single();
        if (bike) {
            const newTotal = (bike.total_km || 0) + kmDelta;
            await supabase.from('bikes').update({ total_km: Math.round(newTotal) }).eq('id', bikeId);
        }

        // 2. Mettre à jour les pièces d'usure
        const { data: parts } = await supabase.from('parts').select('*').eq('bike_id', bikeId);
        
        if (parts && parts.length > 0) {
            for (const part of parts) {
                // On ajoute les KM à la pièce
                const newKmCurrent = (part.km_current || 0) + kmDelta;
                
                // Calcul du pourcentage d'usure
                let newWearPercentage = 0;
                if (part.life_target_km > 0) {
                    newWearPercentage = (newKmCurrent / part.life_target_km) * 100;
                }

                // Déterminer le statut
                let newStatus = 'ok';
                if (newWearPercentage >= 100) newStatus = 'critical'; // À remplacer
                else if (newWearPercentage >= 75) newStatus = 'warning'; // À surveiller

                await supabase.from('parts').update({
                    km_current: Math.round(newKmCurrent),
                    wear_percentage: Math.round(newWearPercentage),
                    status: newStatus
                }).eq('id', part.id);
            }
        }
    }
};