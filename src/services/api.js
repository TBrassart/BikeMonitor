import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const authService = {
    // --- AUTHENTIFICATION ---
    async signInWithEmail(email) {
        return await supabase.auth.signInWithOtp({ email });
    },

    async signOut() {
        return await supabase.auth.signOut();
    },

    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // --- PROFILS (Ex-Famille) ---
    async getUserProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // On cherche le profil lié à cet user_id
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error("Erreur récupération profil:", error);
        }
        return data;
    },

    // Création automatique du profil au premier login
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

    async updateProfile(id, updates) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', id)
            .select();
        if (error) throw error;
        return data?.[0];
    },

    // --- TURLAGS (Groupes) ---
    async getMyTurlags() {
        const { data, error } = await supabase
            .from('turlags')
            .select('*')
            .order('created_at'); // La RLS filtre pour nous
        if (error) throw error;
        return data || [];
    },

    async createTurlag(name, description = "") {
        const { data: { user } } = await supabase.auth.getUser();
        
        // 1. Création du groupe
        const { data: turlag, error: turlagError } = await supabase
            .from('turlags')
            .insert([{ name, description, created_by: user.id }])
            .select()
            .single();
        if (turlagError) throw turlagError;

        // 2. Ajout de l'admin
        const { error: memberError } = await supabase
            .from('turlag_members')
            .insert([{ turlag_id: turlag.id, user_id: user.id, role: 'admin' }]);
        if (memberError) throw memberError;

        return turlag;
    },

    async joinTurlag(turlagId) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('turlag_members')
            .insert([{ turlag_id: turlagId, user_id: user.id, role: 'member' }]);
        
        if (error) {
            if (error.code === '23505') throw new Error("Déjà membre.");
            throw error;
        }
        return true;
    },

    async leaveTurlag(turlagId) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('turlag_members')
            .delete()
            .eq('turlag_id', turlagId)
            .eq('user_id', user.id);
        if (error) throw error;
    }
};

export const api = {
    // --- VÉLOS ---
    async getBikes() {
        // Récupère mes vélos + ceux des Turlags (filtré par RLS)
        // Jointure avec profiles pour afficher l'avatar du propriétaire
        const { data, error } = await supabase
            .from('bikes')
            .select(`*, profiles:user_id ( name, avatar )`)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async addBike(bikeData) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('bikes')
            .insert([{ ...bikeData, user_id: user.id }])
            .select();
        if (error) throw error;
        return data;
    },

    async updateBike(id, updates) {
        const { data, error } = await supabase
            .from('bikes')
            .update(updates)
            .eq('id', id)
            .select();
        if (error) throw error;
        return data;
    },

    async deleteBike(id) {
        const { error } = await supabase.from('bikes').delete().eq('id', id);
        if (error) throw error;
    },

    // --- STATISTIQUES (Pour ChartsSection) ---
    async getStats() {
        // On récupère tous les vélos visibles pour calculer les totaux
        const { data: bikes, error } = await supabase
            .from('bikes')
            .select('id, name, total_km, total_elevation, total_hours');
        
        if (error) return { totalKm: 0, bikes: [] };

        const totalKm = bikes.reduce((acc, bike) => acc + (bike.total_km || 0), 0);
        const totalElevation = bikes.reduce((acc, bike) => acc + (bike.total_elevation || 0), 0);

        return {
            totalKm,
            totalElevation,
            bikesCount: bikes.length,
            bikes // Renvoie aussi le détail pour les graphiques par vélo
        };
    },

    // --- MAINTENANCE ---
    async getMaintenance(bikeId) {
        const { data, error } = await supabase
            .from('maintenance')
            .select('*')
            .eq('bike_id', bikeId)
            .order('date_due', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async addMaintenance(maintenanceData) {
        const { data, error } = await supabase
            .from('maintenance')
            .insert([maintenanceData])
            .select();
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

    // --- PIÈCES (Parts) ---
    async getParts(bikeId) {
        const { data, error } = await supabase
            .from('parts')
            .select('*')
            .eq('bike_id', bikeId)
            .order('category');
        if (error) throw error;
        return data || [];
    },

    async addPart(partData) {
        const { data, error } = await supabase.from('parts').insert([partData]).select();
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

    // --- HISTORIQUE (History) ---
    async getHistory(bikeId) {
        const { data, error } = await supabase
            .from('history')
            .select('*')
            .eq('bike_id', bikeId)
            .order('date', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async addHistory(eventData) {
        const { error } = await supabase.from('history').insert([eventData]);
        if (error) throw error;
    },

    // --- NUTRITION ---
    async getNutrition() {
        const { data, error } = await supabase.from('nutrition').select('*').order('type');
        if (error) throw error;
        return data || [];
    },

    async addNutrition(item) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('nutrition')
            .insert([{ ...item, user_id: user.id }])
            .select();
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

    // --- BIBLIOTHÈQUE DE COMPOSANTS (Library) ---
    async getComponentLibrary() {
        const { data, error } = await supabase
            .from('component_library')
            .select('*')
            .order('category');
        if (error) throw error;
        return data || [];
    },

    async addToLibrary(componentData) {
        const { data, error } = await supabase
            .from('component_library')
            .insert([componentData])
            .select();
        if (error) throw error;
        return data;
    },

    // --- KITS ---
    // (Suppose que la table 'kits' existe. Si elle manque, il faudra l'ajouter via SQL)
    async getKits() {
        const { data: { user } } = await supabase.auth.getUser();
        // Exemple simple : chacun voit ses kits
        const { data, error } = await supabase
            .from('kits')
            .select('*')
            .eq('user_id', user.id); 
            
        if (error) {
            console.warn("Table kits introuvable ou erreur:", error);
            return [];
        }
        return data || [];
    },

    async addKit(kitData) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('kits')
            .insert([{ ...kitData, user_id: user.id }])
            .select();
        if (error) throw error;
        return data;
    },

    // --- ACTIVITÉS ---
    async getActivities() {
        const { data: { user } } = await supabase.auth.getUser();
        // On récupère les activités liées au profil de l'utilisateur
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('profile_id', user.id) // Adapte 'profile_id' si ta colonne s'appelle user_id
            .order('start_date', { ascending: false });
        if (error) return [];
        return data;
    },

    // --- UTILITAIRES ---
    async uploadImage(file, bucket = 'bikes') {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
    }
};