import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/api';

// Pages
import AuthScreen from './components/Auth/AuthScreen';
import Dashboard from './components/Dashboard/Dashboard';
import SideBar from './components/Layout/SideBar';
import BottomNav from './components/Layout/BottomNav';
import BikeGarage from './components/Bike/BikeGarage';
import BikeDetailShell from './components/Bike/BikeDetailShell';
import BikeForm from './components/Bike/BikeForm';
import SettingsPage from './components/Settings/SettingsPage';
import TurlagManager from './components/Settings/TurlagManager';

// AJOUT DE L'IMPORT DU CALLBACK
import StravaCallback from './components/Settings/StravaCallback';

import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
        } catch (e) {
            console.error("Erreur session", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="app-loading">Chargement...</div>;

    if (!user) {
        return <AuthScreen onLogin={checkSession} />;
    }

    return (
        <div className="app-container">
            <SideBar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Navigate to="/app/dashboard" />} />
                    
                    {/* --- ROUTE STRAVA AJOUTÉE ICI --- */}
                    <Route path="/strava-callback" element={<StravaCallback />} />

                    <Route path="/app/dashboard" element={<Dashboard />} />
                    <Route path="/app/garage" element={<BikeGarage />} />
                    <Route path="/app/add-bike" element={<BikeForm />} />
                    <Route path="/app/bike/:bikeId" element={<BikeDetailShell />} />
                    
                    {/* Route Turlag dédiée */}
                    <Route path="/app/turlag" element={
                        <div className="page-container">
                            <h2 style={{marginBottom: '20px', color: 'var(--text-primary)'}}>Mon Turlag</h2>
                            <TurlagManager />
                        </div>
                    } />
                    
                    <Route path="/app/settings" element={<SettingsPage />} />
                    
                    <Route path="*" element={<Navigate to="/app/dashboard" />} />
                </Routes>
            </main>
            <BottomNav />
        </div>
    );
}

export default App;