import React, { useState, useEffect } from 'react';
import { authService, supabase } from '../../services/api';
import { stravaService } from '../../services/stravaService'; 
import ProfilePage from './ProfilePage';
import './SettingsPage.css';

function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [stravaStatus, setStravaStatus] = useState('loading');

    useEffect(() => {
        if (activeTab === 'integrations') {
            checkStravaStatus();
        }
    }, [activeTab]);

    const checkStravaStatus = async () => {
        try {
            setStravaStatus('loading');
            
            // 1. On récupère le profil (car c'est lui qui détient le lien Strava)
            const profile = await authService.getMyProfile();
            
            if (!profile) {
                setStravaStatus('disconnected');
                return;
            }

            // 2. On cherche l'intégration avec le bon profile_id
            const { data, error } = await supabase
                .from('profile_integrations')
                .select('*')
                .eq('profile_id', profile.id) // <-- C'est ici que ça change (profile.id au lieu de user.id)
                .eq('provider', 'strava')
                .single();

            if (data) {
                setStravaStatus('connected');
            } else {
                setStravaStatus('disconnected');
            }
        } catch (e) {
            console.error("Erreur vérification Strava:", e);
            setStravaStatus('disconnected');
        }
    };

    const handleLogout = async () => {
        await authService.signOut();
        window.location.href = '/';
    };

    return (
        <div className="settings-page">
            <h2 style={{ marginBottom: '20px' }}>Paramètres</h2>

            <div className="settings-tabs" style={{ display:'flex', gap:'10px', marginBottom:'20px' }}>
                <button 
                    className={activeTab === 'profile' ? 'active-tab btn' : 'btn'} 
                    onClick={() => setActiveTab('profile')}
                    style={{ 
                        padding: '10px 20px', 
                        cursor:'pointer', 
                        background: activeTab==='profile' ? 'var(--neon-blue)' : 'rgba(255,255,255,0.1)', 
                        color: 'white', 
                        border:'none', 
                        borderRadius:'6px'
                    }}
                >
                    Mon Profil
                </button>
                <button 
                    className={activeTab === 'integrations' ? 'active-tab btn' : 'btn'} 
                    onClick={() => setActiveTab('integrations')}
                    style={{ 
                        padding: '10px 20px', 
                        cursor:'pointer', 
                        background: activeTab==='integrations' ? 'var(--neon-blue)' : 'rgba(255,255,255,0.1)', 
                        color: 'white', 
                        border:'none', 
                        borderRadius:'6px'
                    }}
                >
                    Intégrations
                </button>
            </div>

            <div className="settings-content" style={{ padding:'20px', borderRadius:'8px', minHeight:'300px' }}>
                {activeTab === 'profile' && <ProfilePage />}
                
                {activeTab === 'integrations' && (
                    <div className="integrations">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0', color: '#fc4c02' }}>Strava</h3>
                                <p style={{ margin: 0, fontSize: '0.9em', color: '#ccc' }}>
                                    {stravaStatus === 'loading' ? 'Vérification...' : 
                                     stravaStatus === 'connected' ? '✅ Compte relié et synchronisé' : '❌ Aucun compte relié'}
                                </p>
                            </div>
                            
                            <div>
                                {stravaStatus === 'disconnected' && (
                                    <button 
                                        onClick={() => stravaService.initiateAuth()} 
                                        style={{ background:'#fc4c02', color:'white', border:'none', padding:'10px 15px', borderRadius:'5px', cursor:'pointer', fontWeight: 'bold' }}
                                    >
                                        Connecter
                                    </button>
                                )}
                                {stravaStatus === 'connected' && (
                                    <button 
                                        onClick={() => stravaService.disconnect().then(checkStravaStatus)} 
                                        style={{ background:'transparent', border:'1px solid #fc4c02', color:'#fc4c02', padding:'8px 12px', borderRadius:'5px', cursor:'pointer' }}
                                    >
                                        Déconnecter
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}

export default SettingsPage;