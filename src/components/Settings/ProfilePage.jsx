import React, { useState, useEffect } from 'react';
import { authService, shopService } from '../../services/api';
import { FaTimes, FaMagic, FaIdBadge, FaCrown, FaUserAstronaut, FaSave } from 'react-icons/fa';
import './ProfilePage.css';

function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // Données
    const [inventory, setInventory] = useState([]);
    const [activeItems, setActiveItems] = useState({ frame: null, badge: null, title: null });

    // Avatar
    const [avatar, setAvatar] = useState('🚲');
    const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);
    const defaultAvatars = ['🚴‍♂️', '🏔️', '⚡', '🚀', '💡', '🦁', '🐺', '🦊', '🐻', '🏁', '⚙️', '🛠️', '💧', '🌡️', '💀', '👽', '🤖'];

    // Formulaire Physique
    const [formData, setFormData] = useState({
        name: '', height: '', weight: '', ftp: '', max_hr: '', resting_hr: '', birth_date: ''
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
                    name: profile.name || '', height: profile.height || '', weight: profile.weight || '',
                    ftp: profile.ftp || '', max_hr: profile.max_hr || '', resting_hr: profile.resting_hr || '',
                    birth_date: profile.birth_date || ''
                });
                setAvatar(profile.avatar || '🚲');
            }

            if (inv) {
                setInventory(inv);
                // Trouver les items équipés
                const equipped = { frame: null, badge: null, title: null };
                inv.forEach(i => {
                    if (i.is_equipped && i.shop_items) {
                        equipped[i.shop_items.type] = i.shop_items;
                    }
                });
                setActiveItems(equipped);
            }

        } catch (e) {
            console.error("Erreur profil", e);
        } finally {
            setLoading(false);
        }
    };

    // --- GESTION INVENTAIRE ---
    const handleEquip = async (invItem) => {
        try {
            // Appel API pour équiper
            await shopService.equip(invItem.id, invItem.shop_items.type);
            
            // Mise à jour locale pour effet immédiat
            const newActive = { ...activeItems, [invItem.shop_items.type]: invItem.shop_items };
            setActiveItems(newActive);
            
            // Refresh complet pour être sûr
            loadData();
        } catch (e) { alert("Erreur équipement"); }
    };

    // --- GESTION FORMULAIRE ---
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

    if (loading) return <div className="loading-state">Chargement de ton profil...</div>;

    // Filtrer l'inventaire par type pour l'affichage
    const frames = inventory.filter(i => i.shop_items.type === 'frame');
    const badges = inventory.filter(i => i.shop_items.type === 'badge');
    const titles = inventory.filter(i => i.shop_items.type === 'title');

    return (
        <div className="profile-page">
            {/* --- MODALE AVATAR --- */}
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

            {/* --- HEADER : IDENTITÉ VISUELLE --- */}
            <div className="profile-header glass-panel">
                {/* Avatar avec Cadre Équipé */}
                <div 
                    className="profile-avatar-large clickable"
                    onClick={() => setIsSelectingAvatar(true)}
                    style={{
                        border: activeItems.frame ? `4px solid ${activeItems.frame.asset_data.border}` : '4px solid rgba(255,255,255,0.1)',
                        boxShadow: activeItems.frame ? `0 0 20px ${activeItems.frame.asset_data.border}` : 'none'
                    }}
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
                
                {/* --- COLONNE GAUCHE : CUSTOMISATION --- */}
                <div className="left-column">
                    
                    {/* CASIER (INVENTAIRE) */}
                    <div className="form-section glass-panel locker-section">
                        <h4><FaUserAstronaut /> Mon Casier</h4>
                        
                        {/* Sélecteur de Titres */}
                        <div className="locker-group">
                            <label>Titre</label>
                            <div className="locker-grid">
                                {titles.length === 0 && <small className="empty-locker">Aucun titre. Va à la boutique !</small>}
                                {titles.map(inv => (
                                    <button 
                                        key={inv.id} 
                                        className={`locker-item ${inv.is_equipped ? 'active' : ''}`}
                                        onClick={() => handleEquip(inv)}
                                    >
                                        {inv.shop_items.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sélecteur de Badges */}
                        <div className="locker-group">
                            <label>Badge</label>
                            <div className="locker-grid">
                                {badges.length === 0 && <small className="empty-locker">Aucun badge.</small>}
                                {badges.map(inv => (
                                    <button 
                                        key={inv.id} 
                                        className={`locker-item ${inv.is_equipped ? 'active' : ''}`}
                                        onClick={() => handleEquip(inv)}
                                    >
                                        {inv.shop_items.asset_data.icon} {inv.shop_items.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sélecteur de Cadres */}
                        <div className="locker-group">
                            <label>Cadre Avatar</label>
                            <div className="locker-grid">
                                {frames.length === 0 && <small className="empty-locker">Aucun cadre.</small>}
                                {frames.map(inv => (
                                    <button 
                                        key={inv.id} 
                                        className={`locker-item ${inv.is_equipped ? 'active' : ''}`}
                                        onClick={() => handleEquip(inv)}
                                        style={{borderColor: inv.shop_items.asset_data.border}}
                                    >
                                        {inv.shop_items.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* PHYSIQUE */}
                    <form onSubmit={handleSave} className="form-section glass-panel">
                        <h4>Physiologie</h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Poids (kg)</label>
                                <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Taille (cm)</label>
                                <input type="number" name="height" value={formData.height} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>FTP (Watts)</label>
                                <input type="number" name="ftp" value={formData.ftp} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>FC Max</label>
                                <input type="number" name="max_hr" value={formData.max_hr} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="primary-btn save-btn" disabled={saving}>
                                {saving ? '...' : <><FaSave /> Sauvegarder</>}
                            </button>
                        </div>
                    </form>
                </div>

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
