import { supabase } from '../supabaseClient';

const networkDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// --- AUTHENTIFICATION ---
export const authService = {
    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data.user;
    },

    async signUp(email, password, fullName, redirectTo, inviteToken) { 
        const options = {
            data: { 
                full_name: fullName,
                // ON SAUVEGARDE LE TOKEN DANS LE COMPTE UTILISATEUR
                pending_invite_token: inviteToken || null 
            }
        };
        
        if (redirectTo) {
            options.emailRedirectTo = redirectTo;
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: options
        });
        return { data, error };
    },
    
    // Fonction pour nettoyer le token une fois utilisé (pour ne pas le relancer à chaque fois)
    async clearInviteToken() {
        await supabase.auth.updateUser({
            data: { pending_invite_token: null }
        });
    },

    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getSession() {
        const { data } = await supabase.auth.getSession();
        return data.session;
    },

    get isAuthenticated() {
        return !!localStorage.getItem('sb-' + import.meta.env.VITE_SUPABASE_ANON_KEY?.substr(0, 10) + '-auth-token'); 
    },
    
    // RÉCUPÉRER LES PROFILS (VRAIS)
    async getProfiles() {
        const { data, error } = await supabase
            .from('family_members')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        return data;
    },

    // CRÉER UN NOUVEAU PROFIL
    async createProfile(name, avatar) {
        const user = (await supabase.auth.getUser()).data.user;
        
        const { data, error } = await supabase
            .from('family_members')
            .insert([{
                user_id: user.id,
                name,
                avatar,
                role: 'user'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },
    
    // SUPPRIMER UN PROFIL
    async deleteProfile(id) {
        const { error } = await supabase
            .from('family_members')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
    },

    async createInvitation() {
        const user = (await supabase.auth.getUser()).data.user;
        // On génère un token aléatoire simple
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        const { data, error } = await supabase
            .from('family_invitations')
            .insert([{ 
                inviter_id: user.id,
                token: token 
            }])
            .select()
            .single();

        if (error) throw error;
        // On retourne l'URL complète à partager
        return `${window.location.origin}/join/${token}`;
    },

    // 2. Accepter une invitation (Quand l'invité clique)
    async acceptInvitation(token) {
        // A. Vérifier le token
        const { data: invite, error: inviteError } = await supabase
            .from('family_invitations')
            .select('*')
            .eq('token', token)
            .single(); // On enlève le check 'pending' strict pour être plus souple

        if (inviteError || !invite) throw new Error("Lien invalide ou expiré.");

        // B. Récupérer l'utilisateur actuel
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("Vous devez être connecté.");

        if (user.id === invite.inviter_id) throw new Error("Auto-invitation impossible.");

        // C. Créer le lien familial (CORRECTION 409 ICI)
        const { error: linkError } = await supabase
            .from('family_links')
            .insert([{ 
                owner_id: invite.inviter_id, 
                member_id: user.id           
            }]); // On retire le .select() pour simplifier

        // Si erreur, on regarde si c'est un doublon (code 23505)
        if (linkError) {
            // Si c'est "Unique Violation" (déjà membre), on considère que c'est un succès
            if (linkError.code === '23505') {
                console.log("Info : L'utilisateur est déjà membre de cette famille.");
                return true; 
            }
            // Sinon c'est une vraie erreur
            throw linkError;
        }

        return true;
    },

    // Récupérer tous les membres que le RLS autorise à voir
    async getFamilyMembers() {
        // La requête est simple, le filtre complexe est géré par la RLS Policy ci-dessus
        const { data: roster, error } = await supabase
            .from('family_members')
            .select('*')
            .order('name', { ascending: true }); // Trier par nom
        
        if (error) {
            console.error("Erreur de chargement du roster (Vérifiez la RLS sur family_members)", error);
            throw error;
        }
        
        return roster; 
    },

    // Supprimer un membre (le bannir de la famille)
    async removeFamilyMember(memberProfileId) {
        const user = (await supabase.auth.getUser()).data.user;
        const { error } = await supabase
            .from('family_links')
            .delete()
            .eq('owner_id', user.id)
            .eq('member_id', memberProfileId);
            
        if (error) throw error;
    }
};

// --- VÉLOS (BIKES) ---
export const bikeService = {
    // VÉLOS
    async getBikes() {
        // On récupère les vélos AVEC pièces et entretiens
        const { data, error } = await supabase
            .from('bikes')
            .select(`
                *,
                parts (*),
                maintenance (*)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;

        // CALCUL DES ALERTES (Post-traitement)
        const enrichedBikes = data.map(bike => {
            let alertCount = 0;
            let statusText = 'En pleine forme';

            // Vérifier les pièces d'usure
            if (bike.parts) {
                bike.parts.forEach(part => {
                    // Calcul simplifié de l'usure (reprend la logique de PartsTab)
                    const installKm = part.km_current || 0;
                    const currentKm = bike.total_km || 0;
                    const targetKm = part.life_target_km || 2000;
                    const ridden = Math.max(0, currentKm - installKm);
                    
                    // Si usure > 100%, c'est une alerte
                    if (targetKm > 0 && ridden >= targetKm) {
                        alertCount++;
                        statusText = `${part.name} à remplacer !`;
                    }
                });
            }

            // Vérifier les entretiens en retard
            if (bike.maintenance) {
                const today = new Date().toISOString().split('T')[0];
                bike.maintenance.forEach(m => {
                    if (m.status !== 'done' && m.date_due && m.date_due < today) {
                        alertCount++;
                        statusText = 'Entretien en retard';
                    }
                });
            }
            
            // On retourne le vélo enrichi
            return { 
                ...bike, 
                alerts: alertCount, // Nombre de pastilles rouges
                status: alertCount > 0 ? statusText : 'OK' // Texte résumé
            };
        });
        
        return enrichedBikes;
    },

    async createBike(bikeData) {
        const { name, type, owner, photoUrl } = bikeData;
        const user = (await supabase.auth.getUser()).data.user;

        const { data, error } = await supabase
            .from('bikes')
            .insert([{ 
                name, 
                type, 
                owner, 
                user_id: user.id ,
                brand, model_year, size, weight
            }])
            .select()
            .single();

        if (error) throw error;
        return { ...data, parts: [], maintenance: [] };
    },

    async updateBike(bikeId, updates) {
        const { data, error } = await supabase
            .from('bikes')
            .update(updates)
            .eq('id', bikeId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async deleteBike(bikeId) {
        // Supprime le vélo (la cascade SQL supprimera automatiquement les pièces/entretiens liés)
        const { error } = await supabase
            .from('bikes')
            .delete()
            .eq('id', bikeId);
            
        if (error) throw error;
    },

    async uploadBikePhoto(bikeId, file) {
        // 1. Nettoyage du nom de fichier (On garde que chiffres, lettres et point)
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        
        // 2. Création du chemin unique
        const fileName = `${bikeId}/${Date.now()}_${sanitizedFileName}`;
        
        const { data, error } = await supabase.storage
            .from('bike_photos')
            .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from('bike_photos')
            .getPublicUrl(fileName);
            
        return urlData.publicUrl;
    },

    async refreshBikeStats(bikeId) {
        const { data: activities, error } = await supabase
            .from('activities')
            .select('total_elevation_gain, moving_time')
            .eq('bike_id', bikeId);

        if (error) return;

        let totalElev = 0;
        let totalSeconds = 0;

        activities.forEach(act => {
            totalElev += (act.total_elevation_gain || 0);
            totalSeconds += (act.moving_time || 0);
        });

        const totalHours = Math.round(totalSeconds / 3600);

        // On met à jour la fiche vélo
        await this.updateBike(bikeId, {
            total_elevation: Math.round(totalElev),
            total_hours: totalHours
        });

        return { total_elevation: Math.round(totalElev), total_hours: totalHours };
    },

    // Calcul des KM du vélo à une date précise (basé sur l'historique Strava/Activités)
    async getBikeKmAtDate(bikeId, dateIsoString) {
        // On récupère la distance de toutes les activités AVANT la date donnée
        const { data, error } = await supabase
            .from('activities')
            .select('distance')
            .eq('bike_id', bikeId)
            .lt('start_date', dateIsoString); // lt = less than (strictement avant)

        if (error) {
            console.error("Erreur calcul km historique", error);
            return 0;
        }

        // Somme des distances (Strava donne des mètres)
        const totalMeters = data.reduce((sum, activity) => sum + (activity.distance || 0), 0);
        
        // Conversion en KM arrondis
        return Math.round(totalMeters / 1000);
    },

    //  HISTORIQUE
    async getBikeHistory(bikeId) {
        const { data, error } = await supabase
            .from('history')
            .select('*')
            .eq('bike_id', bikeId)
            .order('date', { ascending: false });
        
        if (error) throw error;
        return data;
    },

    async addHistoryEvent(eventData) {
        const { bikeId, type, title, description, km, date } = eventData;
        
        const { data, error } = await supabase
            .from('history')
            .insert([{
                bike_id: bikeId,
                type,
                title,
                description,
                km: km || null,
                date: date
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ENTRETIEN (MAINTENANCE)
    async getMaintenancesByBike(bikeId) {
        const { data, error } = await supabase
            .from('maintenance')
            .select('*')
            .eq('bike_id', bikeId)
            .order('date_due', { ascending: true });
        
        if (error) throw error;
        return data;
    },

    async addMaintenance(bikeId, maintenanceData) {
        const { type, datePrévue, kmPrévu, notes } = maintenanceData;
        
        const { data, error } = await supabase
            .from('maintenance')
            .insert([{
                bike_id: bikeId,
                type,
                date_due: datePrévue || null,
                km_due: kmPrévu || null,
                notes,
                status: 'upcoming'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async completeMaintenance(bikeId, maintenanceId, dateDone) {
        const { data: maintenance, error } = await supabase
            .from('maintenance')
            .update({ 
                status: 'done', 
                date_done: dateDone || new Date().toISOString() 
            })
            .eq('id', maintenanceId)
            .select()
            .single();

        if (error) throw error;
        return maintenance;
    },

    // PIÈCES (PARTS)
    async getComponentsByBike(bikeId) {
        const { data, error } = await supabase
            .from('parts')
            .select('*')
            .eq('bike_id', bikeId);
        
        if (error) throw error;
        return data;
    },

    async addNutritionItem(item) {
        const user = (await supabase.auth.getUser()).data.user;
        
        // On déstructure pour être sûr d'envoyer les bonnes colonnes
        // (Assure-toi que ton formulaire envoie bien ces clés)
        const { name, brand, type, quantity, min_quantity, expiration_date, carbs, proteins, fat, price } = item;

        const { data, error } = await supabase
            .from('nutrition')
            .insert([{ 
                user_id: user.id,
                name, brand, type, 
                quantity, min_quantity, expiration_date,
                // Nouveaux champs :
                carbs: carbs || 0,
                proteins: proteins || 0,
                fat: fat || 0,
                price: price || 0
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async installComponent(bikeId, componentData) {
        const { name, category, installationDate, kmInstallation, lifeTargetKm, price } = componentData; // Ajout 'price'

        const { data, error } = await supabase
            .from('parts')
            .insert([{
                bike_id: bikeId,
                name,
                category,
                installation_date: installationDate,
                km_current: kmInstallation || 0,
                life_target_km: lifeTargetKm,
                status: 'ok',
                // Nouveau champ :
                price: price || 0 
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deleteComponent: async (partId) => {
        const { error } = await supabase
            .from('parts')
            .delete()
            .eq('id', partId);
        if (error) throw error;
    },

    // BIBLIOTHÈQUE (CATALOGUE)
    async getLibrary() {
        const { data, error } = await supabase
            .from('component_library')
            .select('*')
            .order('category', { ascending: true });
        
        if (error) throw error;
        return data;
    },

    async addToLibrary(item) {
        const { data, error } = await supabase
            .from('component_library')
            .insert([item])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateLibraryItem(id, updates) {
        const { data, error } = await supabase
            .from('component_library')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    },

    // --- DASHBOARD ---
    async getDashboardData(profileId, period = 'month', isRolling = false) {
        const now = new Date();
        let startDate = new Date();

        // LOGIQUE DE CALCUL DE DATE
        if (isRolling) {
            // MODE GLISSANT (Depuis X jours en arrière jusqu'à maintenant)
            switch (period) {
                case 'week': startDate.setDate(now.getDate() - 7); break;
                case 'month': startDate.setDate(now.getDate() - 30); break;
                case 'year': startDate.setDate(now.getDate() - 365); break;
                default: startDate.setDate(now.getDate() - 30);
            }
        } else {
            // MODE CALENDAIRE (Depuis le début de la période)
            switch (period) {
                case 'week': 
                    // Lundi de la semaine en cours
                    const day = now.getDay() || 7; 
                    if (day !== 1) startDate.setHours(-24 * (day - 1));
                    else startDate = now;
                    startDate.setHours(0, 0, 0, 0);
                    break;
                
                case 'month': 
                    // 1er du mois
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                
                case 'year': 
                    // 1er Janvier
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
            }
        }
        
        // 2. Récupération des activités (Code inchangé)
        const { data: activities } = await supabase
            .from('activities')
            .select('distance, moving_time, start_date')
            .eq('profile_id', profileId)
            .gte('start_date', startDate.toISOString());

        const kmTotal = Math.round(activities?.reduce((sum, act) => sum + (act.distance || 0), 0) / 1000) || 0;
        const hoursTotal = Math.round(activities?.reduce((sum, act) => sum + (act.moving_time || 0), 0) / 3600) || 0;

        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        
        const { data: maintenanceTasks } = await supabase
            .from('maintenance')
            .select(`*, bikes ( name )`)
            .neq('status', 'done')
            .lte('date_due', nextWeek.toISOString()) 
            .order('date_due', { ascending: true });

        const { data: parts } = await supabase
            .from('parts')
            .select(`*, bikes ( id, name, total_km )`)
            .eq('status', 'ok');

        const wornParts = (parts || []).filter(part => {
            if (!part.bikes) return false;
            const currentKm = part.bikes.total_km || 0;
            const installKm = part.km_current || 0;
            const targetKm = part.life_target_km || 2000;
            const ridden = Math.max(0, currentKm - installKm);
            return targetKm > 0 && ridden >= targetKm;
        }).map(part => ({
            id: `part-${part.id}`,
            type: `Remplacer : ${part.name}`,
            date_due: new Date().toISOString(),
            bikes: part.bikes,
            isPart: true
        }));

        const allAlerts = [...(maintenanceTasks || []), ...wornParts];

        const { data: allNutrition } = await supabase.from('nutrition').select('*');
        const lowStock = (allNutrition || []).filter(item => item.quantity <= item.min_quantity).slice(0, 3);

        return {
            stats: { km: kmTotal, hours: hoursTotal, count: activities?.length || 0 }, // Renommé pour être générique
            maintenance: allAlerts,
            lowStock: lowStock
        };
    },

    // Mettre à jour les détails du profil (Poids, FTP...)
    async updateProfileDetails(profileId, updates) {
        const { data, error } = await supabase
            .from('family_members')
            .update(updates)
            .eq('id', profileId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- CONSOMMER UN KIT (Mise à jour stock) ---
    async consumeKitItems(items) {
        // items = [{ id: 'uuid', category: 'nutrition', quantity: 2 }, ...]
        
        // On ne s'intéresse qu'à la nutrition pour le déstockage
        const nutritionItems = items.filter(i => i.category === 'nutrition' || i.category === 'solid' || i.category === 'liquid');

        if (nutritionItems.length === 0) return 0;

        // Pour chaque item, on décrémente le stock
        // Note: L'idéal serait une transaction SQL (RPC), mais on peut faire une boucle simple pour commencer
        for (const item of nutritionItems) {
            // 1. Récupérer le stock actuel
            const { data: current } = await supabase
                .from('nutrition')
                .select('quantity')
                .eq('id', item.id)
                .single();
            
            if (current) {
                const newQty = Math.max(0, current.quantity - (item.quantity || 1));
                
                // 2. Mettre à jour
                await supabase
                    .from('nutrition')
                    .update({ quantity: newQty })
                    .eq('id', item.id);
            }
        }
        
        return nutritionItems.length; // Renvoie le nombre d'items traités
    },

    // Calculer l'état de forme ACTUEL (indépendant du filtre d'affichage)
    async getCurrentFitness(profileId) {
        // On a besoin de 60 jours d'historique pour un calcul CTL fiable
        const historyStart = new Date();
        historyStart.setDate(historyStart.getDate() - 60);

        const { data: activities } = await supabase
            .from('activities')
            .select('moving_time, start_date, external_data')
            .eq('profile_id', profileId)
            .gte('start_date', historyStart.toISOString())
            .order('start_date', { ascending: true });

        if (!activities || activities.length === 0) return null;

        // Calcul CTL/ATL/TSB (Même logique que getChartsData mais simplifié)
        const kCTL = Math.exp(-1 / 42);
        const kATL = Math.exp(-1 / 7);
        let ctl = 0;
        let atl = 0;

        // On map jour par jour
        const dailyLoadMap = new Map();
        activities.forEach(act => {
            const dateStr = new Date(act.start_date).toLocaleDateString('en-CA');
            const load = Number(act.external_data?.suffer_score) || ((Number(act.moving_time) || 0) / 3600 * 50);
            dailyLoadMap.set(dateStr, (dailyLoadMap.get(dateStr) || 0) + load);
        });

        const loopDate = new Date(historyStart);
        const today = new Date();
        
        while (loopDate <= today) {
            const dateStr = loopDate.toLocaleDateString('en-CA');
            const dayLoad = dailyLoadMap.get(dateStr) || 0;
            ctl = dayLoad * (1 - kCTL) + ctl * kCTL;
            atl = dayLoad * (1 - kATL) + atl * kATL;
            loopDate.setDate(loopDate.getDate() + 1);
        }

        const tsb = ctl - atl;
        return { ctl, atl, tsb }; // On renvoie les valeurs d'aujourd'hui
    },

    // --- DONNÉES GRAPHIQUES ---
    async getChartsData(profileId, period = 'year', isRolling = false) {
        // 1. Calcul date (inchangé)
        const now = new Date();
        let startDate = new Date();
        let unit = 'month';

        if (isRolling) {
            switch (period) {
                case 'week': startDate.setDate(now.getDate() - 7); unit = 'day'; break;
                case 'month': startDate.setDate(now.getDate() - 30); unit = 'day'; break;
                case 'year': startDate.setDate(now.getDate() - 365); unit = 'month'; break;
                default: startDate.setDate(now.getDate() - 365); unit = 'month';
            }
        } else {
            switch (period) {
                case 'week': 
                    const day = now.getDay() || 7;
                    if (day !== 1) startDate.setHours(-24 * (day - 1));
                    else startDate = now;
                    startDate.setHours(0, 0, 0, 0);
                    unit = 'day';
                    break;
                case 'month': 
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    unit = 'day';
                    break;
                case 'year': 
                    startDate = new Date(now.getFullYear(), 0, 1);
                    unit = 'month';
                    break;
            }
        }

        // 2. RÉCUPÉRATION (CORRIGÉE : Ajout de moving_time et external_data)
        const { data: activities } = await supabase
            .from('activities')
            .select('distance, start_date, bike_id, moving_time, external_data, bikes(name)') // <--- ICI
            .eq('profile_id', profileId)
            .gte('start_date', startDate.toISOString())
            .order('start_date', { ascending: true });

        if (!activities) return { chartData: [], pieData: [], bikeNames: [], fitnessData: [] };

        // 3. BarChart & PieChart (Code inchangé)
        const groupedData = new Map();
        const bikeSet = new Set();
        const pieMap = new Map();

        activities.forEach(act => {
            const d = new Date(act.start_date);
            let key, label;

            if (unit === 'month') {
                key = `${d.getFullYear()}-${d.getMonth()}`;
                label = d.toLocaleDateString('fr-FR', { month: 'short' });
            } else {
                key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
            }

            if (!groupedData.has(key)) {
                groupedData.set(key, { name: label, sortTime: d.getTime() });
            }
            
            const entry = groupedData.get(key);
            const bikeName = act.bikes?.name || "Non assigné";
            bikeSet.add(bikeName);

            const dist = (act.distance || 0) / 1000;
            entry[bikeName] = (entry[bikeName] || 0) + dist;
            pieMap.set(bikeName, (pieMap.get(bikeName) || 0) + dist);
        });

        const chartData = Array.from(groupedData.values())
            .sort((a, b) => a.sortTime - b.sortTime)
            .map(item => {
                const cleanItem = { name: item.name };
                bikeSet.forEach(bike => {
                    if (item[bike]) cleanItem[bike] = Math.round(item[bike]);
                });
                return cleanItem;
            });

        const pieData = Array.from(pieMap.entries())
            .map(([name, value]) => ({ name, value: Math.round(value) }))
            .filter(i => i.value > 0);

        // 4. FITNESS
        const dailyLoadMap = new Map();
        
        activities.forEach(act => {
            const dateStr = new Date(act.start_date).toLocaleDateString('en-CA'); // Format YYYY-MM-DD
            const load = Number(act.external_data?.suffer_score) || ((Number(act.moving_time) || 0) / 3600 * 50);
            const current = dailyLoadMap.get(dateStr) || 0;
            dailyLoadMap.set(dateStr, current + load);
        });

        // Constantes de temps (Modèle Coggan classique)
        const kCTL = Math.exp(-1 / 42); // 42 jours
        const kATL = Math.exp(-1 / 7);  // 7 jours

        let ctl = 0; // Fitness initial (idéalement on charge l'historique plus loin)
        let atl = 0; // Fatigue initiale
        let fitnessData = [];

        // On génère une chronologie jour par jour du début à la fin de la période
        const loopDate = new Date(startDate);
        const today = new Date();

        while (loopDate <= today) {
            const dateStr = loopDate.toLocaleDateString('en-CA');
            const dayLoad = dailyLoadMap.get(dateStr) || 0;

            // Formule EWMA (Exponential Weighted Moving Average)
            // Today = Load * (1-k) + Yesterday * k
            ctl = dayLoad * (1 - kCTL) + ctl * kCTL;
            atl = dayLoad * (1 - kATL) + atl * kATL;
            const tsb = ctl - atl;

            // On formate pour le graphique (on arrondit pour faire propre)
            fitnessData.push({
                date: loopDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                fullDate: dateStr,
                ctl: Math.round(ctl), // Forme (Bleu)
                atl: Math.round(atl), // Fatigue (Rose)
                tsb: Math.round(tsb)  // Fraîcheur (Jaune/Gris)
            });

            // Jour suivant
            loopDate.setDate(loopDate.getDate() + 1);
        }
        
        // Pour l'affichage, si la période est longue, on échantillonne pour ne pas surcharger le DOM
        if (fitnessData.length > 100) {
             // On garde 1 point tous les X jours
             const step = Math.ceil(fitnessData.length / 100);
             fitnessData = fitnessData.filter((_, i) => i % step === 0);
        }

        // 5. Budget & Nutrition (Raccourci pour éviter les erreurs si tables vides)
        // ... Tu peux remettre ton code de budget ici, ou laisser vide pour l'instant
        const { data: parts } = await supabase.from('parts').select('price').eq('status', 'ok');
        const budgetTotal = parts?.reduce((sum, p) => sum + (p.price || 0), 0) || 0;

        const { data: nutrition } = await supabase.from('nutrition').select('*');
        let macros = { carbs: 0, proteins: 0, fat: 0 };
        nutrition?.forEach(item => {
            const qty = item.quantity || 0;
            macros.carbs += (item.carbs || 0) * qty;
            macros.proteins += (item.proteins || 0) * qty;
            macros.fat += (item.fat || 0) * qty;
        });
        
        const macroData = [
            { name: 'Glucides', value: Math.round(macros.carbs), color: '#3498db' },
            { name: 'Protéines', value: Math.round(macros.proteins), color: '#e74c3c' },
            { name: 'Lipides', value: Math.round(macros.fat), color: '#f1c40f' }
        ];

        return { 
            chartData, 
            pieData, 
            bikeNames: Array.from(bikeSet),
            fitnessData,
            budget: { total: budgetTotal },
            macros: macroData
        };
    },

    // MOCKS (Nutrition/Equipement)
    async getNutrition() { return []; },
    async getEquipment() { return []; },
    async getKits() { return []; }
};