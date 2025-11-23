import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/api';

// Layouts & Pages
import AuthScreen from './components/Auth/AuthScreen';
import Dashboard from './components/Dashboard/Dashboard';
import SideBar from './components/Layout/SideBar';
import BottomNav from './components/Layout/BottomNav';
import BikeGarage from './components/Bike/BikeGarage';
import BikeDetailShell from './components/Bike/BikeDetailShell';
import BikeForm from './components/Bike/BikeForm';
import SettingsPage from './components/Settings/SettingsPage';
// ... importez vos autres pages (Nutrition, Activities, etc.)

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

  // Si pas connecté, on affiche l'écran d'Auth (qui gère maintenant la création de profil auto)
  if (!user) {
    return <AuthScreen onLogin={checkSession} />;
  }

  // Structure de l'application connectée
  return (
    <Router>
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
            {/* On redirige les vieilles url d'invitation vers les settings pour entrer le code manuellement */}
            <Route path="/join/*" element={<Navigate to="/app/settings" />} />
            
            {/* Route Catch-all */}
            <Route path="*" element={<Navigate to="/app/dashboard" />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;