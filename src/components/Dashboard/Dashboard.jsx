import React, { useState, useEffect } from 'react';
import { api, authService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { FaBicycle, FaRoad, FaMountain, FaClock, FaPlus, FaUsers, FaCog } from 'react-icons/fa';
import ChartsSection from './ChartsSection';
import WeatherWidget from './WeatherWidget';
import './Dashboard.css';

function Dashboard() {
    const [stats, setStats] = useState({ totalKm: 0, bikesCount: 0, totalElevation: 0, totalHours: 0 });
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);

            // Récupération des stats
            const data = await api.getStats();
            
            // Calcul des heures (si l'API renvoie moving_time total, sinon on estime)
            // Ici on suppose que getStats renvoie un objet agrégé
            setStats({
                totalKm: data.totalKm || 0,
                totalElevation: data.totalElevation || 0,
                bikesCount: data.bikesCount || 0,
                // Si l'API n'a pas totalHours, on peut le calculer approx (25km/h de moyenne)
                totalHours: data.totalHours || Math.round(data.totalKm / 25) 
            });

        } catch (e) {
            console.error("Erreur dashboard", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-screen">Initialisation du cockpit...</div>;

    return (
        <div className="dashboard-container">
            
            {/* HEADER : BONJOUR */}
            <header className="dashboard-header">
                <div>
                    <h1 className="gradient-text">Bonjour, {user?.user_metadata?.full_name || "Pilote"}</h1>
                    <p className="subtitle">Prêt pour la prochaine sortie ?</p>
                </div>
                <div className="date-badge glass-panel">
                    {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
            </header>

            {/* KPI GRID (CHIFFRES CLÉS) */}
            <div className="kpi-grid">
                <div className="kpi-card glass-panel blue">
                    <div className="kpi-icon"><FaRoad /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Distance Totale</span>
                        <span className="kpi-value">{Math.round(stats.totalKm).toLocaleString()} <small>km</small></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel purple">
                    <div className="kpi-icon"><FaMountain /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Dénivelé</span>
                        <span className="kpi-value">{Math.round(stats.totalElevation).toLocaleString()} <small>m</small></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel orange">
                    <div className="kpi-icon"><FaClock /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Temps de selle</span>
                        <span className="kpi-value">{stats.totalHours} <small>h</small></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel green">
                    <div className="kpi-icon"><FaBicycle /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Écurie</span>
                        <span className="kpi-value">{stats.bikesCount} <small>vélos</small></span>
                    </div>
                </div>
            </div>

            {/* MAIN LAYOUT (GRAPHIQUES + SIDE WIDGETS) */}
            <div className="dashboard-layout">
                
                {/* COLONNE PRINCIPALE : STATS DÉTAILLÉES */}
                <div className="main-column">
                    <div className="glass-panel charts-wrapper">
                        <ChartsSection />
                    </div>
                </div>

                {/* COLONNE LATÉRALE : ACTIONS & MÉTÉO */}
                <div className="side-column">
                    
                    {/* WIDGET ACTIONS RAPIDES */}
                    <div className="glass-panel actions-widget">
                        <h3>Actions Rapides</h3>
                        <div className="actions-grid">
                            <button onClick={() => navigate('/app/add-bike')} className="quick-btn">
                                <div className="btn-icon"><FaPlus /></div>
                                <span>Ajouter Vélo</span>
                            </button>
                            <button onClick={() => navigate('/app/turlag')} className="quick-btn">
                                <div className="btn-icon"><FaUsers /></div>
                                <span>Mon Turlag</span>
                            </button>
                            <button onClick={() => navigate('/app/settings')} className="quick-btn">
                                <div className="btn-icon"><FaCog /></div>
                                <span>Réglages</span>
                            </button>
                        </div>
                    </div>

                    {/* WIDGET MÉTÉO */}
                    <div className="glass-panel weather-wrapper">
                        <WeatherWidget />
                    </div>

                </div>
            </div>
        </div>
    );
}

export default Dashboard;