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
import Sidebar from './components/Layout/Sidebar';
import BottomNav from './components/Layout/BottomNav';
import JoinFamily from './components/Auth/JoinFamily';

// Services
import { authService, bikeService } from './services/api';
import { stravaService } from './services/stravaService'; 
import { supabase } from './supabaseClient';

const App = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const isFullScreenPage = location.pathname.startsWith('/join');

    const [session, setSession] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentProfile, setCurrentProfile] = useState(null);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);
    
    const [bikes, setBikes] = useState([]); 
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedBike, setSelectedBike] = useState(null); 
    const [isDetailOpen, setIsDetailOpen] = useState(false); 

    // --- GESTION SESSION & INVITATIONS ---
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsLoggedIn(!!session);

            // Restauration profil local
            if (session) {
                const storedProfile = localStorage.getItem('bm_active_profile');
                if (storedProfile) {
                    try { setCurrentProfile(JSON.parse(storedProfile)); } catch (e) {}
                }
            }
            
            // --- LOGIQUE INVITATION ROBUSTE ---
            if (session) {
                // 1. On cherche le token partout (Serveur OU Local)
                let tokenToProcess = session.user?.user_metadata?.pending_invite_token 
                                     || localStorage.getItem('pending_invite_token');

                if (tokenToProcess) {
                    console.log("🎟️ Traitement de l'invitation...");
                    
                    authService.acceptInvitation(tokenToProcess)
                        .then(async () => {
                            console.log("✅ Invitation traitée avec succès (ou déjà membre).");
                            alert("Félicitations ! Vous avez rejoint la famille.");
                            
                            // 2. Nettoyage IMPÉRATIF
                            localStorage.removeItem('pending_invite_token');
                            await authService.clearInviteToken();
                            
                            // 3. Recharger les données proprement sans reload bourrin
                            // Si on a déjà un profil actif, on rafraichit
                            if (currentProfile) fetchInitialData();
                        })
                        .catch(async (err) => {
                            console.error("⚠️ Erreur invitation :", err);
                            // Si erreur "Déjà membre" ou "Conflit" -> ON NETTOIE QUAND MÊME
                            if (err.message && (err.message.includes("duplicate") || err.message.includes("violates") || err.code === '23505')) {
                                console.log("ℹ️ Déjà membre, nettoyage du token obsolète.");
                                localStorage.removeItem('pending_invite_token');
                                await authService.clearInviteToken();
                            }
                        });
                }
            }
            // ----------------------------------
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
    }, [navigate, location.pathname]); // Retrait de currentProfile des dépendances pour éviter boucles

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

    // --- RENDU PRINCIPAL ---
    
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