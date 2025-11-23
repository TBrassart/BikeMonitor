import React, { useState, useEffect } from 'react';
import { authService, supabase } from '../../services/api';
import { stravaService } from '../../services/stravaService'; 
import ProfilePage from './ProfilePage';
import TurlagManager from './TurlagManager'; // Import CRUCIAL
import './SettingsPage.css';

function SettingsPage() {
    // On met 'turlags' par défaut si tu veux tester direct, sinon 'profile'
    const [activeTab, setActiveTab] = useState('turlags'); 
    const [stravaStatus, setStravaStatus] = useState('loading');

    useEffect(() => {
        if (activeTab === 'integrations') {
            checkStravaStatus();
        }
    }, [activeTab]);

    const checkStravaStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('profile_integrations')
                .select('*')
                .eq('profile_id', user.id)
                .eq('provider', 'strava')
                .single();

            setStravaStatus(data ? 'connected' : 'disconnected');
        } catch (e) {
            setStravaStatus('disconnected');
        }
    };

    const handleStravaConnect = async () => await stravaService.initiateAuth();

    const handleStravaDisconnect = async () => {
        if (window.confirm("Déconnecter Strava ?")) {
            await stravaService.disconnect();
            setStravaStatus('disconnected');
        }
    };

    const handleLogout = async () => {
        await authService.signOut();
        window.location.href = '/';
    };

    return (
        <div className="settings-page">
            <header className="settings-header">
                <h2>Paramètres</h2>
                <button onClick={handleLogout} className="logout-btn">Déconnexion</button>
            </header>

            <div className="settings-tabs">
                <button 
                    className={activeTab === 'profile' ? 'active' : ''} 
                    onClick={() => setActiveTab('profile')}
                >
                    Mon Profil
                </button>
                <button 
                    className={activeTab === 'turlags' ? 'active' : ''} 
                    onClick={() => setActiveTab('turlags')}
                >
                    Mes Turlags
                </button>
                <button 
                    className={activeTab === 'integrations' ? 'active' : ''} 
                    onClick={() => setActiveTab('integrations')}
                >
                    Intégrations
                </button>
            </div>

            <div className="settings-content">
                {activeTab === 'profile' && <ProfilePage />}
                
                {/* C'est ICI que le composant est appelé */}
                {activeTab === 'turlags' && <TurlagManager />}

                {activeTab === 'integrations' && (
                    <div className="integrations-tab">
                        <h3>Strava</h3>
                        <p>État : {stravaStatus === 'connected' ? '✅ Connecté' : '❌ Déconnecté'}</p>
                        {stravaStatus === 'disconnected' && (
                            <button onClick={handleStravaConnect} className="primary-btn">Connecter Strava</button>
                        )}
                        {stravaStatus === 'connected' && (
                            <button onClick={handleStravaDisconnect} className="secondary-btn">Déconnecter</button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default SettingsPage;