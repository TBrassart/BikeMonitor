import React, { useState, useEffect } from 'react';
import { authService, supabase } from '../../services/api';
import { stravaService } from '../../services/stravaService'; 
import ProfilePage from './ProfilePage';
import InventoryPage from './InventoryPage'; // Nouvel import
import { FaSync, FaCheck, FaUnlink, FaLink } from 'react-icons/fa';
import './SettingsPage.css';

function SettingsPage() {
    // 'profile' | 'inventory' | 'integrations'
    const [activeTab, setActiveTab] = useState('profile');
    
    const [stravaStatus, setStravaStatus] = useState('loading');
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        if (activeTab === 'integrations') {
            checkStravaStatus();
        }
    }, [activeTab]);

    const checkStravaStatus = async () => {
        try {
            setStravaStatus('loading');
            const profile = await authService.getMyProfile();
            if (!profile) {
                setStravaStatus('disconnected');
                return;
            }
            const { data } = await supabase
                .from('profile_integrations')
                .select('*')
                .eq('profile_id', profile.id)
                .eq('provider', 'strava')
                .single();

            setStravaStatus(data ? 'connected' : 'disconnected');
        } catch (e) {
            setStravaStatus('disconnected');
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const result = await stravaService.syncActivities();
            alert(`Synchronisation terminée !\n${result.added} nouvelles activités ajoutées.`);
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la synchronisation.");
        } finally {
            setSyncing(false);
        }
    };

    const handleLogout = async () => {
        if(window.confirm("Se déconnecter ?")) {
            await authService.signOut();
            window.location.href = '/';
        }
    };

    return (
        <div className="settings-page">
            <h2 className="gradient-text" style={{ marginBottom: '20px' }}>Paramètres</h2>

            {/* BARRE D'ONGLETS */}
            <div className="settings-tabs" style={{ display:'flex', gap:'15px', marginBottom:'25px', overflowX:'auto', paddingBottom:'5px' }}>
                <button 
                    onClick={() => setActiveTab('profile')}
                    className={activeTab === 'profile' ? 'primary-btn' : 'secondary-btn'}
                    style={{ borderRadius: '50px', padding: '10px 20px', whiteSpace:'nowrap' }}
                >
                    Profil
                </button>
                
                <button 
                    onClick={() => setActiveTab('inventory')}
                    className={activeTab === 'inventory' ? 'primary-btn' : 'secondary-btn'}
                    style={{ borderRadius: '50px', padding: '10px 20px', whiteSpace:'nowrap' }}
                >
                    Inventaire
                </button>
                
                <button 
                    onClick={() => setActiveTab('integrations')}
                    className={activeTab === 'integrations' ? 'primary-btn' : 'secondary-btn'}
                    style={{ borderRadius: '50px', padding: '10px 20px', whiteSpace:'nowrap' }}
                >
                    Intégrations
                </button>
            </div>

            {/* CONTENU */}
            <div className="settings-content glass-panel" style={{ padding:'20px', borderRadius:'16px', minHeight:'400px' }}>
                
                {activeTab === 'profile' && <ProfilePage />}
                
                {activeTab === 'inventory' && <InventoryPage />}
                
                {activeTab === 'integrations' && (
                    <div className="integrations">
                        <div className="integration-card glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background:'rgba(255,255,255,0.05)' }}>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0', color: '#fc4c02', display:'flex', alignItems:'center', gap:'10px' }}>
                                    Strava {stravaStatus === 'connected' && <FaCheck style={{fontSize:'0.8rem'}}/>}
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.9em', color: '#ccc' }}>
                                    {stravaStatus === 'loading' ? 'Vérification...' : 
                                     stravaStatus === 'connected' ? 'Compte relié. Les vélos seront créés automatiquement.' : 'Liez votre compte pour importer vos sorties.'}
                                </p>
                            </div>
                            
                            <div style={{display:'flex', gap:'10px'}}>
                                {stravaStatus === 'disconnected' && (
                                    <button 
                                        onClick={() => stravaService.initiateAuth()} 
                                        className="primary-btn"
                                        style={{ background:'#fc4c02', display:'flex', alignItems:'center', gap:'8px' }}
                                    >
                                        <FaLink /> Connecter
                                    </button>
                                )}
                                
                                {stravaStatus === 'connected' && (
                                    <>
                                        <button 
                                            onClick={handleSync} 
                                            className="primary-btn"
                                            disabled={syncing}
                                            style={{ background: 'var(--gradient-success)', display:'flex', alignItems:'center', gap:'8px' }}
                                        >
                                            <FaSync className={syncing ? 'spinning' : ''} /> 
                                            <span className="desktop-only">{syncing ? '...' : 'Sync'}</span>
                                        </button>

                                        <button 
                                            onClick={() => stravaService.disconnect().then(checkStravaStatus)} 
                                            className="secondary-btn"
                                            style={{ borderColor:'#fc4c02', color:'#fc4c02' }}
                                            title="Déconnecter"
                                        >
                                            <FaUnlink />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <button onClick={handleLogout} style={{ width:'100%', padding:'15px', background:'rgba(239, 68, 68, 0.1)', color:'#ef4444', border:'1px solid #ef4444', borderRadius:'8px', fontWeight:'bold', cursor:'pointer' }}>
                    Se déconnecter
                </button>
            </div>
        </div>
    );
}

export default SettingsPage;