import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// 1. SERVICE D'AUTHENTIFICATION
// ==========================================
export const authService = {
    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    },
    async signInWithEmail(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },
    async signOut() {
        return await supabase.auth.signOut();
    },
    async getCurrentUser() {
        try {
            // 1. On récupère la réponse brute (SANS déstructuration immédiate qui ferait crasher)
            const response = await supabase.auth.getUser();
            
            // 2. Vérification de sécurité
            // Si data est null, ou si user est null, c'est que le compte n'existe plus ou que le token est invalide
            if (!response || !response.data || !response.data.user) {
                
                // 3. AUTO-NETTOYAGE
                // On force la déconnexion locale pour supprimer le vieux token corrompu
                await supabase.auth.signOut(); 
                
                // On renvoie null pour dire à l'app "Personne n'est connecté"
                // L'app affichera alors l'écran de connexion proprement
                return null;
            }
            
            // Tout va bien, on renvoie l'utilisateur
            return response.data.user;

        } catch (e) {
            console.warn("Session invalide détectée, nettoyage en cours...", e);
            // En cas de crash imprévu, on nettoie aussi
            await supabase.auth.signOut();
            return null;
        }
    },
    async getMyProfile() {
        const user = await this.getCurrentUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (data) return data;

        // Création si inexistant
        if (!data) {
            const newProfile = {
                user_id: user.id,
                name: user.email.split('@')[0],
                avatar: '🚲'
            };
            const { data: created, error: createError } = await supabase
                .from('profiles')
                .insert([newProfile])
                .select()
                .single();
            if (createError) throw createError;
            return created;
        }
        return null;
    },
    // Alias pour compatibilité
    async getProfiles() {
        const profile = await this.getMyProfile();
        return profile ? [profile] : [];
    },
    async createInitialProfile(user) {
        return await this.getMyProfile();
    },
    async updateProfile(updates) {
        const user = await this.getCurrentUser();
        const { data, error } = await supabase.from('profiles').update(updates).eq('user_id', user.id).select();
        if (error) throw error;
        return data?.[0];
    },
    // --- GESTION TURLAGS (AMÉLIORÉE) ---
    async getMyTurlags() {
        // On récupère les turlags où je suis membre
        // Note: La structure de retour dépend de votre RLS, ici on fait simple
        const { data: memberships, error } = await supabase
            .from('turlag_members')
            .select(`
                role,
                turlags ( id, name, description, icon_url, created_by )
            `)
            .eq('user_id', (await this.getCurrentUser()).id);
            
        if (error) throw error;
        
        // Aplatir la structure
        return memberships.map(m => ({
            ...m.turlags,
            my_role: m.role
        }));
    },

    async getTurlagDetails(turlagId) {
        // 1. Infos du groupe
        const { data: turlag, error: err1 } = await supabase
            .from('turlags')
            .select('*')
            .eq('id', turlagId)
            .single();
        if (err1) throw err1;

        // 2. Membres avec profils
        const { data: members, error: err2 } = await supabase
            .from('turlag_members')
            .select(`
                id, user_id, role, joined_at,
                profiles:user_id ( name, avatar )
            `)
            .eq('turlag_id', turlagId);
        if (err2) throw err2;

        // 3. Événements
        const { data: events, error: err3 } = await supabase
            .from('turlag_events')
            .select('*')
            .eq('turlag_id', turlagId)
            .order('event_date', { ascending: true });
        
        // Pas d'erreur fatale si pas d'events (table peut ne pas exister encore)
        
        return { turlag, members, events: events || [] };
    },

    // --- TURLAG EVENTS (Agrégé) ---
    async getMyTurlagEvents() {
        const user = await this.getCurrentUser();
        // On récupère d'abord les IDs des turlags dont je suis membre
        const { data: memberships } = await supabase
            .from('turlag_members')
            .select('turlag_id')
            .eq('user_id', user.id);
            
        if (!memberships || memberships.length === 0) return [];
        
        const turlagIds = memberships.map(m => m.turlag_id);

        // On récupère les événements futurs de ces turlags
        const { data: events, error } = await supabase
            .from('turlag_events')
            .select('*, turlags(name)') // On joint le nom du turlag pour l'affichage
            .in('turlag_id', turlagIds)
            .gte('event_date', new Date().toISOString()) // Seulement les futurs
            .order('event_date', { ascending: true })
            .limit(5); // On limite aux 5 prochains

        if (error) throw error;
        return events || [];
    },

    async createTurlag(name, desc) {
        const user = await this.getCurrentUser();
        const { data: t } = await supabase.from('turlags').insert([{name, description: desc, created_by: user.id}]).select().single();
        await supabase.from('turlag_members').insert([{turlag_id: t.id, user_id: user.id, role: 'admin'}]);
        return t;
    },

    async updateTurlag(id, updates) {
        const { error } = await supabase.from('turlags').update(updates).eq('id', id);
        if (error) throw error;
    },

    async joinTurlag(id) {
        const u = await this.getCurrentUser();
        await supabase.from('turlag_members').insert([{turlag_id: id, user_id: u.id, role: 'member'}]);
    },

    async leaveTurlag(turlagId) {
        const user = await this.getCurrentUser();
        
        // 1. On compte combien de membres il reste
        const { count, error: countError } = await supabase
            .from('turlag_members')
            .select('*', { count: 'exact', head: true })
            .eq('turlag_id', turlagId);

        if (countError) throw countError;

        // 2. Si je suis le dernier (ou le seul), je supprime le groupe
        if (count <= 1) {
            const { error: delError } = await supabase
                .from('turlags')
                .delete()
                .eq('id', turlagId);
            
            if (delError) throw delError;
        } else {
            // 3. Sinon, je quitte simplement le groupe
            const { error: leaveError } = await supabase
                .from('turlag_members')
                .delete()
                .eq('turlag_id', turlagId)
                .eq('user_id', user.id);

            if (leaveError) throw leaveError;
        }
    },

    async updateMemberRole(turlagId, userId, newRole) {
        const { error } = await supabase
            .from('turlag_members')
            .update({ role: newRole })
            .eq('turlag_id', turlagId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    async addTurlagEvent(eventData) {
        const user = await this.getCurrentUser();
        const { error } = await supabase
            .from('turlag_events')
            .insert([{ ...eventData, created_by: user.id }]);
        if (error) throw error;
    },
    
    async deleteTurlagEvent(id) {
        const { error } = await supabase.from('turlag_events').delete().eq('id', id);
        if (error) throw error;
    },

    updateMemberRole: (tid, uid, role) => api.updateMemberRole(tid, uid, role),
    kickMember: (tid, uid) => api.kickMember(tid, uid),

    // --- CHAT ---
    async getMessages(turlagId) {
        const { data, error } = await supabase
            .from('turlag_messages')
            .select('*, profiles:user_id(name, avatar)')
            .eq('turlag_id', turlagId)
            .order('created_at', { ascending: true })
            .limit(50);
        if (error) throw error;
        return data;
    },
    async sendMessage(turlagId, content) {
        const user = await this.getCurrentUser();
        const { error } = await supabase
            .from('turlag_messages')
            .insert([{ turlag_id: turlagId, user_id: user.id, content }]);
        if (error) throw error;
    },

    // --- SONDAGES ---
    async getPolls(turlagId) {
        // Récupère les sondages ET les votes associés
        const { data, error } = await supabase
            .from('turlag_polls')
            .select(`
                *, 
                votes:turlag_poll_votes(user_id, option_index),
                creator:created_by(name)
            `)
            .eq('turlag_id', turlagId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    async createPoll(turlagId, question, options) {
        const user = await this.getCurrentUser();
        const { error } = await supabase
            .from('turlag_polls')
            .insert([{ turlag_id: turlagId, created_by: user.id, question, options }]);
        if (error) throw error;
    },
    async votePoll(pollId, optionIndex) {
        const user = await this.getCurrentUser();
        // Upsert pour gérer le changement de vote
        const { error } = await supabase
            .from('turlag_poll_votes')
            .upsert([{ poll_id: pollId, user_id: user.id, option_index: optionIndex }]);
        if (error) throw error;
    },
    async closePoll(pollId) {
        const { error } = await supabase
            .from('turlag_polls')
            .update({ is_active: false })
            .eq('id', pollId);
        if (error) throw error;
    },

    // --- LEADERBOARD & ATELIER ---
    async getLeaderboard(turlagId) {
        const { data, error } = await supabase.rpc('get_turlag_leaderboard', { target_turlag_id: turlagId });
        if (error) throw error;
        return data;
    },
    
    // Récupérer le matos partagé par les membres du groupe
    async getSharedWorkshop(turlagId) {
        // 1. Récupérer les IDs des membres
        const { data: members } = await supabase.from('turlag_members').select('user_id').eq('turlag_id', turlagId);
        const memberIds = members.map(m => m.user_id);

        if (memberIds.length === 0) return [];

        // 2. Récupérer l'équipement partagé de ces membres
        // Note: equipment est lié à `profiles` via `profile_id`. Il faut faire la jointure.
        // On suppose ici que equipment a `profile_id`.
        // On récupère d'abord les profile_ids des users.
        const { data: profiles } = await supabase.from('profiles').select('id').in('user_id', memberIds);
        const profileIds = profiles.map(p => p.id);

        const { data, error } = await supabase
            .from('equipment')
            .select('*, profiles(name, avatar)')
            .in('profile_id', profileIds)
            .eq('is_shared', true);
            
        if (error) throw error;
        return data;
    },

    // 1. Demander le reset (Envoie un email)
    async resetPasswordForEmail(email) {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/update-password', // On créera cette route après
        });
        if (error) throw error;
        return data;
    },

    // 2. Mettre à jour le mot de passe (Une fois l'utilisateur revenu via le lien)
    async updateUserPassword(newPassword) {
        const { data, error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return data;
    },

    // Changer l'email
    async updateUserEmail(newEmail) {
        const { data, error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) throw error;
        return data;
    },

    // --- MFA (2FA) ---
    
    // 1. Vérifier le statut
    async getMfaAssuranceLevel() {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) throw error;
        return data; // { currentLevel, nextLevel }
    },

    // 2. Générer un QR Code (Enrôlement)
    async enrollMfa() {
        const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
        if (error) throw error;
        return data; 
    },

    // 3. Valider un défi (Connexion ou Activation)
    async challengeAndVerifyMfa(factorId, code) {
        // Créer le défi
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
        if (challengeError) throw challengeError;

        // Vérifier le code
        const { data, error } = await supabase.auth.mfa.verify({
            factorId,
            challengeId: challengeData.id,
            code
        });
        if (error) throw error;
        return data;
    },

    // 4. Désactiver (Supprimer)
    async unenrollMfa(factorId) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId });
        if (error) throw error;
    },

    // 5. Lister les facteurs
    async listMfaFactors() {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        return data.all;
    },
    
    // CONNEXION SOCIALE (OAuth)
    async signInWithProvider(provider) {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.origin, // Redirige vers le dashboard après succès
            }
        });
        if (error) throw error;
        return data;
    },
    // --- CHAT & SOCIAL (A AJOUTER DANS authService) ---
    async getMessages(turlagId) {
        const { data, error } = await supabase
            .from('turlag_messages')
            .select('*, profiles:user_id(name, avatar)')
            .eq('turlag_id', turlagId)
            .order('created_at', { ascending: true })
            .limit(50);
        if (error) throw error;
        return data;
    },
    async sendMessage(turlagId, content) {
        const user = await this.getCurrentUser();
        const { error } = await supabase
            .from('turlag_messages')
            .insert([{ turlag_id: turlagId, user_id: user.id, content }]);
        if (error) throw error;
    },

    // --- SONDAGES ---
    async getPolls(turlagId) {
        const { data, error } = await supabase
            .from('turlag_polls')
            .select(`*, votes:turlag_poll_votes(user_id, option_index), creator:created_by(name)`)
            .eq('turlag_id', turlagId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    async createPoll(turlagId, question, options) {
        const user = await this.getCurrentUser();
        const { error } = await supabase
            .from('turlag_polls')
            .insert([{ turlag_id: turlagId, created_by: user.id, question, options }]);
        if (error) throw error;
    },
    async votePoll(pollId, optionIndex) {
        const user = await this.getCurrentUser();
        const { error } = await supabase
            .from('turlag_poll_votes')
            .upsert([{ poll_id: pollId, user_id: user.id, option_index: optionIndex }]);
        if (error) throw error;
    },

    // --- LEADERBOARD & ATELIER ---
    async getLeaderboard(turlagId) {
        const { data, error } = await supabase.rpc('get_turlag_leaderboard', { target_turlag_id: turlagId });
        if (error) throw error;
        return data;
    },
    
    async getSharedWorkshop(turlagId) {
        // 1. Récupérer les membres
        const { data: members } = await supabase.from('turlag_members').select('user_id').eq('turlag_id', turlagId);
        const memberIds = members.map(m => m.user_id);
        if (memberIds.length === 0) return [];

        // 2. Récupérer les ID profils correspondants
        const { data: profiles } = await supabase.from('profiles').select('id').in('user_id', memberIds);
        const profileIds = profiles.map(p => p.id);

        // 3. Récupérer le matos partagé
        const { data, error } = await supabase
            .from('equipment')
            .select('*, profiles(name, avatar)')
            .in('profile_id', profileIds)
            .eq('is_shared', true);
            
        if (error) throw error;
        return data;
    },
    createInvite: (tid, opt) => api.createInvite(tid, opt),
    getInvites: (tid) => api.getInvites(tid),
    deleteInvite: (id) => api.deleteInvite(id),
    joinByCode: (code) => api.joinByInviteCode(code),
};

// ==========================================
// 2. API MÉTIER
// ==========================================
export const api = {
    // --- VÉLOS ---
    async getBikes() {
        const { data, error } = await supabase
            .from('bikes')
            .select(`
                *, 
                profiles:user_id ( name, avatar ),
                parts ( id, name, status ),
                frame_details:shop_items!frame_id(asset_data) 
            `)
            .order('created_at', { ascending: false });
            
        if(error) throw error; 
        return data || [];
    },
    async getBike(id) {
        const { data, error } = await supabase
            .from('bikes')
            .select(`*, profiles:user_id ( name, avatar )`)
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },
    async addBike(bikeData) {
        const user = await authService.getCurrentUser();
        const { data, error } = await supabase.from('bikes').insert([{ ...bikeData, user_id: user.id }]).select();
        if (error) throw error;
        return data;
    },
    async updateBike(id, updates) {
        const { data, error } = await supabase.from('bikes').update(updates).eq('id', id).select();
        if (error) throw error;
        return data;
    },
    async deleteBike(id) {
        const { error } = await supabase.from('bikes').delete().eq('id', id);
        if (error) throw error;
    },
    async uploadImage(file, bucket = 'bikes') {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error } = await supabase.storage.from(bucket).upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return data.publicUrl;
    },
    async equipBikeFrame(bikeId, frameItemId) {
        // Vérif: l'utilisateur possède-t-il cet item ?
        // (Optionnel si on fait confiance au front, mais mieux pour la sécu)
        
        const { error } = await supabase
            .from('bikes')
            .update({ frame_id: frameItemId })
            .eq('id', bikeId);
            
        if (error) throw error;
    },

    // --- CALCULS INTELLIGENTS ---
    async getBikeKmAtDate(bikeId, date) {
        const { data, error } = await supabase
            .from('activities')
            .select('distance') // Distance est en MÈTRES dans Strava/Activities
            .eq('bike_id', bikeId)
            .lte('start_date', date);

        if (error) return 0;
        
        // Somme des mètres
        const totalMeters = data.reduce((acc, act) => acc + (act.distance || 0), 0);
        
        // Conversion en KM
        return Math.round(totalMeters / 1000);
    },

    // --- STATS ---
    async getStats() {
        const bikes = await api.getBikes();
        const totalKm = bikes.reduce((acc, b) => acc + (b.total_km || 0), 0);
        const totalElevation = bikes.reduce((acc, b) => acc + (b.total_elevation || 0), 0);
        return { totalKm, totalElevation, bikesCount: bikes.length };
    },
    // --- MAINTENANCE ---
    async getMaintenance(bikeId) {
        const { data, error } = await supabase.from('maintenance').select('*').eq('bike_id', bikeId).order('date_due');
        if (error) throw error;
        return data || [];
    },
    async addMaintenance(item) {
        const { data, error } = await supabase.from('maintenance').insert([item]).select();
        if (error) throw error;
        return data;
    },
    async updateMaintenance(id, updates) {
        const { error } = await supabase.from('maintenance').update(updates).eq('id', id);
        if (error) throw error;
    },
    async deleteMaintenance(id) {
        const { error } = await supabase.from('maintenance').delete().eq('id', id);
        if (error) throw error;
    },
    // --- PIÈCES ---
    async getParts(bikeId) {
        const { data, error } = await supabase.from('parts').select('*').eq('bike_id', bikeId);
        if (error) throw error;
        return data || [];
    },
    async addPart(item) {
        const { data, error } = await supabase.from('parts').insert([item]).select();
        if (error) throw error;
        return data;
    },
    async updatePart(id, updates) {
        const { error } = await supabase.from('parts').update(updates).eq('id', id);
        if (error) throw error;
    },
    async deletePart(id) {
        const { error } = await supabase.from('parts').delete().eq('id', id);
        if (error) throw error;
    },
    // --- HISTORIQUE ---
    async getHistory(bikeId) {
        const { data, error } = await supabase.from('history').select('*').eq('bike_id', bikeId).order('date', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    async addHistory(item) {
        const { error } = await supabase.from('history').insert([item]);
        if (error) throw error;
    },
    async deleteHistory(id) {
        const { error } = await supabase.from('history').delete().eq('id', id);
        if (error) throw error;
    },
    // --- ACTIVITE --- 
    async getActivities() {
        // 1. On récupère l'utilisateur technique
        const user = await authService.getCurrentUser();
        if (!user) return [];

        // 2. On récupère son PROFIL (car c'est lui qui est lié aux activités)
        const profile = await authService.getMyProfile();
        
        if (!profile) {
            console.warn("Profil introuvable pour charger les activités.");
            return [];
        }

        // 3. On requête avec profile.id (qui correspond à ta colonne en base)
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('profile_id', profile.id) // <-- C'est la clé du fix
            .order('start_date', { ascending: false });

        if (error) {
            console.error("Erreur API Activités:", error);
            return [];
        }
        return data;
    },
    // ACTIVITÉS MANUELLES
    async addManualActivity(activityData) {
        const user = await authService.getCurrentUser();
        const profile = await authService.getMyProfile();

        const distanceInMeters = parseFloat(activityData.distance) * 1000;

        const { data, error } = await supabase.from('activities').insert([{
            // ID généré (pas de strava ID)
            profile_id: profile.id,
            bike_id: activityData.bike_id,
            name: activityData.name,
            type: 'Ride', // Par défaut vélo
            distance: distanceInMeters, // Déjà en km via le parser
            moving_time: activityData.moving_time,
            total_elevation_gain: activityData.elevation,
            start_date: activityData.start_date,
            map_polyline: activityData.polyline,
            external_data: { source: 'manual_gpx' } // Marqueur important
        }]).select().single();

        if (error) throw error;

        // Mise à jour usure vélo si lié
        if (activityData.bike_id) {
            // Note: calculateWear attend des Km pour l'update
            // (Assure-toi que calculateWear est accessible ou duplique la logique ici)
            // Ici on suppose qu'on appelle la fonction existante dans stravaService ou qu'on la déplace dans api
        }
        return data;
    },
    // --- NUTRITION v2 ---
    async getNutrition() {
        const { data, error } = await supabase
            .from('nutrition')
            .select('*, turlags ( id, name )') 
            .order('quantity', { ascending: true });
        if (error) throw error;
        return data || [];
    },
    async addNutrition(item) {
        const user = await authService.getCurrentUser();
        
        const cleanItem = {
            ...item,
            user_id: user.id,
            type: item.category_type || 'other', 
            
            // On s'assure que les chiffres ne sont pas null/NaN
            carbs: parseFloat(item.carbs) || 0,
            proteins: parseFloat(item.proteins) || 0,
            fat: parseFloat(item.fat) || 0,
            quantity: parseInt(item.quantity) || 0,
            min_quantity: parseInt(item.min_quantity) || 0
        };
        
        // On retire l'ID si c'est une création pour laisser Supabase le générer
        delete cleanItem.id; 
        
        const { data, error } = await supabase.from('nutrition').insert([cleanItem]).select();
        if (error) throw error;
        return data;
    },
    async updateNutrition(id, updates) {
        const cleanUpdates = { ...updates };
        
        if (cleanUpdates.category_type) {
            cleanUpdates.type = cleanUpdates.category_type;
        }
        delete cleanUpdates.id;

        const { error } = await supabase
            .from('nutrition')
            .update(cleanUpdates)
            .eq('id', id);
            
        if (error) throw error;
    },

    async deleteNutrition(id) {
        const { error } = await supabase.from('nutrition').delete().eq('id', id);
        if (error) throw error;
    },
    
    // NUTRITION AVANCÉE
    async getNutritionHistory(itemId) {
        const { data, error } = await supabase
            .from('nutrition_history')
            .select('*')
            .eq('nutrition_id', itemId)
            .order('purchase_date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async addNutritionStock(itemId, quantity, pricePaid) {
        // 1. Ajouter à l'historique
        const unitPrice = quantity > 0 ? pricePaid / quantity : 0;
        await supabase.from('nutrition_history').insert([{
            nutrition_id: itemId,
            quantity_added: quantity,
            price_paid: pricePaid,
            unit_price: unitPrice
        }]);

        // 2. Mettre à jour le stock actuel
        // On récupère d'abord la qté actuelle pour incrémenter
        const { data: item } = await supabase.from('nutrition').select('quantity').eq('id', itemId).single();
        const newQty = (item?.quantity || 0) + parseInt(quantity);
        
        await supabase.from('nutrition').update({ quantity: newQty }).eq('id', itemId);
    },
    // --- LIBRARY & KITS ---
    async getComponentLibrary() {
        const { data, error } = await supabase.from('component_library').select('*');
        if (error) throw error;
        return data || [];
    },
    async addToLibrary(item) {
        const { data, error } = await supabase.from('component_library').insert([item]).select();
        if (error) throw error;
        return data;
    },
async getKits() {
        const user = await authService.getCurrentUser();
        const { data, error } = await supabase
            .from('kits')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async addKit(kitData) {
        const user = await authService.getCurrentUser();
        const { data, error } = await supabase
            .from('kits')
            .insert([{ ...kitData, user_id: user.id }])
            .select();
        if (error) throw error;
        return data;
    },

    async updateKit(id, updates) {
        const { error } = await supabase.from('kits').update(updates).eq('id', id);
        if (error) throw error;
    },

    async deleteKit(id) {
        const { error } = await supabase.from('kits').delete().eq('id', id);
        if (error) throw error;
    },
    // --- ÉQUIPEMENTS (NOUVEAU) ---
    async getEquipment() {
        // On récupère l'équipement et le profil associé pour afficher l'avatar du propriétaire
        const { data, error } = await supabase
            .from('equipment')
            .select(`*, profiles(id, name, avatar)`)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    async addEquipment(item) {
        const profile = await authService.getMyProfile();
        // On lie l'équipement au profil de l'utilisateur courant
        const { data, error } = await supabase
            .from('equipment')
            .insert([{ ...item, profile_id: profile.id }])
            .select();
        if (error) throw error;
        return data;
    },
    async updateEquipment(id, updates) {
        const { error } = await supabase.from('equipment').update(updates).eq('id', id);
        if (error) throw error;
    },
    async deleteEquipment(id) {
        const { error } = await supabase.from('equipment').delete().eq('id', id);
        if (error) throw error;
    },

    // --- ADMINISTRATION ---
    
    // Récupérer tous les profils via RPC (Inclus last_sign_in_at)
    async getAllProfiles() {
        // On appelle la fonction SQL qu'on vient de créer
        const { data, error } = await supabase.rpc('get_admin_users_list');
        
        if (error) {
            console.error("Erreur RPC Admin Users:", error);
            // Fallback : si la RPC n'existe pas encore, on lit juste les profils classiques
            // pour ne pas faire crasher l'app
            const { data: fallback } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            return fallback;
        }
        return data;
    },

    // Changer le rôle global d'un user (Via fonction sécurisée RPC)
    async updateUserRole(userId, newRole) {
        const { error } = await supabase.rpc('set_user_role', { 
            target_user_id: userId, 
            new_role: newRole 
        });
        
        if (error) throw error;
    },

    // Statistiques Globales
    async getAppStats() {
        const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: bikes } = await supabase.from('bikes').select('*', { count: 'exact', head: true });
        const { count: parts } = await supabase.from('component_library').select('*', { count: 'exact', head: true });
        
        // Pour le total KM, c'est plus lourd, on fait simple pour l'instant
        const { data: activities } = await supabase.from('activities').select('distance');
        const totalKm = activities?.reduce((acc, a) => acc + (a.distance || 0), 0) / 1000 || 0;

        return { users, bikes, parts, totalKm: Math.round(totalKm) };
    },

    // BANNIÈRE GLOBALE
    async getBannerSettings() {
        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'global_banner')
            .maybeSingle();
            
        return data?.value || null;
    },

    async setBannerSettings(settings) {
        // settings = { message, startAt, endAt, type }
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'global_banner', value: settings });
        if (error) throw error;
    },

    // --- LOGS ---
    async logAction(action, details, level = 'info') {
        try {
            const user = await authService.getCurrentUser();
            const profile = await authService.getMyProfile();
            await supabase.from('app_logs').insert([{
                user_id: user?.id,
                user_name: profile?.name || 'Inconnu',
                action,
                details,
                level
            }]);
        } catch (e) {
            console.warn("Impossible de logger", e); // On ne veut pas bloquer l'app si le log échoue
        }
    },

    async getLogs() {
        const { data, error } = await supabase
            .from('app_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100); // Les 100 derniers
        if (error) throw error;
        return data;
    },

    // VÉRIFICATION PIN SÉCURISÉE (Via RPC)
    async checkAdminPin(inputPin) {
        try {
            // Appel de la fonction SQL sécurisée
            const { data, error } = await supabase.rpc('verify_admin_pin', { 
                input_pin: inputPin 
            });
            
            if (error) {
                console.error("Erreur vérification PIN:", error);
                return false;
            }
            
            // La fonction SQL renvoie true ou false
            return data;
        } catch (e) {
            return false;
        }
    },

    // --- ADMIN GLOBAL : SUPPRESSION VIA RPC ---
    async deleteUserProfile(userId) {
        // MODIFICATION : On appelle la fonction SQL sécurisée au lieu du delete direct
        const { error } = await supabase.rpc('delete_user_profile', { 
            target_user_id: userId 
        });
        if (error) throw error;
    },

    // --- TURLAG : GESTION MEMBRES (AJOUTS) ---
    
    // Promouvoir / Destituer un membre
    async updateMemberRole(turlagId, userId, newRole) {
        const { error } = await supabase.rpc('set_turlag_member_role', {
            target_turlag_id: turlagId,
            target_user_id: userId,
            new_role: newRole
        });
        if (error) throw error;
    },

    // Éjecter un membre du groupe
    async kickMember(turlagId, userId) {
        const { error } = await supabase.rpc('kick_turlag_member', {
            target_turlag_id: turlagId,
            target_user_id: userId
        });
        if (error) throw error;
    },

    // --- TURLAG INVITATIONS ---

    // Générer un code aléatoire
    async createInvite(turlagId, options = {}) {
        // options: { expiresInDays, maxUses }
        const user = await authService.getCurrentUser();
        
        // Génération code court (6 chars)
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        let expiresAt = null;
        if (options.expiresInDays) {
            const d = new Date();
            d.setDate(d.getDate() + parseInt(options.expiresInDays));
            expiresAt = d.toISOString();
        }

        const { data, error } = await supabase.from('turlag_invites').insert([{
            turlag_id: turlagId,
            code: code,
            created_by: user.id,
            expires_at: expiresAt,
            max_uses: options.maxUses || null
        }]).select().single();

        if (error) throw error;
        return data;
    },

    async getInvites(turlagId) {
        const { data, error } = await supabase
            .from('turlag_invites')
            .select('*')
            .eq('turlag_id', turlagId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async deleteInvite(inviteId) {
        const { error } = await supabase.from('turlag_invites').delete().eq('id', inviteId);
        if (error) throw error;
    },

    // REJOINDRE VIA CODE (Logique complexe)
    async joinByInviteCode(code) {
        const user = await authService.getCurrentUser();

        // 1. Vérifier l'invitation
        const { data: invite, error: invError } = await supabase
            .from('turlag_invites')
            .select('*, turlags(*)')
            .eq('code', code)
            .single();

        if (invError || !invite) throw new Error("Invitation invalide ou introuvable.");

        if (!invite.turlags) {
            console.error("Erreur: Le groupe lié à l'invitation est introuvable ou inaccessible.");
            throw new Error("Impossible d'accéder aux informations du groupe (Erreur de droits).");
        }

        // 2. Vérifier expiration
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            throw new Error("Cette invitation a expiré.");
        }

        // 3. Vérifier usage
        if (invite.max_uses && invite.uses_count >= invite.max_uses) {
            throw new Error("Nombre maximum d'utilisations atteint.");
        }

        // 4. Vérifier limite membres groupe
        const { count } = await supabase
            .from('turlag_members')
            .select('*', { count: 'exact', head: true })
            .eq('turlag_id', invite.turlag_id);
            
        if (invite.turlags.max_members && count >= invite.turlags.max_members) {
            throw new Error("Ce groupe est complet.");
        }

        // 5. Rejoindre
        const { error: joinError } = await supabase.from('turlag_members').insert([{
            turlag_id: invite.turlag_id,
            user_id: user.id,
            role: 'member'
        }]);

        if (joinError) {
            if (joinError.code === '23505') throw new Error("Vous êtes déjà membre.");
            throw joinError;
        }

        // 6. Incrémenter compteur
        await supabase.from('turlag_invites').update({ uses_count: invite.uses_count + 1 }).eq('id', invite.id);

        return invite.turlags; // On retourne les infos du groupe rejoint
    },

    // --- SETTINGS & TOOLS ---
    async getMaintenanceMode() {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'maintenance_mode').single();
        return data?.value === true; // Renvoie true ou false
    },

    async setMaintenanceMode(status) {
        await supabase.from('app_settings').update({ value: status }).eq('key', 'maintenance_mode');
    },

    // CLEAN-UP PHOTOS (Logique Avancée)
    async cleanupUnusedPhotos() {
        // 1. Lister toutes les photos utilisées en base
        const { data: bikes } = await supabase.from('bikes').select('photo_url');
        const usedFiles = new Set(bikes
            .filter(b => b.photo_url)
            .map(b => b.photo_url.split('/').pop()) // On garde juste le nom du fichier
        );

        // 2. Lister tous les fichiers du bucket Storage
        const { data: files, error } = await supabase.storage.from('bikes').list();
        if (error) throw error;

        // 3. Trouver les orphelins
        const filesToDelete = files
            .filter(f => !usedFiles.has(f.name))
            .map(f => f.name);

        if (filesToDelete.length === 0) return 0;

        // 4. Supprimer
        const { error: delError } = await supabase.storage.from('bikes').remove(filesToDelete);
        if (delError) throw delError;

        return filesToDelete.length;
    },

    // EXPORT DATA
    async getFullLibrary() {
        const { data } = await supabase.from('component_library').select('*');
        return data;
    },

    async getFullLogs() {
        // On récupère TOUT pour l'export (pas de limite 100)
        const { data } = await supabase.from('app_logs').select('*').order('created_at', { ascending: false });
        return data;
    },

    // --- BOUTIQUE & ÉCONOMIE ---
    
    // Récupérer tout le catalogue
    async getShopCatalog() {
        const { data, error } = await supabase
            .from('shop_items')
            .select('*')
            .eq('is_active', true)
            .order('price_watts', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    // Récupérer mon inventaire
    async getMyInventory() {
        const user = await authService.getCurrentUser();
        const { data, error } = await supabase
            .from('user_inventory')
            // On utilise !item_id pour forcer Supabase à comprendre le lien
            .select('*, shop_items!item_id(*)') 
            .eq('user_id', user.id);
            
        if (error) {
            console.error("Erreur Inventory:", error);
            throw error;
        }
        return data || [];
    },

    // Acheter un objet (Appel RPC)
    async purchaseItem(itemId, currency) {
        // currency = 'watts' ou 'chips'
        const { error } = await supabase.rpc('purchase_item', { 
            item_id_input: itemId, 
            currency_input: currency 
        });
        
        if (error) throw new Error(error.message); // Renvoie "Solde insuffisant" etc.
    },

    async syncWatts() {
        const { data, error } = await supabase.rpc('sync_watts_history');
        if (error) throw error;
        return data; // Retourne le nouveau solde
    },

    // Équiper un objet (ex: changer de thème)
    // Cette fonction est générique, on pourra l'affiner selon le type d'objet
    async equipItem(inventoryId, type) {
        // On ignore le paramètre 'type' car le SQL le trouve tout seul maintenant
        const { error } = await supabase.rpc('equip_shop_item', { 
            target_inventory_id: inventoryId 
        });

        if (error) throw error;
    },
    // Déséquiper toute une catégorie (Reset)
    async unequipCategory(type) {
        const { error } = await supabase.rpc('unequip_category', { 
            target_type: type 
        });
        if (error) throw error;
    },
    // Retirer le cadre d'un vélo
    async removeBikeFrame(bikeId) {
        const { error } = await supabase
            .from('bikes')
            .update({ frame_id: null })
            .eq('id', bikeId);
        if (error) throw error;
    },
    // --- BATTLE PASS ---
    async getSeasonLevels() { const { data } = await supabase.from('season_levels').select('*, shop_items(*)').order('level', { ascending: true }); return data; },
    async getClaimedRewards() { const u = await authService.getCurrentUser(); const { data } = await supabase.from('user_season_rewards').select('level').eq('user_id', u.id); return data ? data.map(r => r.level) : []; },
    async claimLevelReward(level) { 
        const u = await authService.getCurrentUser(); 
        const {error} = await supabase.from('user_season_rewards').insert([{user_id: u.id, level}]);
        if(error && error.code !== '23505') throw error;
        // Crédit auto
        const {data: l} = await supabase.from('season_levels').select('*').eq('level', level).single();
        if(l) {
            if(l.reward_watts > 0 || l.reward_chips > 0) await supabase.rpc('increment_currency', { p_watts: l.reward_watts, p_chips: l.reward_chips, p_user_id: u.id });
            if(l.reward_item_id) await supabase.from('user_inventory').insert([{user_id: u.id, item_id: l.reward_item_id}]);
        }
    },
    // CONFIG SAISON & MISSIONS
    async getSeasonConfig() { const { data } = await supabase.from('app_settings').select('value').eq('key', 'season_config').maybeSingle(); return data?.value || { xp_per_km: 10, xp_per_elev: 0.5 }; },
    async updateSeasonConfig(config) { return supabase.from('app_settings').upsert({ key: 'season_config', value: config }); },
    async getMissions() { const { data } = await supabase.from('season_missions').select('*').order('xp_reward'); return data||[]; },
    async getMyCompletedMissions() { const u = await authService.getCurrentUser(); const { data } = await supabase.from('user_missions').select('mission_id').eq('user_id', u.id); return data ? data.map(m => m.mission_id) : []; },
    async completeMission(mid) { 
        const u = await authService.getCurrentUser(); 
        const { error } = await supabase.from('user_missions').insert([{user_id:u.id, mission_id:mid}]); 
        if(error && error.code!=='23505') throw error;
        await api.syncStats();
    },
    async addMission(d) { return supabase.from('season_missions').insert([d]); },
    async deleteMission(id) { return supabase.from('season_missions').delete().eq('id', id); },
    // MODIFICATION : Nouvelle fonction de synchro complète
    async syncStats() {
        const { data, error } = await supabase.rpc('sync_user_stats');
        if (error) throw error;
        return data; // { watts: 1200, xp: 500 }
    },
};

// ==========================================
// 3. COUCHE DE COMPATIBILITÉ (SÉCURISÉE)
// ==========================================
// Utilisation stricte de fonctions fléchées pour éviter les erreurs "is not a function"

export const bikeService = {
    getAll: () => api.getBikes(),
    getById: (id) => api.getBike(id),
    add: (data) => api.addBike(data),
    update: (id, data) => api.updateBike(id, data),
    delete: (id) => api.deleteBike(id),
    uploadPhoto: (file) => api.uploadImage(file, 'bikes'),
    getKmAtDate: (id, date) => api.getBikeKmAtDate(id, date) 
};

export const maintenanceService = { getByBikeId: (id) => api.getMaintenance(id), add: (d) => api.addMaintenance(d), update: (id, d) => api.updateMaintenance(id, d), delete: (id) => api.deleteMaintenance(id) };

export const partsService = {
    getByBikeId: (id) => api.getParts(id),
    add: (data) => api.addPart(data),
    update: (id, data) => api.updatePart(id, data),
    delete: (id) => api.deletePart(id),
    getBikeKmAtDate: (id, date) => api.getBikeKmAtDate(id, date)
};

export const historyService = {
    getByBikeId: (id) => api.getHistory(id),
    add: (data) => api.addHistory(data),
    delete: (id) => api.deleteHistory(id)
};

export const nutritionService = { 
    getAll: () => api.getNutrition(),
    add: (d) => api.addNutrition(d),
    update: (id, d) => api.updateNutrition(id, d),
    delete: (id) => api.deleteNutrition(id),
    getHistory: (id) => api.getNutritionHistory(id),
    addStock: (id, qty, price) => api.addNutritionStock(id, qty, price),
    fetchOpenFoodFacts: async (barcode) => {
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
            const data = await response.json();
            
            if (data.status === 1) {
                const p = data.product;
                const n = p.nutriments;
                
                // Essayer de déterminer le type
                let type = 'other';
                const lowerName = (p.product_name || '').toLowerCase();
                if (lowerName.includes('gel')) type = 'gel';
                else if (lowerName.includes('bar')) type = 'bar';
                else if (lowerName.includes('boisson') || lowerName.includes('drink') || lowerName.includes('poudre')) type = 'drink';
                else if (lowerName.includes('compote') || lowerName.includes('purée')) type = 'compote';

                // Essayer de récupérer les valeurs "par portion" si dispo, sinon 100g
                // OFF stocke souvent sous 'carbohydrates_serving' si la portion est définie
                // Sinon on prend _100g
                
                // Petite logique : si c'est un gel/barre, on veut la valeur par unité.
                // Souvent OFF a "serving_size".
                
                const isPerServingAvailable = n.carbohydrates_serving !== undefined;
                
                return {
                    found: true,
                    name: p.product_name || '',
                    brand: p.brands || '',
                    category_type: type,
                    // Priorité à la portion, sinon 100g
                    carbs: isPerServingAvailable ? parseFloat(n.carbohydrates_serving) : parseFloat(n.carbohydrates_100g),
                    proteins: isPerServingAvailable ? parseFloat(n.proteins_serving) : parseFloat(n.proteins_100g),
                    fat: isPerServingAvailable ? parseFloat(n.fat_serving) : parseFloat(n.fat_100g),
                    image_url: p.image_front_small_url,
                    serving_size: p.serving_size || '100g' // Pour info utilisateur
                };
            } else {
                return { found: false };
            }
        } catch (e) {
            console.error("Erreur OFF", e);
            return { found: false, error: true };
        }
    }
};

export const libraryService = { getAll: () => api.getComponentLibrary() };

export const kitService = {
    getAll: () => api.getKits(),
    add: (d) => api.addKit(d),
    update: (id, d) => api.updateKit(id, d),
    delete: (id) => api.deleteKit(id)
};

export const equipmentService = {
    getAll: () => api.getEquipment(),
    add: (d) => api.addEquipment(d),
    update: (id, d) => api.updateEquipment(id, d),
    delete: (id) => api.deleteEquipment(id)
};

export const adminService = {
    getAllUsers: () => api.getAllProfiles(),
    updateRole: (uid, role) => api.updateUserRole(uid, role),
    deleteUser: (uid) => api.deleteUserProfile(uid),
    getStats: () => api.getAppStats(),
    getLogs: () => api.getLogs(),
    log: (a, d, l) => api.logAction(a, d, l),
    getMaintenance: () => api.getMaintenanceMode(),
    setMaintenance: (s) => api.setMaintenanceMode(s),
    cleanupPhotos: () => api.cleanupUnusedPhotos(),
    exportLibrary: () => api.getFullLibrary(),
    exportLogs: () => api.getFullLogs(),
    verifyPin: (p) => api.checkAdminPin(p),
    getBanner: () => api.getBannerSettings(),
    setBanner: (s) => api.setBannerSettings(s),
};

export const shopService = {
    getCatalog: () => api.getShopCatalog(),
    getInventory: () => api.getMyInventory(),
    buy: (id, currency) => api.purchaseItem(id, currency),
    equip: (invId, type) => api.equipItem(invId, type),
    unequip: (type) => api.unequipCategory(type),
    equipBike: (bikeId, frameId) => api.equipBikeFrame(bikeId, frameId),
    unequipBike: (bikeId) => api.removeBikeFrame(bikeId), 
    syncHistory: () => api.syncStats(), 
    getSeason: () => api.getSeasonLevels(),
    getClaimed: () => api.getClaimedRewards(),
    claim: (lvl) => api.claimLevelReward(lvl),
    getSeasonConfig: () => api.getSeasonConfig(),
    updateSeasonConfig: (c) => api.updateSeasonConfig(c),
    getMissions: () => api.getMissions(),
    getCompletedMissions: () => api.getMyCompletedMissions(),
    completeMission: (id) => api.completeMission(id),
    addMission: (d) => api.addMission(d),
    deleteMission: (id) => api.deleteMission(id),
    claimAll: async (levelsToClaim) => {
        // levelsToClaim est un tableau de numéros de niveaux [1, 2, 5]
        // On fait une boucle de promesses pour tout récupérer
        await Promise.all(levelsToClaim.map(lvl => api.claimLevelReward(lvl)));
    },
    // NOUVEAU : Admin - Modifier un niveau
    updateLevel: async (levelId, updates) => {
        const { error } = await supabase
            .from('season_levels')
            .update(updates)
            .eq('level', levelId);
        if (error) throw error;
    },

};

export const activityService = {
    getAll: () => api.getActivities(),
    addManual: (d) => api.addManualActivity(d)
};

export const helpService = {
    // Récupérer la FAQ
    async getFaqs() {
        const { data, error } = await supabase
            .from('app_faqs')
            .select('*')
            .order('display_order', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    // Envoyer un feedback
    async sendFeedback(type, message) {
        const user = await authService.getCurrentUser();
        if (!user) throw new Error("Vous devez être connecté.");

        const { error } = await supabase
            .from('app_feedback')
            .insert([{
                user_id: user.id,
                type: type, // 'bug', 'feature', 'other'
                message: message
            }]);
        if (error) throw error;
    }
};