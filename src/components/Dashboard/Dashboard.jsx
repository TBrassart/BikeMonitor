import React, { useState, useEffect } from 'react';
import { api, authService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
// Si tu as ces composants, on peut les garder, sinon commente-les pour l'instant
import WeatherWidget from './WeatherWidget'; 
import ChartsSection from './ChartsSection'; 

function Dashboard() {
    const [stats, setStats] = useState({ totalKm: 0, bikesCount: 0, totalElevation: 0 });
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            // 1. On récupère l'utilisateur
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);

            // 2. On récupère les stats via la nouvelle API unifiée
            // (Calculées sur tes vélos + ceux de tes Turlags visibles)
            const dashboardStats = await api.getStats();
            setStats(dashboardStats);

        } catch (e) {
            console.error("Erreur chargement dashboard:", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="dashboard-loading">Chargement des données...</div>;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="welcome-text">
                    <h1>Bonjour, {user?.user_metadata?.full_name || user?.email?.split('@')[0]} 👋</h1>
                    <p>Prêt à rouler ?</p>
                </div>
                {/* Widget Météo (si disponible) */}
                <div className="weather-container">
                    <WeatherWidget />
                </div>
            </header>

            {/* Cartes de Statistiques */}
            <section className="stats-grid">
                <div className="stat-card primary">
                    <span className="stat-icon">🚴</span>
                    <div className="stat-info">
                        <h3>Vélos actifs</h3>
                        <p className="stat-value">{stats.bikesCount}</p>
                    </div>
                </div>

                <div className="stat-card secondary">
                    <span className="stat-icon">📏</span>
                    <div className="stat-info">
                        <h3>Total KM</h3>
                        <p className="stat-value">{Math.round(stats.totalKm)} km</p>
                    </div>
                </div>

                <div className="stat-card accent">
                    <span className="stat-icon">🏔️</span>
                    <div className="stat-info">
                        <h3>Dénivelé</h3>
                        <p className="stat-value">{Math.round(stats.totalElevation)} m</p>
                    </div>
                </div>
            </section>

            {/* Actions Rapides */}
            <section className="quick-actions">
                <h2>Actions rapides</h2>
                <div className="action-buttons">
                    <button onClick={() => navigate('/app/add-bike')} className="action-btn">
                        + Ajouter un vélo
                    </button>
                    <button onClick={() => navigate('/app/settings')} className="action-btn outline">
                        Gérer mon Turlag
                    </button>
                </div>
            </section>

            {/* Graphiques (si le composant existe) */}
            <section className="charts-container">
                <ChartsSection />
            </section>
        </div>
    );
}

export default Dashboard;