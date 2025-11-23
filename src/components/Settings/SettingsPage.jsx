import React, { useState, useEffect } from 'react';
import { authService, supabase } from '../../services/api';
import { stravaService } from '../../services/stravaService'; 
import ProfilePage from './ProfilePage';
import './SettingsPage.css';

function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [stravaStatus, setStravaStatus] = useState('loading');

    useEffect(() => {
        if (activeTab === 'integrations') checkStravaStatus();
    }, [activeTab]);

    const checkStravaStatus = async () => {
        /* ... (Garder votre logique existante ici) ... */
        try {
             const { data: { user } } = await supabase.auth.getUser();
             // ... requête supabase ...
             setStravaStatus('disconnected'); // Placeholder si pas de data
        } catch(e) { console.error(e) }
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
                    style={{ padding: '10px 20px', cursor:'pointer', background: activeTab==='profile'?'#2563eb':'#eee', color: activeTab==='profile'?'white':'black', border:'none', borderRadius:'6px'}}
                >
                    Mon Profil
                </button>
                <button 
                    className={activeTab === 'integrations' ? 'active-tab btn' : 'btn'} 
                    onClick={() => setActiveTab('integrations')}
                    style={{ padding: '10px 20px', cursor:'pointer', background: activeTab==='integrations'?'#2563eb':'#eee', color: activeTab==='integrations'?'white':'black', border:'none', borderRadius:'6px'}}
                >
                    Intégrations
                </button>
            </div>

            <div className="settings-content" style={{ background:'white', padding:'20px', borderRadius:'8px', minHeight:'300px' }}>
                {activeTab === 'profile' && <ProfilePage />}
                
                {activeTab === 'integrations' && (
                    <div className="integrations">
                        <h3>Strava</h3>
                        <p>{stravaStatus === 'connected' ? '✅ Connecté' : '❌ Non connecté'}</p>
                        <button onClick={() => stravaService.initiateAuth()} style={{background:'#fc4c02', color:'white', border:'none', padding:'10px', borderRadius:'5px', cursor:'pointer'}}>
                            {stravaStatus === 'connected' ? 'Re-synchroniser' : 'Connecter Strava'}
                        </button>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <button onClick={handleLogout} style={{ width:'100%', padding:'15px', background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer' }}>
                    Se déconnecter
                </button>
            </div>
        </div>
    );
}

export default SettingsPage;