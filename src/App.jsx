import React, { useState, useEffect } from 'react';
// MODIF : On retire "BrowserRouter as Router" des imports car c'est géré par main.jsx
import { Routes, Route, Navigate } from 'react-router-dom'; 
import { authService } from './services/api';
import { supabase } from './supabaseClient';

// Layouts & Pages
import AuthScreen from './components/Auth/AuthScreen';
import Dashboard from './components/Dashboard/Dashboard';
import SideBar from './components/Layout/SideBar';
import BottomNav from './components/Layout/BottomNav';
import BikeGarage from './components/Bike/BikeGarage';
import BikeDetailShell from './components/Bike/BikeDetailShell';
import BikeForm from './components/Bike/BikeForm';
import SettingsPage from './components/Settings/SettingsPage';
import NutritionPage from './components/Nutrition/NutritionPage';
import EquipmentPage from './components/Equipment/EquipmentPage';
import KitsPage from './components/Kits/KitsPage';
import ActivitiesPage from './components/Activities/ActivitiesPage';
import LibraryPage from './components/Library/LibraryPage';
import ProfilePage from './components/Settings/ProfilePage';


import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  };

  if (loading) return <div className="app-loading">Chargement...</div>;

  // Si pas connecté, on affiche l'écran d'Auth
  if (!user) {
    return <AuthScreen onLogin={checkSession} />;
  }

  // MODIF : On a retiré la balise <Router> ici
  return (
      <div className="app-container">
        <SideBar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/app/dashboard" />} />
            
            {/* Routes principales */}
            <Route path="/app/dashboard" element={<Dashboard />} />
            <Route path="/app/garage" element={<BikeGarage />} />
            <Route path="/app/add-bike" element={<BikeForm />} />
            <Route path="/app/bike/:bikeId" element={<BikeDetailShell />} />
            <Route path="/app/settings" element={<SettingsPage />} />
            
            {/* Redirections de sécurité */}
            <Route path="/join/*" element={<Navigate to="/app/settings" />} />
            
            {/* Route Catch-all */}
            <Route path="*" element={<Navigate to="/app/dashboard" />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
  );
  // MODIF : On a retiré la balise </Router> ici
}

export default App;