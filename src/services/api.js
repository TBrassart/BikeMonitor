import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// 1. SERVICE D'AUTHENTIFICATION (Auth & Profils)
// ==========================================
export const authService = {
    // Inscription
    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    },

    // Connexion
    async signInWithEmail(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    // Déconnexion
    async signOut() {
        return await supabase.auth.signOut();
    },

    // Utilisateur technique actuel
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // PROFIL APPLICATIF (Table 'profiles')
    // Récupère ou crée le profil lié à l'utilisateur connecté
    async getMyProfile() {
        const user = await this.getCurrentUser();
        if (!user) return null;

        // 1. Chercher le profil existant
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (data) return data;

        // 2. Si pas de profil (ex: inscription), on le crée
        if (!data) {
            const newProfile = {
                user_id: user.id,
                name: user.email.split('@')[0], // Nom par défaut via email
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

    // Mettre à jour mon profil
    async updateProfile(updates) {
        const user = await this.getCurrentUser();
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('user_id', user.id)
            .select();
        if (error) throw error;
        return data?.[0];
    },

    // --- GESTION DES TURLAGS (GROUPES) ---
    
    async getMyTurlags() {
        // La RLS (Row Level Security) filtre déjà côté serveur
        const { data, error } = await supabase.from('turlags').select('*').order('created_at');
        if (error) throw error;
        return data || [];
    },

    async createTurlag(name, description = "") {
        const user = await this.getCurrentUser();
        // 1. Créer le groupe
        const { data: turlag, error: err1 } = await supabase
            .from('turlags')
            .insert([{ name, description, created_by: user.id }])
            .select().single();
        if (err1) throw err1;

        // 2. M'ajouter comme admin
        const { error: err2 } = await supabase
            .from('turlag_members')
            .insert([{ turlag_id: turlag.id, user_id: user.id, role: 'admin' }]);
        if (err2) throw err2;

        return turlag;
    },

    async joinTurlag(turlagId) {
        const user = await this.getCurrentUser();
        const { error } = await supabase
            .from('turlag_members')
            .insert([{ turlag_id: turlagId, user_id: user.id, role: 'member' }]);
        
        if (error) {
            if (error.code === '23505') throw new Error("Tu es déjà membre de ce groupe.");
            throw error;
        }
    },
    
    async leaveTurlag(turlagId) {
        const user = await this.getCurrentUser();
        const { error } = await supabase
            .from('turlag_members')
            .delete()
            .eq('turlag_id', turlagId)
            .eq('user_id', user.id);
        if (error) throw error;
    }
};

// ==========================================
// 2. API MÉTIER (Vélos, Pièces, etc.)
// ==========================================
export const api = {
    // --- VÉLOS ---
    async getBikes() {
        // Récupère MES vélos + ceux de mes Turlags (grâce aux Policies SQL)
        const { data, error } = await supabase
            .from('bikes')
            .select(`*, profiles:user_id ( name, avatar )`) // Jointure pour savoir à qui est le vélo
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async addBike(bikeData) {
        const user = await authService.getCurrentUser();
        const { data, error } = await supabase
            .from('bikes')
            .insert([{ ...bikeData, user_id: user.id }])
            .select();
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

    // --- STATS ---
    async getStats() {
        // Récupère les vélos visibles pour calculer les totaux
        const bikes = await this.getBikes();
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

    // --- BIBLIOTHÈQUE ---
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

    // --- KITS (Optionnel) ---
    async getKits() {
        const user = await authService.getCurrentUser();
        // Vérification de sécurité simple si la table n'existe pas encore
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
    }
};

// ==========================================
// 3. COUCHE DE COMPATIBILITÉ (Sécurisée)
// ==========================================
// On utilise des fonctions fléchées () => ... pour éviter les erreurs "is not a function"
// si 'api' n'est pas encore totalement initialisée lors de l'import.

export const bikeService = {
    getAll: () => api.getBikes(),
    add: (data) => api.addBike(data),
    update: (id, data) => api.updateBike(id, data),
    delete: (id) => api.deleteBike(id),
    uploadPhoto: (file) => api.uploadImage(file, 'bikes')
};

export const maintenanceService = {
    getByBikeId: (id) => api.getMaintenance(id),
    add: (data) => api.addMaintenance(data),
    update: (id, data) => api.updateMaintenance(id, data),
    delete: (id) => api.deleteMaintenance(id)
};

export const partsService = {
    getByBikeId: (id) => api.getParts(id),
    add: (data) => api.addPart(data),
    update: (id, data) => api.updatePart(id, data),
    delete: (id) => api.deletePart(id)
};

export const historyService = {
    getByBikeId: (id) => api.getHistory(id),
    add: (data) => api.addHistory(data)
};

export const nutritionService = {
    getAll: () => api.getNutrition(),
    add: (data) => api.addNutrition(data),
    update: (id, data) => api.updateNutrition(id, data),
    delete: (id) => api.deleteNutrition(id)
};

export const libraryService = {
    getAll: () => api.getComponentLibrary(),
    add: (data) => api.addToLibrary(data)
};

export const kitService = {
    getAll: () => api.getKits(),
    add: (data) => api.addKit(data)
};