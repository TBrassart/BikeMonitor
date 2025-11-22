import React, { useState, useEffect } from 'react';
import { FaSave, FaHeartbeat, FaBolt, FaRulerVertical, FaWeight, FaPen, FaUser } from 'react-icons/fa';
import { bikeService } from '../../services/api'; 
import './ProfilePage.css';

const ProfilePage = ({ currentProfile, onProfileUpdate }) => {
    const [formData, setFormData] = useState({
        name: '', // AJOUT du nom
        avatar: '', // AJOUT de l'avatar
        weight: '',
        height: '',
        ftp: '',
        max_hr: '',
        resting_hr: '',
        birth_date: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // Chargement des données
    useEffect(() => {
        if (currentProfile) {
            setFormData({
                name: currentProfile.name || '', // Chargement du nom
                avatar: currentProfile.avatar || '🦄', // Chargement de l'avatar
                weight: currentProfile.weight || '',
                height: currentProfile.height || '',
                ftp: currentProfile.ftp || '',
                max_hr: currentProfile.max_hr || '',
                resting_hr: currentProfile.resting_hr || '',
                birth_date: currentProfile.birth_date || ''
            });
        }
    }, [currentProfile]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Nettoyage des données
            const cleanData = {
                // S'assurer que les champs sont null si vides (pour SQL date/nombre)
                weight: formData.weight || null,
                height: formData.height || null,
                ftp: formData.ftp || null,
                max_hr: formData.max_hr || null,
                resting_hr: formData.resting_hr || null,
                birth_date: formData.birth_date || null,
                // Champs de texte simples
                name: formData.name, 
                avatar: formData.avatar 
            };

            // Appel API pour l'update
            const updated = await bikeService.updateProfileDetails(currentProfile.id, cleanData);
            
            if (onProfileUpdate) onProfileUpdate(updated);
            alert("Profil mis à jour !");
        } catch (error) {
            console.error(error);
            alert("Erreur sauvegarde");
        } finally {
            setIsSaving(false);
        }
    };

    // --- CALCULATEURS ---
    const wkg = (formData.ftp && formData.weight) ? (formData.ftp / formData.weight).toFixed(2) : '-';
    
    // Zones de puissance (Modèle Coggan classique 7 zones)
    const ftp = Number(formData.ftp) || 0;
    const zones = [
        { name: 'Z1 Récupération active', range: `< ${Math.round(ftp * 0.55)}w`, color: '#a0a0a0' }, // Gris
        { name: 'Z2 Endurance', range: `${Math.round(ftp * 0.56)} - ${Math.round(ftp * 0.75)}w`, color: '#3498db' }, // Bleu
        { name: 'Z3 Tempo', range: `${Math.round(ftp * 0.76)} - ${Math.round(ftp * 0.90)}w`, color: '#2ecc71' }, // Vert
        { name: 'Z4 Seuil (Threshold)', range: `${Math.round(ftp * 0.91)} - ${Math.round(ftp * 1.05)}w`, color: '#f1c40f' }, // Jaune
        { name: 'Z5 VO2 Max', range: `${Math.round(ftp * 1.06)} - ${Math.round(ftp * 1.20)}w`, color: '#e67e22' }, // Orange
        { name: 'Z6 Anaérobie', range: `${Math.round(ftp * 1.21)} - ${Math.round(ftp * 1.50)}w`, color: '#e74c3c' }, // Rouge
        { name: 'Z7 Neuromusculaire', range: `> ${Math.round(ftp * 1.50)}w`, color: '#8e44ad' }, // Violet
    ];

    return (
        <div className="profile-page-container">
            <header className="page-header">
                <div className="header-user">
                    {/* AVATAR ÉDITABLE */}
                    <div className="big-avatar" onClick={() => { /* Ouvrir le picker d'avatar */ }}>
                        <input 
                            type="text" 
                            name="avatar" 
                            value={formData.avatar} 
                            onChange={handleChange} 
                            maxLength={2} // Limité aux emojis
                            style={{width: '80px', height: '80px', textAlign: 'center', fontSize: '3rem', background:'none', border:'none', padding:0, cursor:'pointer'}}
                            title="Modifier l'avatar"
                        />
                    </div>
                    <div>
                        {/* NOM ÉDITABLE */}
                        <h1>
                            <input 
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                style={{
                                    fontSize: '2rem', 
                                    background: 'none', 
                                    border: 'none', 
                                    color: 'white', 
                                    padding: '5px 0',
                                    fontWeight: 'bold',
                                    borderBottom: '1px solid #444'
                                }}
                            />
                        </h1>
                        <p>Profil Athlète</p>
                    </div>
                </div>
                
                {/* KPI RAPIDE */}
                <div className="profile-kpi">
                    <div className="kpi-box">
                        <span className="kpi-label">W/kg</span>
                        <span className="kpi-value">{wkg}</span>
                    </div>
                </div>
            </header>

            <div className="profile-grid">
                {/* COLONNE GAUCHE : FORMULAIRE */}
                <form onSubmit={handleSave} className="profile-form-card">
                    <h3>Données Physiques</h3>
                    
                    <div className="form-row">
                        <div className="input-group">
                            <label><FaWeight /> Poids (kg)</label>
                            <input name="weight" type="number" step="0.1" value={formData.weight} onChange={handleChange} placeholder="70" />
                        </div>
                        <div className="input-group">
                            <label><FaRulerVertical /> Taille (cm)</label>
                            <input name="height" type="number" value={formData.height} onChange={handleChange} placeholder="175" />
                        </div>
                    </div>

                    <h3 style={{marginTop: '20px'}}>Performance</h3>
                    
                    <div className="input-group">
                        <label><FaBolt /> FTP (Watts)</label>
                        <input name="ftp" type="number" value={formData.ftp} onChange={handleChange} placeholder="250" style={{borderColor: 'var(--color-neon-primary)'}} />
                        <small>Puissance maintenable sur 1h</small>
                    </div>

                    <div className="form-row">
                        <div className="input-group">
                            <label><FaHeartbeat /> FC Max</label>
                            <input name="max_hr" type="number" value={formData.max_hr} onChange={handleChange} placeholder="190" />
                        </div>
                        <div className="input-group">
                            <label>FC Repos</label>
                            <input name="resting_hr" type="number" value={formData.resting_hr} onChange={handleChange} placeholder="50" />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="save-btn" disabled={isSaving}>
                            {isSaving ? '...' : <><FaSave /> Enregistrer</>}
                        </button>
                    </div>
                </form>

                {/* COLONNE DROITE : ZONES */}
                <div className="zones-card">
                    <h3>Zones de Puissance (FTP: {ftp}w)</h3>
                    {ftp > 0 ? (
                        <div className="zones-list">
                            {zones.map((zone, index) => (
                                <div key={index} className="zone-item">
                                    <div className="zone-color" style={{backgroundColor: zone.color}}>Z{index+1}</div>
                                    <div className="zone-info">
                                        <span className="zone-name">{zone.name}</span>
                                        <span className="zone-watts">{zone.range}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-zones">
                            <p>Renseigne ta FTP pour voir tes zones d'entraînement.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;