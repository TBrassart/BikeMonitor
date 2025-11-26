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

    // CORRECTION DU BUG "QUITTER LE GROUPE"
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

    // --- AJOUTER CES DEUX LIGNES ICI : ---
    updateMemberRole: (tid, uid, role) => api.updateMemberRole(tid, uid, role),
    kickMember: (tid, uid) => api.kickMember(tid, uid),

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
    // --- NUTRITION ---
    async getNutrition() {
        const { data, error } = await supabase.from('nutrition').select('*');
        if (error) throw error;
        return data || [];
    },
    async addNutrition(item) {
        const user = await authService.getCurrentUser();
        const { data, error } = await supabase.from('nutrition').insert([{ ...item, user_id: user.id }]).select();
        if (error) throw error;
        return data;
    },
    async updateNutrition(id, updates) {
        const { error } = await supabase.from('nutrition').update(updates).eq('id', id);
        if (error) throw error;
    },
    async deleteNutrition(id) {
        const { error } = await supabase.from('nutrition').delete().eq('id', id);
        if (error) throw error;
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
        try {
            const { data, error } = await supabase.from('kits').select('*').eq('user_id', user.id);
            if (error) return [];
            return data || [];
        } catch (e) { return []; }
    },
    async addKit(item) {
        const user = await authService.getCurrentUser();
        const { data, error } = await supabase.from('kits').insert([{ ...item, user_id: user.id }]).select();
        if (error) throw error;
        return data;
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
    
    // Récupérer tous les profils (Admin only)
    async getAllProfiles() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
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

export const nutritionService = { getAll: () => api.getNutrition() };

export const libraryService = { getAll: () => api.getComponentLibrary() };

export const kitService = {
    getAll: () => api.getKits(),
    add: (data) => api.addKit(data)
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
    syncHistory: () => api.syncWatts(),
    equipBike: (bikeId, frameId) => api.equipBikeFrame(bikeId, frameId),
    equip: (invId, type) => api.equipItem(invId, type),
    unequip: (type) => api.unequipCategory(type),
};