import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaStrava, FaSync, FaCheckCircle, FaUsers, FaLink, FaCopy, FaCheck, FaTrash, FaUserCircle } from 'react-icons/fa';
import { stravaService } from '../../services/stravaService';
import { authService } from '../../services/api'; 
import '../Bike/BikeForm.css'; 
import './SettingsPage.css';

const SettingsPage = ({ currentProfile, onSyncComplete }) => {
    // --- GESTION DES ONGLETS ---
    const [activeTab, setActiveTab] = useState('integrations');
    
    // --- ETATS STRAVA ---
    const [stravaStatus, setStravaStatus] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const effectRan = useRef(false);

    // --- ETATS FAMILLE ---
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [familyMembers, setFamilyMembers] = useState([]); // Liste des membres

    // --- EFFET : CHARGEMENT DONNÉES FAMILLE ---
    useEffect(() => {
        // On ne charge la liste que si on est sur l'onglet famille
        if (activeTab === 'family') {
            authService.getFamilyMembers().then(setFamilyMembers).catch(console.error);
        }
    }, [activeTab]);

    // --- LOGIQUE STRAVA ---
    useEffect(() => {
        if (!currentProfile) return;
        if (effectRan.current === true) return;

        const checkStatusAndHandleCallback = async () => {
            const code = searchParams.get('code');
            if (code) {
                setActiveTab('integrations');
                console.log("Code Strava détecté :", code);
                setIsSyncing(true);
                try {
                    await stravaService.handleAuthCallback(code, currentProfile.id);
                    setStravaStatus(true);
                    const syncRes = await stravaService.syncActivities(currentProfile.id);
                    
                    if (onSyncComplete) await onSyncComplete();
                    
                    alert(`Connexion réussie ! ${syncRes.added} activités importées.`);
                    navigate('/settings/', { replace: true });
                } catch (e) {
                    console.error("Erreur échange token :", e);
                    alert("Erreur connexion Strava : " + e.message);
                } finally {
                    setIsSyncing(false);
                }
            } else {
                try {
                    const isConnected = await stravaService.getIntegrationStatus(currentProfile.id);
                    setStravaStatus(isConnected);
                } catch (e) {
                    console.error("Erreur vérification statut", e);
                }
            }
        };
        checkStatusAndHandleCallback();
        return () => { effectRan.current = true };
    }, [currentProfile, searchParams, navigate, onSyncComplete]);

    const handleConnect = () => { stravaService.initiateAuth(); };

    const handleSyncNow = async () => {
        setIsSyncing(true);
        setSyncResult(null);
        try {
            const result = await stravaService.syncActivities(currentProfile.id);
            setSyncResult(result);
            if (onSyncComplete) await onSyncComplete();
        } catch (e) {
            console.error(e);
            alert("Erreur synchro : " + e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    // --- LOGIQUE FAMILLE ---
    const generateLink = async () => {
        try {
            const link = await authService.createInvitation();
            setInviteLink(link);
            setCopied(false);
        } catch (e) {
            alert("Erreur lors de la création du lien");
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const handleRemoveMember = async (memberId) => {
        if(window.confirm("Retirer ce membre de la famille ? Il ne verra plus vos vélos.")) {
            try {
                await authService.removeFamilyMember(memberId);
                // Mise à jour locale de la liste
                setFamilyMembers(prev => prev.filter(m => m.id !== memberId));
            } catch (e) {
                alert("Erreur lors de la suppression du membre.");
            }
        }
    };

    if (!currentProfile) return <div className="settings-container"><p>Veuillez sélectionner un profil.</p></div>;

    return (
        <div className="settings-container">
            <header className="page-header">
                <h1>Paramètres</h1>
            </header>

            <div className="settings-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'integrations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('integrations')}
                >
                    <FaStrava /> Intégrations
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'family' ? 'active' : ''}`}
                    onClick={() => setActiveTab('family')}
                >
                    <FaUsers /> Famille
                </button>
            </div>

            <div className="settings-content">
                
                {/* --- ONGLET STRAVA --- */}
                {activeTab === 'integrations' && (
                    <div className="integration-list">
                        <div className={`integration-card strava-card ${stravaStatus ? 'active' : ''}`}>
                            <div className="card-top">
                                <FaStrava className="strava-logo" />
                                <div className="card-info">
                                    <h3>Strava</h3>
                                    <p>{stravaStatus ? "Compte connecté et actif" : "Connecte ton compte pour importer tes sorties"}</p>
                                </div>
                                {stravaStatus && <FaCheckCircle className="status-icon connected" />}
                            </div>

                            <div className="card-actions">
                                {!stravaStatus ? (
                                    <button className="connect-btn" onClick={handleConnect} disabled={isSyncing}>
                                        {isSyncing ? 'Connexion...' : 'Connecter Strava'}
                                    </button>
                                ) : (
                                    <button className="sync-btn" onClick={handleSyncNow} disabled={isSyncing}>
                                        <FaSync className={isSyncing ? 'spin' : ''} /> 
                                        {isSyncing ? ' Synchronisation...' : ' Forcer la synchronisation'}
                                    </button>
                                )}
                            </div>

                            {syncResult && (
                                <div className="sync-result">
                                    <h4>Rapport de synchro</h4>
                                    <p>Activités récupérées : {syncResult.totalFetched}</p>
                                    <p>Nouvelles importées : <strong>+{syncResult.added}</strong></p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- ONGLET FAMILLE --- */}
                {activeTab === 'family' && (
                    <div className="family-invite-card">
                        <h3>Inviter un membre</h3>
                        <p>Partage ce lien avec ton conjoint ou tes enfants pour qu'ils rejoignent ton garage.</p>
                        
                        <div className="invite-action-area">
                            {!inviteLink ? (
                                <button className="save-btn" onClick={generateLink}>
                                    <FaLink /> Générer un lien d'invitation
                                </button>
                            ) : (
                                <div className="link-display">
                                    <input type="text" value={inviteLink} readOnly />
                                    <button className="copy-btn" onClick={copyToClipboard}>
                                        {copied ? <FaCheck /> : <FaCopy />}
                                    </button>
                                </div>
                            )}
                        </div>
                        {inviteLink && <p className="hint">Ce lien permet de créer un compte lié à votre famille.</p>}

                        {/* LISTE DES MEMBRES */}
                        {familyMembers.length > 0 && (
                            <div className="family-list-section" style={{marginTop: '40px', textAlign:'left', borderTop:'1px solid #444', paddingTop:'20px'}}>
                                <h4 style={{color:'white', marginBottom:'15px'}}>Membres actifs ({familyMembers.length})</h4>
                                <div className="members-grid" style={{display:'grid', gap:'10px'}}>
                                    {familyMembers.map(member => (
                                        <div key={member.id} style={{background:'#12121e', padding:'10px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                <span style={{fontSize:'1.2rem'}}>{member.avatar || <FaUserCircle />}</span>
                                                <span style={{color:'white', fontWeight:'bold'}}>{member.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveMember(member.id)}
                                                style={{background:'none', border:'none', color:'#666', cursor:'pointer'}}
                                                title="Retirer de la famille"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;