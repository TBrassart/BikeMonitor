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
        const { data: { user } } = await supabase.auth.getUser();
        return user;
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
    // --- TURLAGS ---
    async getMyTurlags() {
        const { data, error } = await supabase.from('turlags').select('*').order('created_at');
        if (error) throw error;
        return data || [];
    },
    async createTurlag(name, description = "") {
        const user = await this.getCurrentUser();
        const { data: turlag, error: err1 } = await supabase.from('turlags').insert([{ name, description, created_by: user.id }]).select().single();
        if (err1) throw err1;
        const { error: err2 } = await supabase.from('turlag_members').insert([{ turlag_id: turlag.id, user_id: user.id, role: 'admin' }]);
        if (err2) throw err2;
        return turlag;
    },
    async joinTurlag(turlagId) {
        const user = await this.getCurrentUser();
        const { error } = await supabase.from('turlag_members').insert([{ turlag_id: turlagId, user_id: user.id, role: 'member' }]);
        if (error && error.code === '23505') throw new Error("Tu es déjà membre.");
        if (error) throw error;
    },
    async leaveTurlag(turlagId) {
        const user = await this.getCurrentUser();
        const { error } = await supabase.from('turlag_members').delete().eq('turlag_id', turlagId).eq('user_id', user.id);
        if (error) throw error;
    }
};

// ==========================================
// 2. API MÉTIER
// ==========================================
export const api = {
    // --- VÉLOS ---
    async getBikes() {
        const { data, error } = await supabase
            .from('bikes')
            .select(`*, profiles:user_id ( name, avatar )`)
            .order('created_at', { ascending: false });
        if (error) throw error;
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

    // --- CALCULS INTELLIGENTS ---
    async getBikeKmAtDate(bikeId, date) {
        // On récupère toutes les activités de ce vélo avant la date indiquée
        const { data, error } = await supabase
            .from('activities')
            .select('distance')
            .eq('bike_id', bikeId)
            .lte('start_date', date); // lte = Less Than or Equal (<=)

        if (error) {
            console.warn("Erreur calcul historique:", error);
            return 0;
        }
        
        // On fait la somme (distance est supposée être en km dans la BDD)
        const total = data.reduce((acc, act) => acc + (act.distance || 0), 0);
        return Math.round(total);
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
    }
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
    delete: (id) => api.deletePart(id),
    getBikeKmAtDate: (id, date) => api.getBikeKmAtDate(id, date)
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