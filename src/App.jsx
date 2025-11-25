import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { authService, adminService } from './services/api';

// Pages & Composants
import AuthScreen from './components/Auth/AuthScreen';
import UpdatePassword from './components/Auth/UpdatePassword';
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
import TurlagDetail from './components/Settings/TurlagDetail';
import SettingsPage from './components/Settings/SettingsPage';
import StravaCallback from './components/Settings/StravaCallback';

import AdminPage from './components/Admin/AdminPage';
import GlobalBanner from './components/Layout/GlobalBanner';

import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMaintenance, setIsMaintenance] = useState(false);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);

            // CHECK MAINTENANCE
            const maint = await adminService.getMaintenance();
            
            if (maint) {
                // Si maintenance active, on vérifie si l'user est admin
                const profile = await authService.getMyProfile();
                if (profile?.app_role !== 'admin') {
                    setIsMaintenance(true);
                }
            }
        } catch (e) { /*...*/ } 
        finally { setLoading(false); }
    };

    if (loading) return <div className="app-loading">Chargement...</div>;

    if (!user) {
        return <AuthScreen onLogin={checkSession} />;
    }

    if (isMaintenance) {
        return (
            <div style={{height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0f0f13', color:'white', textAlign:'center'}}>
                <h1 style={{fontSize:'3rem', marginBottom:'20px'}}>🚧 Maintenance</h1>
                <p>L'application est en cours de mise à jour.</p>
                <p>Revenez dans quelques instants.</p>
                {/* Petit bouton caché pour les admins qui voudraient se reconnecter pour débloquer */}
                <button onClick={() => window.location.reload()} style={{marginTop:'50px', background:'transparent', border:'1px solid #333', color:'#555', padding:'5px 10px', borderRadius:'5px'}}>Rafraîchir</button>
            </div>
        );
    }

    return (
        <div className="app-container">
            {/* Sidebar reste fixe à gauche */}
            <SideBar />

            <main className="main-content">
                {/* LA BANNIÈRE EST MAINTENANT ICI (DANS LE FLUX) */}
                <GlobalBanner />

                <Routes>
                    <Route path="/" element={<Navigate to="/app/dashboard" />} />
                    <Route path="/strava-callback" element={<StravaCallback />} />
                    <Route path="/update-password" element={<UpdatePassword />} />
                    
                    <Route path="/app/dashboard" element={<Dashboard />} />
                    <Route path="/app/activities" element={<ActivitiesPage />} />

                    <Route path="/app/garage" element={<BikeGarage />} />
                    <Route path="/app/add-bike" element={<BikeForm />} />
                    <Route path="/app/bike/:bikeId" element={<BikeDetailShell />} />
                    <Route path="/app/edit-bike/:bikeId" element={<BikeForm />} />

                    <Route path="/app/equipment" element={<EquipmentPage />} />
                    <Route path="/app/nutrition" element={<NutritionPage />} />
                    <Route path="/app/kits" element={<KitsPage />} />
                    <Route path="/app/library" element={<LibraryPage />} />

                    <Route path="/app/turlag" element={
                        <div className="page-container">
                            <h2 className="gradient-text" style={{marginBottom:'20px'}}>Mon Turlag</h2>
                            <TurlagManager />
                        </div>
                    } />
                    <Route path="/app/turlag/:turlagId" element={<TurlagDetail />} />
                    <Route path="/app/settings" element={<SettingsPage />} />

                    <Route path="/app/admin" element={<AdminPage />} />
                    
                    <Route path="*" element={<Navigate to="/app/dashboard" />} />
                </Routes>
            </main>
            
            <BottomNav />
        </div>
    );
}

export default App;