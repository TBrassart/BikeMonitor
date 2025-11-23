import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import './ProfilePage.css';

function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const [avatar, setAvatar] = useState('🚲');
    const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);
    
    const defaultAvatars = ['🚴‍♂️', '🏔️', '⚡', '🚀', '💡', '🦁', '🐺', '🦊', '🐻', '🏁', '⚙️', '🛠️', '💧', '🌡️', '🌲', '🔥'];

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
            const profile = await authService.getMyProfile();
            if (profile) {
                setFormData({
                    name: profile.name || '',
                    height: profile.height || '',
                    weight: profile.weight || '',
                    ftp: profile.ftp || '',
                    max_hr: profile.max_hr || '',
                    resting_hr: profile.resting_hr || '',
                    birth_date: profile.birth_date || ''
                });
                setAvatar(profile.avatar || '🚲');
            }
        } catch (e) {
            console.error("Erreur profil", e);
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
            await authService.updateProfile({
                name: formData.name,
                height: formData.height ? parseInt(formData.height) : null,
                weight: formData.weight ? parseFloat(formData.weight) : null,
                ftp: formData.ftp ? parseInt(formData.ftp) : null,
                max_hr: formData.max_hr ? parseInt(formData.max_hr) : null,
                resting_hr: formData.resting_hr ? parseInt(formData.resting_hr) : null,
                birth_date: formData.birth_date || null,
                avatar: avatar
            });
            setMessage({ type: 'success', text: 'Profil mis à jour ! ✅' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Erreur sauvegarde.' });
        } finally {
            setSaving(false);
        }
    };

    // --- CALCUL DES ZONES ---
    
    const renderPowerZones = () => {
        const ftp = parseInt(formData.ftp);
        if (!ftp) return <p className="empty-zones">Renseigne ton FTP pour voir tes zones.</p>;

        const zones = [
            { name: 'Z1 Récup', range: `< ${Math.round(ftp * 0.55)}`, color: '#9ca3af' }, // Gris
            { name: 'Z2 Endurance', range: `${Math.round(ftp * 0.56)} - ${Math.round(ftp * 0.75)}`, color: '#3b82f6' }, // Bleu
            { name: 'Z3 Tempo', range: `${Math.round(ftp * 0.76)} - ${Math.round(ftp * 0.90)}`, color: '#10b981' }, // Vert
            { name: 'Z4 Seuil', range: `${Math.round(ftp * 0.91)} - ${Math.round(ftp * 1.05)}`, color: '#f59e0b' }, // Jaune/Orange
            { name: 'Z5 VO2 Max', range: `${Math.round(ftp * 1.06)} - ${Math.round(ftp * 1.20)}`, color: '#ef4444' }, // Rouge
            { name: 'Z6 Anaérobie', range: `> ${Math.round(ftp * 1.21)}`, color: '#7c3aed' }, // Violet
        ];

        return (
            <div className="zones-grid">
                {zones.map((z, i) => (
                    <div key={i} className="zone-card" style={{ borderLeft: `4px solid ${z.color}` }}>
                        <span className="zone-name">{z.name}</span>
                        <span className="zone-value">{z.range} W</span>
                    </div>
                ))}
            </div>
        );
    };

    const renderHrZones = () => {
        const max = parseInt(formData.max_hr);
        if (!max) return <p className="empty-zones">Renseigne ta FC Max pour voir tes zones.</p>;

        const zones = [
            { name: 'Z1', range: `${Math.round(max * 0.50)} - ${Math.round(max * 0.60)}`, color: '#9ca3af' },
            { name: 'Z2', range: `${Math.round(max * 0.61)} - ${Math.round(max * 0.70)}`, color: '#3b82f6' },
            { name: 'Z3', range: `${Math.round(max * 0.71)} - ${Math.round(max * 0.80)}`, color: '#10b981' },
            { name: 'Z4', range: `${Math.round(max * 0.81)} - ${Math.round(max * 0.90)}`, color: '#f59e0b' },
            { name: 'Z5', range: `> ${Math.round(max * 0.91)}`, color: '#ef4444' },
        ];

        return (
            <div className="zones-grid">
                {zones.map((z, i) => (
                    <div key={i} className="zone-card" style={{ borderLeft: `4px solid ${z.color}` }}>
                        <span className="zone-name">{z.name}</span>
                        <span className="zone-value">{z.range} bpm</span>
                    </div>
                ))}
            </div>
        );
    };

    if (loading) return <div className="loading-state">Chargement...</div>;

    return (
        <div className="profile-page">
            <div className="profile-header glass-panel">
                {/* Rendre l'avatar cliquable */}
                <div 
                    className="profile-avatar-large clickable"
                    onClick={() => setIsSelectingAvatar(true)}
                    title="Cliquer pour changer d'avatar"
                >
                    {avatar} {/* Affiche l'emoji sélectionné */}
                </div>
                <div className="profile-title">
                    <h3>{formData.name || 'Cycliste Inconnu'}</h3>
                    <p className="subtitle">Pilote principal</p>
                </div>
            </div>

            {message && <div className={`message-box ${message.type}`}>{message.text}</div>}

            <div className="profile-layout">
                {/* COLONNE GAUCHE : FORMULAIRE */}
                <form onSubmit={handleSave} className="profile-form">
                    <div className="form-section glass-panel">
                        <h4>Identité & Physique</h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Pseudo</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Date naissance</label>
                                <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Poids (kg)</label>
                                <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Taille (cm)</label>
                                <input type="number" name="height" value={formData.height} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    <div className="form-section glass-panel">
                        <h4>Performances</h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>FTP (Watts)</label>
                                <input type="number" name="ftp" value={formData.ftp} onChange={handleChange} placeholder="Ex: 250" />
                            </div>
                            <div className="form-group">
                                <label>FC Max (bpm)</label>
                                <input type="number" name="max_hr" value={formData.max_hr} onChange={handleChange} placeholder="Ex: 190" />
                            </div>
                            <div className="form-group">
                                <label>FC Repos</label>
                                <input type="number" name="resting_hr" value={formData.resting_hr} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="primary-btn save-btn" disabled={saving}>
                            {saving ? '...' : 'Sauvegarder'}
                        </button>
                    </div>
                </form>

                {/* COLONNE DROITE : ZONES (Affichage dynamique) */}
                <div className="zones-column">
                    <div className="form-section glass-panel">
                        <h4>Zones de Puissance (Watts)</h4>
                        {renderPowerZones()}
                    </div>

                    <div className="form-section glass-panel">
                        <h4>Zones Cardiaques (BPM)</h4>
                        {renderHrZones()}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;