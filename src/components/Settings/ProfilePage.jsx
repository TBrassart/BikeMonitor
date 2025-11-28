import React, { useState, useEffect } from 'react';
import { authService, shopService } from '../../services/api';
import { FaTimes, FaSave } from 'react-icons/fa';
import './ProfilePage.css';

function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // Pour l'affichage seulement (badges équipés)
    const [activeItems, setActiveItems] = useState({ badge: null, title: null });

    const [avatar, setAvatar] = useState('🚲');
    const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);
    const defaultAvatars = ['🚴‍♂️', '🏔️', '⚡', '🚀', '💡', '🦁', '🐺', '🦊', '🐻', '🏁', '⚙️', '🛠️', '💧', '🌡️', '💀', '👽', '🤖'];

    const [formData, setFormData] = useState({
        name: '', 
        gender: 'notsay', // NOUVEAU CHAMP
        height: '', 
        weight: '', 
        ftp: '', 
        max_hr: '', 
        resting_hr: '', 
        birth_date: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [profile, inv] = await Promise.all([
                authService.getMyProfile(),
                shopService.getInventory()
            ]);
            
            if (profile) {
                setFormData({
                    name: profile.name || '',
                    gender: profile.gender || 'notsay', // Chargement du sexe
                    height: profile.height || '',
                    weight: profile.weight || '',
                    ftp: profile.ftp || '',
                    max_hr: profile.max_hr || '',
                    resting_hr: profile.resting_hr || '',
                    birth_date: profile.birth_date || ''
                });
                setAvatar(profile.avatar || '🚲');
            }

            if (inv) {
                const equipped = { badge: null, title: null };
                inv.forEach(i => {
                    if (i.is_equipped && i.shop_items) equipped[i.shop_items.type] = i.shop_items;
                });
                setActiveItems(equipped);
            }
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAvatarSelect = (newAvatar) => {
        setAvatar(newAvatar);
        setIsSelectingAvatar(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            await authService.updateProfile({
                ...formData,
                height: formData.height ? parseInt(formData.height) : null,
                weight: formData.weight ? parseFloat(formData.weight) : null,
                ftp: formData.ftp ? parseInt(formData.ftp) : null,
                max_hr: formData.max_hr ? parseInt(formData.max_hr) : null,
                resting_hr: formData.resting_hr ? parseInt(formData.resting_hr) : null,
                avatar: avatar
            });
            setMessage({ type: 'success', text: 'Profil mis à jour ! ✅' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Erreur sauvegarde.' });
        } finally {
            setSaving(false);
        }
    };

    // --- CALCUL DES ZONES (RÉTABLI) ---
    
    const renderPowerZones = () => {
        const ftp = parseInt(formData.ftp);
        if (!ftp) return <p className="empty-text">Renseigne ta FTP pour voir les zones.</p>;

        const zones = [
            { name: 'Z1 Récup', range: `< ${Math.round(ftp * 0.55)}`, color: '#9ca3af' },
            { name: 'Z2 Endurance', range: `${Math.round(ftp * 0.56)} - ${Math.round(ftp * 0.75)}`, color: '#3b82f6' },
            { name: 'Z3 Tempo', range: `${Math.round(ftp * 0.76)} - ${Math.round(ftp * 0.90)}`, color: '#10b981' },
            { name: 'Z4 Seuil', range: `${Math.round(ftp * 0.91)} - ${Math.round(ftp * 1.05)}`, color: '#f59e0b' },
            { name: 'Z5 VO2 Max', range: `${Math.round(ftp * 1.06)} - ${Math.round(ftp * 1.20)}`, color: '#ef4444' },
            { name: 'Z6 Anaérobie', range: `> ${Math.round(ftp * 1.21)}`, color: '#7c3aed' },
        ];

        return (
            <div className="zones-list">
                {zones.map((z, i) => (
                    <div key={i} className="zone-item" style={{ borderLeft: `4px solid ${z.color}` }}>
                        <span className="zone-name">{z.name}</span>
                        <span className="zone-value">{z.range} W</span>
                    </div>
                ))}
            </div>
        );
    };

    const renderHrZones = () => {
        const max = parseInt(formData.max_hr);
        if (!max) return <p className="empty-text">Renseigne ta FC Max pour voir les zones.</p>;

        const zones = [
            { name: 'Z1 Endurance', range: `< ${Math.round(max * 0.60)}`, color: '#9ca3af' },
            { name: 'Z2 Modéré', range: `${Math.round(max * 0.61)} - ${Math.round(max * 0.70)}`, color: '#3b82f6' },
            { name: 'Z3 Tempo', range: `${Math.round(max * 0.71)} - ${Math.round(max * 0.80)}`, color: '#10b981' },
            { name: 'Z4 Seuil', range: `${Math.round(max * 0.81)} - ${Math.round(max * 0.90)}`, color: '#f59e0b' },
            { name: 'Z5 Max', range: `> ${Math.round(max * 0.91)}`, color: '#ef4444' },
        ];

        return (
            <div className="zones-list">
                {zones.map((z, i) => (
                    <div key={i} className="zone-item" style={{ borderLeft: `4px solid ${z.color}` }}>
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
            {isSelectingAvatar && (
                <div className="avatar-selection-overlay" onClick={() => setIsSelectingAvatar(false)}>
                    <div className="avatar-selection-modal glass-panel" onClick={e => e.stopPropagation()}>
                        <div className="selection-header"><h4>Choisir un avatar</h4><button onClick={() => setIsSelectingAvatar(false)}><FaTimes /></button></div>
                        <div className="avatar-selection-grid">
                            {defaultAvatars.map((emo, index) => (
                                <div key={index} className={`avatar-option ${emo === avatar ? 'active' : ''}`} onClick={() => handleAvatarSelect(emo)}>{emo}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="profile-header glass-panel">
                <div 
                    className="profile-avatar-large clickable"
                    onClick={() => setIsSelectingAvatar(true)}
                >
                    {avatar}
                </div>
                <div className="profile-title">
                    <h3>
                        {formData.name || 'Cycliste'} 
                        {activeItems.badge && <span className="equipped-badge" title={activeItems.badge.name}>{activeItems.badge.asset_data.icon}</span>}
                    </h3>
                    <p className="subtitle">
                        {activeItems.title ? <span className="equipped-title">{activeItems.title.name}</span> : "Pilote"}
                    </p>
                </div>
            </div>

            <div className="profile-layout">
                <form onSubmit={handleSave} className="form-section glass-panel">
                    <h4>Données Physiques</h4>
                    <div className="form-grid">
                        {/* NOUVEAU CHAMP SEXE */}
                        <div className="form-group">
                            <label>Sexe</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} className="neon-select">
                                <option value="notsay">Non précisé</option>
                                <option value="male">Homme</option>
                                <option value="female">Femme</option>
                            </select>
                        </div>
                        <div className="form-group"><label>Poids (kg)</label><input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} /></div>
                        <div className="form-group"><label>Taille (cm)</label><input type="number" name="height" value={formData.height} onChange={handleChange} /></div>
                        <div className="form-group"><label>FTP (W)</label><input type="number" name="ftp" value={formData.ftp} onChange={handleChange} /></div>
                        <div className="form-group"><label>FC Max</label><input type="number" name="max_hr" value={formData.max_hr} onChange={handleChange} /></div>
                        <div className="form-group"><label>FC Repos</label><input type="number" name="resting_hr" value={formData.resting_hr} onChange={handleChange} /></div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="primary-btn save-btn" disabled={saving}>
                            {saving ? '...' : <><FaSave /> Sauvegarder</>}
                        </button>
                    </div>
                </form>

                <div className="zones-column">
                    {message && <div className={`message-box ${message.type}`}>{message.text}</div>}
                    <div className="form-section glass-panel">
                        <h4>Zones de Puissance</h4>
                        {renderPowerZones()}
                    </div>
                    <div className="form-section glass-panel">
                        <h4>Zones Cardiaques</h4>
                        {renderHrZones()}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;