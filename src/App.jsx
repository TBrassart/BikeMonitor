import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'; 
import './App.css'; 

// Composants Métier
import BikeGarage from './components/Bike/BikeGarage';
import BikeForm from './components/Bike/BikeForm';
import BikeDetailShell from './components/Bike/BikeDetailShell';
import NutritionPage from './components/Nutrition/NutritionPage';
import EquipmentPage from './components/Equipment/EquipmentPage';
import KitsPage from './components/Kits/KitsPage';
import Settings from './components/Settings/SettingsPage';
import ActivitiesPage from './components/Activities/ActivitiesPage';
import LibraryPage from './components/Library/LibraryPage';
import Dashboard from './components/Dashboard/Dashboard';
import ProfilePage from './components/Settings/ProfilePage';

// Composants Auth & Layout
import AuthScreen from './components/Auth/AuthScreen';
import ProfileSelection from './components/Auth/ProfileSelection';
import Sidebar from './components/Layout/Sidebar'; // Attention à la casse (Sidebar ou SideBar selon ton fichier)
import BottomNav from './components/Layout/BottomNav';
import JoinFamily from './components/Auth/JoinFamily';

// Services
import { authService, bikeService } from './services/api';
import { stravaService } from './services/stravaService'; 
import { supabase } from './supabaseClient';

const App = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // --- CORRECTION ICI : DÉCLARATION DE activeRoute ---
    const activeRoute = location.pathname;
    // ---------------------------------------------------

    const isFullScreenPage = location.pathname.startsWith('/join');

    const [session, setSession] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentProfile, setCurrentProfile] = useState(null);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);
    
    const [bikes, setBikes] = useState([]); 
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedBike, setSelectedBike] = useState(null); 
    const [isDetailOpen, setIsDetailOpen] = useState(false); 

    // --- GESTION SESSION ---
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsLoggedIn(!!session);

            if (session) {
                // Restauration profil
                const storedProfile = localStorage.getItem('bm_active_profile');
                if (storedProfile) {
                    try { setCurrentProfile(JSON.parse(storedProfile)); } catch (e) {}
                }

                // Check Invitation Serveur (Cross-Device)
                const userMeta = session.user?.user_metadata;
                let tokenToProcess = userMeta?.pending_invite_token || localStorage.getItem('pending_invite_token');

                if (tokenToProcess) {
                    authService.acceptInvitation(tokenToProcess)
                        .then(async () => {
                            alert("Félicitations ! Vous avez rejoint la famille.");
                            localStorage.removeItem('pending_invite_token');
                            await authService.clearInviteToken();
                            window.location.reload();
                        })
                        .catch(async (err) => {
                            // Si déjà membre, on nettoie silencieusement
                            if (err.message && (err.message.includes("duplicate") || err.code === '23505')) {
                                localStorage.removeItem('pending_invite_token');
                                await authService.clearInviteToken();
                            }
                        });
                }
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setIsLoggedIn(!!session);
            if (!session) {
                setBikes([]); 
                setCurrentProfile(null);
                localStorage.removeItem('bm_active_profile'); 
                if (!location.pathname.startsWith('/join')) {
                    navigate('/');
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate, location.pathname]);

    // --- CHARGEMENT DONNÉES ---
    useEffect(() => {
        if (currentProfile) {
            fetchInitialData();
            stravaService.syncActivities(currentProfile.id).catch(() => {});
        }
    }, [currentProfile]);

    const fetchInitialData = async () => {
        setIsLoadingInitialData(true);
        try {
            const initialBikes = await bikeService.getBikes();
            setBikes(initialBikes || []); 
        } catch (error) {
            console.error("Erreur chargement:", error);
        } finally {
            setIsLoadingInitialData(false);
        }
    };

    const handleProfileSelect = (profile) => {
        setCurrentProfile(profile);
        localStorage.setItem('bm_active_profile', JSON.stringify(profile)); 
        navigate('/'); 
    };

    const handleSwitchProfile = () => {
        setCurrentProfile(null);
        localStorage.removeItem('bm_active_profile'); 
    };

    const handleLogin = async (email, password) => {
        try {
            await authService.login(email, password);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleLogout = async () => {
        await authService.logout();
        setIsLoggedIn(false);
        setCurrentProfile(null);
        localStorage.removeItem('bm_active_profile'); 
        navigate('/');
    };

    const handleSaveBike = (bikeData) => {
        return new Promise(async (resolve, reject) => {
            try {
                const dataWithProfile = { ...bikeData, owner: currentProfile?.name || 'Admin' };
                const newBike = await bikeService.createBike(dataWithProfile); 
                setBikes(prev => [newBike, ...prev]); 
                resolve(newBike);
            } catch (error) {
                console.error(error);
                alert("Erreur sauvegarde.");
                reject(error);
            }
        });
    };
    
    const handleAddMaintenance = async (bikeId, maintenanceData) => {
        return await bikeService.addMaintenance(bikeId, maintenanceData);
    };

    const handleNavigate = (route) => {
        navigate(route);
        setIsDetailOpen(false);
        setIsFormOpen(false);
        setSelectedBike(null); 
    };

    const handleOpenForm = () => setIsFormOpen(true);
    
    const handleOpenDetail = (bike) => {
        setSelectedBike(bike);
        setIsDetailOpen(true);
    };
    
    const handleBackToGarage = () => {
        setIsDetailOpen(false);
        setSelectedBike(null);
        fetchInitialData();
    };

    // --- RENDU ---
    
    if (!isLoggedIn && !isFullScreenPage) {
        return <AuthScreen onLogin={handleLogin} />;
    }

    if (isLoggedIn && !currentProfile && !isFullScreenPage) {
        return <ProfileSelection onSelectProfile={handleProfileSelect} />;
    }
    
    if (isLoadingInitialData) return <div className="loading-screen">Chargement...</div>;

    if (isFormOpen) {
        return <BikeForm onClose={() => setIsFormOpen(false)} onSave={handleSaveBike} currentUser={currentProfile} />;
    }
    
    if (isDetailOpen && selectedBike) {
        return (
            <BikeDetailShell 
                bike={selectedBike} 
                onBackToGarage={handleBackToGarage} 
                onAddMaintenance={handleAddMaintenance}
            />
        );
    }

    return (
        <div className={`App ${isLoggedIn ? 'is-authenticated' : ''}`}>
            
            {isLoggedIn && currentProfile && !isFullScreenPage && (
                <Sidebar 
                    activeRoute={activeRoute} 
                    onNavigate={handleNavigate} 
                    onLogout={handleLogout}
                    userProfile={currentProfile}
                    onSwitchProfile={handleSwitchProfile}
                />
            )}

            <main className="main-content" style={isFullScreenPage ? {marginLeft: 0, width: '100%'} : {}}>
                <Routes>
                    <Route path="/" element={<Dashboard currentProfile={currentProfile} />} />
                    <Route path="/garage" element={
                        <BikeGarage bikes={bikes} onOpenForm={handleOpenForm} onOpenDetail={handleOpenDetail} />
                    } />
                    <Route path="/equipment" element={<EquipmentPage />} />
                    <Route path="/nutrition" element={<NutritionPage />} />
                    <Route path="/kits" element={<KitsPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/settings/" element={<Settings currentProfile={currentProfile} onSyncComplete={fetchInitialData} />} />
                    <Route path="/activities" element={<ActivitiesPage currentProfile={currentProfile} />} />
                    <Route path="/profile" element={<ProfilePage currentProfile={currentProfile} onProfileUpdate={(updated) => {setCurrentProfile(updated);localStorage.setItem('bm_active_profile', JSON.stringify(updated));}} />} />
                    
                    <Route path="/join/:token" element={<JoinFamily onLogin={handleLogin} />} />
                    
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
            
            {!isFormOpen && !isDetailOpen && isLoggedIn && currentProfile && !isFullScreenPage && (
                <BottomNav activeRoute={activeRoute} onNavigate={handleNavigate} />
            )}
        </div>
    );
};

export default App;