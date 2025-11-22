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
import Sidebar from './components/Layout/SideBar';
import BottomNav from './components/Layout/BottomNav';
import JoinFamily from './components/Auth/JoinFamily';

// Services
import { authService, bikeService } from './services/api';
import { stravaService } from './services/stravaService'; // <--- IMPORT AJOUTÉ ICI
import { supabase } from './supabaseClient';

const App = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const activeRoute = location.pathname;

    const [session, setSession] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentProfile, setCurrentProfile] = useState(null);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);
    
    const [bikes, setBikes] = useState([]); 
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedBike, setSelectedBike] = useState(null); 
    const [isDetailOpen, setIsDetailOpen] = useState(false); 

    // --- 1. RESTAURATION DU PROFIL AU CHARGEMENT ---
    useEffect(() => {
        // A. Vérifier la session Supabase
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsLoggedIn(!!session);

            // B. Si connecté, essayer de restaurer le profil depuis le localStorage
            if (session) {
                const storedProfile = localStorage.getItem('bm_active_profile');
                if (storedProfile) {
                    try {
                        const profile = JSON.parse(storedProfile);
                        setCurrentProfile(profile);
                        // Si on restaure le profil, on lance aussi le chargement des données !
                        // Note : On appelle fetchInitialData via un useEffect séparé ou ici directement
                        // Pour faire simple, on le fera via l'effet de dépendance [currentProfile] plus bas si besoin
                        // ou on appelle une fonction dédiée.
                    } catch (e) {
                        console.error("Erreur lecture profil stocké", e);
                        localStorage.removeItem('bm_active_profile');
                    }
                }
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setIsLoggedIn(!!session);
            if (!session) {
                setBikes([]); 
                setCurrentProfile(null);
                localStorage.removeItem('bm_active_profile'); // Nettoyage
                navigate('/'); 
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    // --- 2. EFFET DE CHARGEMENT DES DONNÉES ---
    // On déclenche le chargement dès que currentProfile est défini (manuellement ou via localStorage)
    useEffect(() => {
        if (currentProfile) {
            // 1. On charge les données locales (Vélos, etc.)
            fetchInitialData();

            // 2. AUTO-SYNC STRAVA (En arrière-plan)
            // On ne met pas de 'await' pour ne pas bloquer l'interface utilisateur
            // L'utilisateur peut naviguer pendant que ça charge.
            stravaService.syncActivities(currentProfile.id)
                .then(result => {
                    if (result.added > 0) {
                        console.log(`Auto-sync: +${result.added} nouvelles sorties.`);
                        // Optionnel : Ajouter un petit Toast ici pour dire "3 nouvelles sorties importées"
                    }
                })
                .catch(err => console.log("Auto-sync silencieuse échouée (peut-être pas connecté)"));
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

    // --- 3. SAUVEGARDE LORS DE LA SÉLECTION ---
    const handleProfileSelect = (profile) => {
        setCurrentProfile(profile);
        localStorage.setItem('bm_active_profile', JSON.stringify(profile)); // <-- Sauvegarde ici
        navigate('/'); 
    };

    const handleSwitchProfile = () => {
        setCurrentProfile(null);
        localStorage.removeItem('bm_active_profile'); // <-- Nettoyage ici
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
        localStorage.removeItem('bm_active_profile'); // <-- Nettoyage ici
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
    
    if (!isLoggedIn) return <AuthScreen onLogin={handleLogin} />;
    if (!currentProfile) return <ProfileSelection onSelectProfile={handleProfileSelect} />;
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
        <div className="App is-authenticated">
            <Sidebar 
                activeRoute={activeRoute} 
                onNavigate={handleNavigate} 
                onLogout={handleLogout}
                userProfile={currentProfile}
                onSwitchProfile={handleSwitchProfile}
            />

            <main className="main-content">
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
            
            <BottomNav activeRoute={activeRoute} onNavigate={handleNavigate} />
        </div>
    );
};

export default App;