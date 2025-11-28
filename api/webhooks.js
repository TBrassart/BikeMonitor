import { createClient } from '@supabase/supabase-js';

// On ne peut pas utiliser import.meta.env ici (Node.js), on utilise process.env
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY // Ou SERVICE_ROLE_KEY si besoin de droits élevés
);

export default async function handler(req, res) {
    // 1. VERIFICATION (Handshake Strava)
    // Strava envoie une requête GET pour vérifier que l'URL existe
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === 'STRAVA_VERIFY_TOKEN') { // Mettez un token secret ici
            console.log('WEBHOOK_VERIFIED');
            return res.status(200).json({ "hub.challenge": challenge });
        }
        return res.status(403).send('Forbidden');
    }

    // 2. RECEPTION D'EVENEMENT (POST)
    if (req.method === 'POST') {
        const event = req.body;
        console.log("🔔 Event Strava reçu:", event);

        // On ne traite que les créations d'activités
        if (event.object_type === 'activity' && event.aspect_type === 'create') {
            try {
                // A. Trouver l'utilisateur propriétaire de ce compte Strava
                const { data: integration } = await supabase
                    .from('profile_integrations')
                    .select('*, profiles(user_id)')
                    .eq('athlete_id', event.owner_id.toString())
                    .single();

                if (!integration) return res.status(200).send('User not found');

                // B. Récupérer le Token à jour (Refresh si besoin)
                // (Code simplifié ici, idéalement réutiliser la logique de stravaService)
                let accessToken = integration.access_token;
                if (integration.expires_at < Date.now() / 1000) {
                    const refresh = await fetch('https://www.strava.com/oauth/token', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            client_id: process.env.VITE_STRAVA_CLIENT_ID,
                            client_secret: process.env.VITE_STRAVA_CLIENT_SECRET,
                            grant_type: 'refresh_token',
                            refresh_token: integration.refresh_token
                        })
                    }).then(r => r.json());
                    accessToken = refresh.access_token;
                    // Update DB...
                }

                // C. Récupérer les détails de l'activité
                const actRes = await fetch(`https://www.strava.com/api/v3/activities/${event.object_id}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const act = await actRes.json();

                // D. Insérer dans la base (Comme dans stravaService)
                // Note: Pour simplifier, on insère juste l'activité. 
                // Le calcul d'usure se fera à la prochaine ouverture de l'app ou via un trigger SQL.
                 await supabase.from('activities').upsert({
                    id: act.id.toString(),
                    profile_id: integration.profile_id,
                    name: act.name,
                    type: act.type,
                    distance: act.distance / 1000,
                    moving_time: act.moving_time,
                    total_elevation_gain: act.total_elevation_gain,
                    start_date: act.start_date,
                    map_polyline: act.map?.summary_polyline,
                    external_data: { ...act, source: 'strava_webhook' } // On marque la source
                });

            } catch (e) {
                console.error("Erreur Webhook Processing", e);
            }
        }
        
        // Toujours répondre 200 OK à Strava sinon ils arrêtent d'envoyer
        return res.status(200).send('EVENT_RECEIVED');
    }
}