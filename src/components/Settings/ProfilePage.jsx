import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import './ProfilePage.css';

function ProfilePage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // État du formulaire
    const [formData, setFormData] = useState({
        name: '',
        height: '',
        weight: '',
        ftp: '',
        max_hr: '',
        resting_hr: '',
        birth_date: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            // 1. On récupère le profil complet via la nouvelle API
            const profile = await authService.getMyProfile();
            
            if (profile) {
                setUser(profile);
                // 2. On pré-remplit le formulaire
                setFormData({
                    name: profile.name || '',
                    height: profile.height || '',
                    weight: profile.weight || '',
                    ftp: profile.ftp || '',
                    max_hr: profile.max_hr || '',
                    resting_hr: profile.resting_hr || '',
                    birth_date: profile.birth_date || ''
                });
            }
        } catch (e) {
            console.error("Erreur chargement profil", e);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            // 3. CORRECTION CRITIQUE : On envoie juste les données, pas l'ID.
            // L'API retrouve l'utilisateur toute seule.
            await authService.updateProfile({
                name: formData.name,
                height: formData.height ? parseInt(formData.height) : null,
                weight: formData.weight ? parseFloat(formData.weight) : null,
                ftp: formData.ftp ? parseInt(formData.ftp) : null,
                max_hr: formData.max_hr ? parseInt(formData.max_hr) : null,
                resting_hr: formData.resting_hr ? parseInt(formData.resting_hr) : null,
                birth_date: formData.birth_date || null
            });

            setMessage({ type: 'success', text: 'Profil mis à jour avec succès ! ✅' });
            
            // Petit refresh pour être sûr
            loadProfile();
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-state">Chargement de ton profil...</div>;

    return (
        <div className="profile-page">
            {/* En-tête avec Avatar */}
            <div className="profile-header glass-panel">
                <div className="profile-avatar-large">
                    {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="profile-title">
                    <h3>{formData.name || 'Cycliste Inconnu'}</h3>
                    <p className="subtitle">Pilote principal</p>
                </div>
            </div>

            {message && (
                <div className={`message-box ${message.type}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="profile-form">
                
                {/* SECTION 1 : Identité */}
                <div className="form-section glass-panel">
                    <h4>Identité</h4>
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Nom d'affichage</label>
                            <input 
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder="Ton pseudo"
                            />
                        </div>
                        <div className="form-group">
                            <label>Date de naissance</label>
                            <input 
                                type="date" 
                                name="birth_date" 
                                value={formData.birth_date} 
                                onChange={handleChange} 
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 2 : Physique & Performance */}
                <div className="form-section glass-panel">
                    <h4>Physiologie & Perf</h4>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Poids (kg)</label>
                            <input 
                                type="number" 
                                step="0.1" 
                                name="weight" 
                                value={formData.weight} 
                                onChange={handleChange} 
                                placeholder="70.5"
                            />
                        </div>
                        <div className="form-group">
                            <label>Taille (cm)</label>
                            <input 
                                type="number" 
                                name="height" 
                                value={formData.height} 
                                onChange={handleChange} 
                                placeholder="175"
                            />
                        </div>
                        <div className="form-group">
                            <label>FTP (Watts)</label>
                            <input 
                                type="number" 
                                name="ftp" 
                                value={formData.ftp} 
                                onChange={handleChange} 
                                placeholder="250"
                            />
                        </div>
                        <div className="form-group">
                            <label>FC Max (bpm)</label>
                            <input 
                                type="number" 
                                name="max_hr" 
                                value={formData.max_hr} 
                                onChange={handleChange} 
                                placeholder="190"
                            />
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="primary-btn save-btn" disabled={saving}>
                        {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ProfilePage;