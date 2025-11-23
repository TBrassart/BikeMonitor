import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/api';

// Pages & Composants
import AuthScreen from './components/Auth/AuthScreen';
import Dashboard from './components/Dashboard/Dashboard';
import SideBar from './components/Layout/SideBar';
import BottomNav from './components/Layout/BottomNav';

import BikeGarage from './components/Bike/BikeGarage';
import BikeDetailShell from './components/Bike/BikeDetailShell';
import BikeForm from './components/Bike/BikeForm';

// MODULES MANQUANTS (Imports)
import EquipmentPage from './components/Equipment/EquipmentPage';
import NutritionPage from './components/Nutrition/NutritionPage';
import KitsPage from './components/Kits/KitsPage';
import LibraryPage from './components/Library/LibraryPage';
import ActivitiesPage from './components/Activities/ActivitiesPage';

import TurlagManager from './components/Settings/TurlagManager';
import SettingsPage from './components/Settings/SettingsPage';
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
                    <Route path="/strava-callback" element={<StravaCallback />} />

                    {/* PRINCIPAL */}
                    <Route path="/app/dashboard" element={<Dashboard />} />
                    <Route path="/app/activities" element={<ActivitiesPage />} />

                    {/* VÉLOS */}
                    <Route path="/app/garage" element={<BikeGarage />} />
                    <Route path="/app/add-bike" element={<BikeForm />} />
                    <Route path="/app/bike/:bikeId" element={<BikeDetailShell />} />

                    {/* MODULES ADDITIONNELS */}
                    <Route path="/app/equipment" element={<EquipmentPage />} />
                    <Route path="/app/nutrition" element={<NutritionPage />} />
                    <Route path="/app/kits" element={<KitsPage />} />
                    <Route path="/app/library" element={<LibraryPage />} />

                    {/* ADMIN & SOCIAL */}
                    <Route path="/app/turlag" element={
                        <div className="page-container">
                            <h2 style={{marginBottom:'20px', color:'white'}}>Mon Turlag</h2>
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