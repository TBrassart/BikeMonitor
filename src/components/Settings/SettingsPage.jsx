import React, { useState } from 'react';
import { authService } from '../../services/api';
import ProfilePage from './ProfilePage'; // Ton composant profil existant
import TurlagManager from './TurlagManager'; // Le nouveau composant
import './SettingsPage.css';

function SettingsPage() {
    // Onglets: 'profile' | 'turlags' | 'app'
    const [activeTab, setActiveTab] = useState('profile');

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
                {/* Tu pourras ajouter d'autres onglets plus tard */}
            </div>

            <div className="settings-content">
                {activeTab === 'profile' && <ProfilePage />}
                
                {activeTab === 'turlags' && <TurlagManager />}
            </div>
        </div>
    );
}

export default SettingsPage;