import React, { useState, useEffect } from 'react';
import { authService, shopService } from '../../services/api';
import { FaTimes, FaSave, FaInfoCircle, FaUserAstronaut, FaShieldAlt, FaMobileAlt, FaTrash, FaCheckCircle } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import './ProfilePage.css';

function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);
    const [showFtpInfo, setShowFtpInfo] = useState(false); // Modale FTP

    // Pour l'affichage seulement (badges équipés)
    const [activeItems, setActiveItems] = useState({ badge: null, title: null, frame: null });
    const [avatar, setAvatar] = useState('🚲');
    const defaultAvatars = ['🚴‍♂️', '🏔️', '⚡', '🚀', '💡', '🦁', '🐺', '🦊', '🐻', '🏁', '⚙️', '🛠️', '💧', '🌡️', '💀', '👽', '🤖'];

    // États MFA
    const [mfaFactors, setMfaFactors] = useState([]);
    const [isMfaSetup, setIsMfaSetup] = useState(false);
    const [enrollData, setEnrollData] = useState(null);
    const [verifyCode, setVerifyCode] = useState('');

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

    // On garde l'email original pour savoir s'il a changé
    const [originalEmail, setOriginalEmail] = useState('');

    useEffect(() => {
        loadData();
        loadMfaStatus();
    }, []);

    const loadMfaStatus = async () => {
        try {
            const factors = await authService.listMfaFactors();
            const active = factors.find(f => f.factor_type === 'totp' && f.status === 'verified');
            setMfaFactors(factors);
            setIsMfaSetup(!!active);
        } catch (e) { console.error("MFA check failed", e); }
    };

    const handleStartMfa = async () => {
        try {
            const data = await authService.enrollMfa();
            setEnrollData(data);
        } catch (e) { alert("Erreur init MFA"); }
    };

    const handleVerifyMfa = async () => {
        try {
            await authService.challengeAndVerifyMfa(enrollData.id, verifyCode);
            alert("✅ Sécurité maximale activée !");
            setEnrollData(null);
            setVerifyCode('');
            loadMfaStatus();
        } catch (e) { alert("Code incorrect."); }
    };

    const handleDisableMfa = async () => {
        if (!window.confirm("Désactiver la double authentification ?")) return;
        try {
            const factor = mfaFactors.find(f => f.factor_type === 'totp' && f.status === 'verified');
            if (factor) await authService.unenrollMfa(factor.id);
            setIsMfaSetup(false);
            loadMfaStatus();
        } catch (e) { alert("Erreur désactivation"); }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [user, profile, inv] = await Promise.all([
                authService.getCurrentUser(),
                authService.getMyProfile(),
                shopService.getInventory()
            ]);
            
            if (profile) {
                setFormData({
                    email: user?.email || '',
                    name: profile.name || '',
                    gender: profile.gender || 'notsay',
                    height: profile.height || '',
                    weight: profile.weight || '',
                    ftp: profile.ftp || '',
                    max_hr: profile.max_hr || '',
                    resting_hr: profile.resting_hr || '',
                    birth_date: profile.birth_date || ''
                });
                setOriginalEmail(user?.email || '');
                setAvatar(profile.avatar || '🚲');
            }

            if (inv) {
                const equipped = { badge: null, title: null, frame: null };
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
            // 1. Mise à jour du Profil Public
            await authService.updateProfile({
                name: formData.name,
                gender: formData.gender,
                height: formData.height ? parseInt(formData.height) : null,
                weight: formData.weight ? parseFloat(formData.weight) : null,
                ftp: formData.ftp ? parseInt(formData.ftp) : null,
                max_hr: formData.max_hr ? parseInt(formData.max_hr) : null,
                resting_hr: formData.resting_hr ? parseInt(formData.resting_hr) : null,
                birth_date: formData.birth_date || null,
                avatar: avatar
            });

            // 2. Mise à jour de l'Email (Si changé)
            if (formData.email !== originalEmail) {
                await authService.updateUserEmail(formData.email);
                setMessage({ type: 'success', text: 'Profil enregistré ! Un lien de confirmation a été envoyé à votre nouvelle adresse email.' });
                setOriginalEmail(formData.email);
            } else {
                setMessage({ type: 'success', text: 'Profil mis à jour avec succès ! ✅' });
            }

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

            {/* MODALE INFO FTP */}
            {showFtpInfo && (
                <div className="modal-overlay" onClick={() => setShowFtpInfo(false)}>
                    <div className="glass-panel modal-content ftp-info-modal" onClick={e => e.stopPropagation()}>
                        <div className="selection-header">
                            <h4>Comment déterminer sa FTP ?</h4>
                            <button onClick={() => setShowFtpInfo(false)}><FaTimes /></button>
                        </div>
                        <div className="ftp-content">
                            <p>La <strong>FTP (Functional Threshold Power)</strong> est la puissance maximale que vous pouvez tenir pendant 1 heure.</p>
                            
                            <h5>Le Test des 20 minutes (Standard)</h5>
                            <ol>
                                <li>Échauffement de 20 min (progressif).</li>
                                <li>3 déblocages de 1 min à haute cadence (100rpm).</li>
                                <li>5 min de récupération cool.</li>
                                <li><strong>L'EFFORT :</strong> Roulez à fond, le plus régulier possible, pendant <strong>20 minutes</strong>.</li>
                                <li>Récupération 10-15 min.</li>
                            </ol>
                            
                            <div className="ftp-calc-box">
                                <span>FTP = Puissance Moyenne sur 20 min × 0.95</span>
                            </div>
                            
                            <p className="ftp-note">Note : Si vous utilisez Zwift ou un compteur Garmin, ils peuvent calculer votre FTP automatiquement lors d'un test guidé.</p>
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
                {/* FORMULAIRE */}
                    <form onSubmit={handleSave} className="form-section glass-panel">
                        <h4>Identité & Physique</h4>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} />
                            </div>
                            <div className="form-group"><label>Pseudo</label><input type="text" name="name" value={formData.name} onChange={handleChange} /></div>
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
                        </div>

                        <h4 style={{marginTop: '20px'}}>Performances</h4>
                        <div className="form-grid">
                            <div className="form-group"><label>FTP (Watts)</label><input type="number" name="ftp" value={formData.ftp} onChange={handleChange} /></div>
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
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h4>Zones de Puissance</h4>
                            <button type="button" className="info-btn" onClick={() => setShowFtpInfo(true)}><FaInfoCircle /></button>
                        </div>
                        {renderPowerZones()}
                    </div>
                    <div className="form-section glass-panel">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h4>Zones Cardiaques</h4>
                        </div>
                        {renderHrZones()}
                    </div>
                </div>
                {/* SECTION SÉCURITÉ */}
                <div className="form-section glass-panel full-width" style={{marginTop:'20px'}}>
                    <h4><FaShieldAlt /> Sécurité</h4>
                    
                    {isMfaSetup ? (
                        <div className="mfa-active-box">
                            <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                <FaCheckCircle style={{color:'var(--neon-green)', fontSize:'2rem'}} />
                                <div>
                                    <strong style={{color:'white'}}>2FA Activée</strong>
                                    <p style={{margin:0, fontSize:'0.8rem', color:'#aaa'}}>Votre compte est blindé.</p>
                                </div>
                            </div>
                            <button onClick={handleDisableMfa} className="secondary-btn" style={{borderColor:'#ef4444', color:'#ef4444'}}>
                                <FaTrash /> Désactiver
                            </button>
                        </div>
                    ) : (
                        <div className="mfa-setup-box">
                            {!enrollData ? (
                                <div style={{textAlign:'center', padding:'20px'}}>
                                    <p style={{color:'#ccc', marginBottom:'15px'}}>Protégez votre compte avec Google Authenticator.</p>
                                    <button onClick={handleStartMfa} className="primary-btn"><FaMobileAlt /> Activer la 2FA</button>
                                </div>
                            ) : (
                                <div className="mfa-qr-step" style={{display:'flex', gap:'30px', alignItems:'center', padding:'20px', background:'rgba(0,0,0,0.3)', borderRadius:'12px'}}>
                                    <div style={{background:'white', padding:'10px', borderRadius:'8px'}}>
                                        <QRCodeSVG value={enrollData.totp.uri} size={140} />
                                    </div>
                                    <div style={{flex:1}}>
                                        <h5 style={{margin:'0 0 10px 0', color:'white'}}>Scannez & Validez</h5>
                                        <div style={{display:'flex', gap:'10px'}}>
                                            <input 
                                                type="text" placeholder="123456" maxLength={6}
                                                value={verifyCode} onChange={e => setVerifyCode(e.target.value)}
                                                style={{width:'100px', textAlign:'center', letterSpacing:'3px', fontWeight:'bold', fontSize:'1.2rem', background:'rgba(0,0,0,0.5)', border:'1px solid #555', color:'white', borderRadius:'6px'}}
                                            />
                                            <button onClick={handleVerifyMfa} className="primary-btn">OK</button>
                                        </div>
                                        <button onClick={() => setEnrollData(null)} style={{background:'none', border:'none', color:'#888', marginTop:'10px', cursor:'pointer', textDecoration:'underline'}}>Annuler</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;