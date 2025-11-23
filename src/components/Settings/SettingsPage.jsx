import React, { useState, useEffect } from 'react';
import { authService, supabase } from '../../services/api';
// Assure-toi que le chemin vers stravaService est correct
import { stravaService } from '../../services/stravaService'; 
import ProfilePage from './ProfilePage';
import TurlagManager from './TurlagManager';
import './SettingsPage.css';

function SettingsPage() {
    // Onglets: 'profile' | 'turlags' | 'integrations'
    const [activeTab, setActiveTab] = useState('profile');
    const [stravaStatus, setStravaStatus] = useState('loading'); // 'connected', 'disconnected', 'loading'

    useEffect(() => {
        if (activeTab === 'integrations') {
            checkStravaStatus();
        }
    }, [activeTab]);

    const checkStravaStatus = async () => {
        try {
            // On vérifie si l'utilisateur a un token Strava valide en base
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Note: Adapte le nom de la table 'profile_integrations' si besoin
            const { data, error } = await supabase
                .from('profile_integrations')
                .select('*')
                .eq('profile_id', user.id) // ou user_id selon ta structure profiles
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

    const handleStravaConnect = async () => {
        // Redirection vers l'auth Strava
        await stravaService.initiateAuth();
    };

    const handleStravaDisconnect = async () => {
        if (window.confirm("Veux-tu vraiment déconnecter Strava ? Les nouveaux trajets ne seront plus synchronisés.")) {
            try {
                await stravaService.disconnect();
                setStravaStatus('disconnected');
            } catch (e) {
                console.error("Erreur déconnexion:", e);
                alert("Erreur lors de la déconnexion.");
            }
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
                <button onClick={handleLogout} className="logout-btn">
                    Déconnexion
                </button>
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
                
                {activeTab === 'turlags' && <TurlagManager />}

                {activeTab === 'integrations' && (
                    <div className="integrations-tab">
                        <div className="integration-card strava-card">
                            <div className="integration-header">
                                <img src="/strava-logo.png" alt="Strava" className="integration-logo" onError={(e) => e.target.style.display='none'} />
                                <div>
                                    <h3>Strava</h3>
                                    <p>Synchronise tes activités et le kilométrage de tes vélos automatiquement.</p>
                                </div>
                            </div>
                            
                            <div className="integration-actions">
                                {stravaStatus === 'loading' && <span>Chargement...</span>}
                                
                                {stravaStatus === 'connected' && (
                                    <div className="status-connected">
                                        <span className="badge-success">✅ Connecté</span>
                                        <button onClick={handleStravaDisconnect} className="secondary-btn small">
                                            Déconnecter
                                        </button>
                                    </div>
                                )}
                                
                                {stravaStatus === 'disconnected' && (
                                    <button onClick={handleStravaConnect} className="primary-btn strava-btn">
                                        Connecter avec Strava
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