import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- NOUVELLE AUTHENTIFICATION (Turlag) ---
export const authService = {
    // INSCRIPTION (Email + Password)
    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    // CONNEXION (Email + Password)
    async signInWithEmail(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        return await supabase.auth.signOut();
    },

    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // Récupération du profil (Compatible Turlag)
    async getUserProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Ignorer l'erreur si le profil n'existe pas encore (cas de l'inscription)
        if (error && error.code !== 'PGRST116') {
            console.error("Erreur récupération profil:", error);
        }
        return data;
    },

    // Création du profil initial (si inexistant)
    async createInitialProfile(user) {
        if (!user) return null;
        const existing = await this.getUserProfile();
        if (existing) return existing;

        const { data, error } = await supabase
            .from('profiles')
            .insert([{
                user_id: user.id,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cycliste',
                avatar: '🚲'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ... le reste (updateProfile, Turlags...) reste identique
    async updateProfile(id, updates) {
        // ... code existant ...
        const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select();
        if (error) throw error;
        return data?.[0];
    },
    
    // Gardez les méthodes getMyTurlags, createTurlag, joinTurlag, leaveTurlag telles quelles
    async getMyTurlags() {
        const { data, error } = await supabase.from('turlags').select('*').order('created_at');
        if (error) throw error;
        return data || [];
    },
    async createTurlag(name, description = "") {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: turlag, error: turlagError } = await supabase.from('turlags').insert([{ name, description, created_by: user.id }]).select().single();
        if (turlagError) throw turlagError;
        const { error: memberError } = await supabase.from('turlag_members').insert([{ turlag_id: turlag.id, user_id: user.id, role: 'admin' }]);
        if (memberError) throw memberError;
        return turlag;
    },
    async joinTurlag(turlagId) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('turlag_members').insert([{ turlag_id: turlagId, user_id: user.id, role: 'member' }]);
        if (error && error.code === '23505') throw new Error("Déjà membre.");
        if (error) throw error;
        return true;
    },
    async leaveTurlag(turlagId) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('turlag_members').delete().eq('turlag_id', turlagId).eq('user_id', user.id);
        if (error) throw error;
    }
};

// --- API CENTRALISÉE (Nouvelle structure) ---
export const api = {
    // Vélos
    async getBikes() {
        const { data, error } = await supabase
            .from('bikes')
            .select(`*, profiles:user_id ( name, avatar )`)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    async addBike(bikeData) {
        const { data: { user } } = await supabase.auth.getUser();
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
        const filePath = `${fileName}`;
        const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
    },

    // Stats
    async getStats() {
        const { data: bikes, error } = await supabase.from('bikes').select('id, name, total_km, total_elevation, total_hours');
        if (error) return { totalKm: 0, bikes: [] };
        const totalKm = bikes.reduce((acc, bike) => acc + (bike.total_km || 0), 0);
        const totalElevation = bikes.reduce((acc, bike) => acc + (bike.total_elevation || 0), 0);
        return { totalKm, totalElevation, bikesCount: bikes.length, bikes };
    },

    // Maintenance
    async getMaintenance(bikeId) {
        const { data, error } = await supabase.from('maintenance').select('*').eq('bike_id', bikeId).order('date_due', { ascending: true });
        if (error) throw error;
        return data || [];
    },
    async addMaintenance(data) {
        const { data: res, error } = await supabase.from('maintenance').insert([data]).select();
        if (error) throw error;
        return res;
    },
    async updateMaintenance(id, updates) {
        const { error } = await supabase.from('maintenance').update(updates).eq('id', id);
        if (error) throw error;
    },
    async deleteMaintenance(id) {
        const { error } = await supabase.from('maintenance').delete().eq('id', id);
        if (error) throw error;
    },

    // Pièces
    async getParts(bikeId) {
        const { data, error } = await supabase.from('parts').select('*').eq('bike_id', bikeId).order('category');
        if (error) throw error;
        return data || [];
    },
    async addPart(data) {
        const { data: res, error } = await supabase.from('parts').insert([data]).select();
        if (error) throw error;
        return res;
    },
    async updatePart(id, updates) {
        const { error } = await supabase.from('parts').update(updates).eq('id', id);
        if (error) throw error;
    },
    async deletePart(id) {
        const { error } = await supabase.from('parts').delete().eq('id', id);
        if (error) throw error;
    },

    // Historique
    async getHistory(bikeId) {
        const { data, error } = await supabase.from('history').select('*').eq('bike_id', bikeId).order('date', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    async addHistory(data) {
        const { error } = await supabase.from('history').insert([data]);
        if (error) throw error;
    },

    // Nutrition
    async getNutrition() {
        const { data, error } = await supabase.from('nutrition').select('*').order('type');
        if (error) throw error;
        return data || [];
    },
    async addNutrition(item) {
        const { data: { user } } = await supabase.auth.getUser();
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

    // Bibliothèque & Kits
    async getComponentLibrary() {
        const { data, error } = await supabase.from('component_library').select('*').order('category');
        if (error) throw error;
        return data || [];
    },
    async addToLibrary(data) {
        const { data: res, error } = await supabase.from('component_library').insert([data]).select();
        if (error) throw error;
        return res;
    },
    async getKits() {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase.from('kits').select('*').eq('user_id', user.id);
        if (error) return [];
        return data || [];
    },
    async addKit(data) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: res, error } = await supabase.from('kits').insert([{ ...data, user_id: user.id }]).select();
        if (error) throw error;
        return res;
    },
    
    // Activités
    async getActivities() {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase.from('activities').select('*').eq('profile_id', user.id).order('start_date', { ascending: false });
        if (error) return [];
        return data;
    }
};

// --- ADAPTATEURS DE COMPATIBILITÉ (Legacy) ---
// Ces exports permettent à vos anciens composants de continuer à fonctionner
// sans avoir besoin de tout réécrire. Ils redirigent vers la nouvelle 'api'.

export const bikeService = {
    getAll: async () => await api.getBikes(),
    add: async (data) => await api.addBike(data),
    update: async (id, data) => await api.updateBike(id, data),
    delete: async (id) => await api.deleteBike(id),
    uploadPhoto: async (file) => await api.uploadImage(file, 'bikes')
};

export const maintenanceService = {
    getByBikeId: async (id) => await api.getMaintenance(id),
    add: async (data) => await api.addMaintenance(data),
    update: async (id, data) => await api.updateMaintenance(id, data),
    delete: async (id) => await api.deleteMaintenance(id)
};

export const partsService = {
    getByBikeId: async (id) => await api.getParts(id),
    add: async (data) => await api.addPart(data),
    update: async (id, data) => await api.updatePart(id, data),
    delete: async (id) => await api.deletePart(id)
};

export const historyService = {
    getByBikeId: async (id) => await api.getHistory(id),
    add: async (data) => await api.addHistory(data)
};

export const nutritionService = {
    getAll: async () => await api.getNutrition(),
    add: async (data) => await api.addNutrition(data),
    update: async (id, data) => await api.updateNutrition(id, data),
    delete: async (id) => await api.deleteNutrition(id)
};

export const libraryService = {
    getAll: async () => await api.getComponentLibrary(),
    add: async (data) => await api.addToLibrary(data)
};

export const kitService = {
    getAll: async () => await api.getKits(),
    add: async (data) => await api.addKit(data)
};