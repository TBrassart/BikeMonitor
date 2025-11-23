import React, { useState, useEffect, useMemo } from 'react';
import { api, authService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { 
    FaRoad, FaMountain, FaClock, FaBicycle, 
    FaExclamationTriangle, FaWrench, FaCalendarAlt, FaSync, FaPlus, FaUsers
} from 'react-icons/fa';
import ChartsSection from './ChartsSection';
import WeatherWidget from './WeatherWidget';
import './Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    
    // Données brutes
    const [activities, setActivities] = useState([]);
    const [bikes, setBikes] = useState([]);
    
    // Filtres
    const [period, setPeriod] = useState('month'); // 'week', 'month', 'year'
    const [isRolling, setIsRolling] = useState(false); // true = glissant

    // Alertes
    const [alerts, setAlerts] = useState({ parts: 0, maintenance: 0 });
    const [showAlerts, setShowAlerts] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);

            // 1. Charger Activités (pour les stats et graphs)
            const acts = await api.getActivities();
            setActivities(acts || []);

            // 2. Charger Vélos (pour les alertes)
            const myBikes = await api.getBikes();
            setBikes(myBikes || []);

            // 3. Calculer les alertes
            let partAlerts = 0;
            let maintAlerts = 0;

            myBikes.forEach(bike => {
                // Pièces critiques/warning
                if (bike.parts) {
                    partAlerts += bike.parts.filter(p => p.status === 'critical' || p.status === 'warning').length;
                }
                // Maintenance en retard (si on avait l'info, ici simulé ou à ajouter dans l'API getBikes)
                // Supposons qu'on doive faire un appel séparé ou que getBikes inclue maintenance
            });
            
            // Pour l'exemple, on set des valeurs
            setAlerts({ parts: partAlerts, maintenance: maintAlerts });

        } catch (e) {
            console.error("Erreur dashboard", e);
        } finally {
            setLoading(false);
        }
    };

    // --- FILTRAGE INTELLIGENT ---
    const filteredData = useMemo(() => {
        const now = new Date();
        let startDate = new Date();

        if (isRolling) {
            // Période Glissante (ex: 30 derniers jours)
            if (period === 'week') startDate.setDate(now.getDate() - 7);
            if (period === 'month') startDate.setDate(now.getDate() - 30);
            if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);
        } else {
            // Période Calendaire (ex: Depuis le 1er du mois)
            if (period === 'week') {
                const day = now.getDay() || 7; 
                if (day !== 1) startDate.setHours(-24 * (day - 1)); 
            }
            if (period === 'month') startDate.setDate(1);
            if (period === 'year') startDate.setMonth(0, 1);
        }
        
        // On filtre
        return activities.filter(act => new Date(act.start_date) >= startDate);
    }, [activities, period, isRolling]);

    // --- CALCUL DES KPI SUR DONNÉES FILTRÉES ---
    const kpi = useMemo(() => {
        const dist = filteredData.reduce((acc, a) => acc + (a.distance > 1000 ? a.distance/1000 : a.distance), 0);
        const elev = filteredData.reduce((acc, a) => acc + (a.total_elevation_gain || 0), 0);
        const time = filteredData.reduce((acc, a) => acc + (a.moving_time || 0), 0);
        return {
            dist: Math.round(dist),
            elev: Math.round(elev),
            hours: Math.floor(time / 3600)
        };
    }, [filteredData]);

    if (loading) return <div className="loading-screen">Chargement du cockpit...</div>;

    return (
        <div className="dashboard-container">
            
            {/* HEADER AVEC ALERTES */}
            <header className="dashboard-header">
                <div>
                    <h1 className="gradient-text">Bonjour, {user?.user_metadata?.full_name || "Pilote"}</h1>
                    <div className="header-controls">
                        {/* FILTRES TEMPORELS */}
                        <div className="time-filters glass-panel">
                            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="filter-select">
                                <option value="week">Semaine</option>
                                <option value="month">Mois</option>
                                <option value="year">Année</option>
                            </select>
                            <label className="rolling-toggle" title="Période glissante (ex: 30 derniers jours)">
                                <input type="checkbox" checked={isRolling} onChange={(e) => setIsRolling(e.target.checked)} />
                                <FaSync className={`sync-icon ${isRolling ? 'spinning' : ''}`} />
                                <span>Glissant</span>
                            </label>
                        </div>

                        {/* ALERTES MÉCANIQUES */}
                        <div className="alerts-container">
                            <div className={`alert-bubble parts ${alerts.parts > 0 ? 'active' : ''}`} 
                                 title={`${alerts.parts} pièces à surveiller`}
                                 onClick={() => navigate('/app/garage')}>
                                <FaExclamationTriangle />
                                {alerts.parts > 0 && <span className="badge">{alerts.parts}</span>}
                            </div>
                            <div className={`alert-bubble maintenance ${alerts.maintenance > 0 ? 'active' : ''}`}
                                 title="Entretiens à prévoir"
                                 onClick={() => navigate('/app/garage')}>
                                <FaWrench />
                                {alerts.maintenance > 0 && <span className="badge">{alerts.maintenance}</span>}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="date-badge glass-panel">
                    <FaCalendarAlt style={{marginRight:8}}/>
                    {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </div>
            </header>

            {/* KPI GRID (IMPACTÉ PAR LE FILTRE) */}
            <div className="kpi-grid">
                <div className="kpi-card glass-panel blue">
                    <div className="kpi-icon"><FaRoad /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Distance</span>
                        <span className="kpi-value">{kpi.dist.toLocaleString()} <small>km</small></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel purple">
                    <div className="kpi-icon"><FaMountain /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Dénivelé</span>
                        <span className="kpi-value">{kpi.elev.toLocaleString()} <small>m</small></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel orange">
                    <div className="kpi-icon"><FaClock /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Temps</span>
                        <span className="kpi-value">{kpi.hours} <small>h</small></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel green">
                    <div className="kpi-icon"><FaBicycle /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Parc</span>
                        <span className="kpi-value">{bikes.length} <small>vélos</small></span>
                    </div>
                </div>
            </div>

            {/* MAIN LAYOUT */}
            <div className="dashboard-layout">
                <div className="main-column">
                    {/* GRAPHIQUES (On passe les données filtrées) */}
                    <ChartsSection activities={filteredData} allActivities={activities} period={period} />
                </div>

                <div className="side-column">
                    <div className="glass-panel weather-wrapper">
                        <WeatherWidget />
                    </div>
                    
                    {/* On pourrait ajouter ici un widget "Prochain Entretien" */}
                    <div className="glass-panel actions-widget">
                        <h3>Raccourcis</h3>
                        <div className="actions-grid">
                            <button onClick={() => navigate('/app/add-bike')} className="quick-btn">
                                <FaPlus /> Vélo
                            </button>
                            <button onClick={() => navigate('/app/turlag')} className="quick-btn">
                                <FaUsers /> Turlag
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;