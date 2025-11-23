import React, { useState, useEffect, useMemo } from 'react';
import { api, authService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { 
    FaRoad, FaMountain, FaClock, FaBicycle, 
    FaExclamationTriangle, FaWrench, FaCalendarAlt, FaSync, FaTimes, FaArrowRight, FaPlus, FaUsers
} from 'react-icons/fa';
import ChartsSection from './ChartsSection';
import WeatherWidget from './WeatherWidget';
import './Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [activities, setActivities] = useState([]);
    const [bikes, setBikes] = useState([]);
    
    // Filtres
    const [period, setPeriod] = useState('month');
    const [isRolling, setIsRolling] = useState(false);

    // Alertes (Liste unique)
    const [alertList, setAlertList] = useState({ parts: [], maintenance: [] });
    const [showAlertModal, setShowAlertModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);

            const acts = await api.getActivities();
            setActivities(acts || []);

            const myBikes = await api.getBikes();
            setBikes(myBikes || []);

            // --- CALCUL DES ALERTES ---
            const partsIssues = [];
            const maintIssues = [];

            myBikes.forEach(bike => {
                // Pièces (Critique ou Warning)
                if (bike.parts) {
                    bike.parts.forEach(p => {
                        if (p.status === 'critical' || p.status === 'warning') {
                            partsIssues.push({ 
                                bikeName: bike.name, 
                                bikeId: bike.id, 
                                part: p.name, 
                                status: p.status 
                            });
                        }
                    });
                }
                
                // Maintenance (On regarde si maintenance en retard)
                // Note: Suppose que l'API getBikes ne renvoie pas maintenance par défaut
                // Il faudrait idéalement appeler getMaintenance pour chaque vélo, 
                // mais pour l'instant on se base sur la logique existante ou future.
                // Pour l'instant, on laisse vide ou on simule si besoin.
            });
            
            setAlertList({ parts: partsIssues, maintenance: maintIssues });

        } catch (e) {
            console.error("Erreur dashboard", e);
        } finally {
            setLoading(false);
        }
    };

    // --- FILTRAGE ---
    const filteredData = useMemo(() => {
        const now = new Date();
        let startDate = new Date();

        if (isRolling) {
            if (period === 'week') startDate.setDate(now.getDate() - 7);
            if (period === 'month') startDate.setDate(now.getDate() - 30);
            if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);
        } else {
            if (period === 'week') { const day = now.getDay() || 7; if (day !== 1) startDate.setHours(-24 * (day - 1)); }
            if (period === 'month') startDate.setDate(1);
            if (period === 'year') startDate.setMonth(0, 1);
        }
        return activities.filter(act => new Date(act.start_date) >= startDate);
    }, [activities, period, isRolling]);

    // KPI
    const kpi = useMemo(() => {
        const dist = filteredData.reduce((acc, a) => acc + (a.distance > 1000 ? a.distance/1000 : a.distance), 0);
        const elev = filteredData.reduce((acc, a) => acc + (a.total_elevation_gain || 0), 0);
        const time = filteredData.reduce((acc, a) => acc + (a.moving_time || 0), 0);
        return { dist: Math.round(dist), elev: Math.round(elev), hours: Math.floor(time / 3600) };
    }, [filteredData]);

    if (loading) return <div className="loading-screen">Chargement...</div>;

    // Calcul pour savoir si on allume les bulles
    const hasPartAlerts = alertList.parts.length > 0;
    const hasMaintAlerts = alertList.maintenance.length > 0;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div>
                    <h1 className="gradient-text">Bonjour, {user?.user_metadata?.full_name || "Pilote"}</h1>
                    <div className="header-controls">
                        <div className="time-filters glass-panel">
                            {/* SELECTEUR STYLE CORRIGÉ DANS CSS */}
                            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="filter-select">
                                <option value="week">Semaine</option>
                                <option value="month">Mois</option>
                                <option value="year">Année</option>
                            </select>
                            <label className="rolling-toggle">
                                <input type="checkbox" checked={isRolling} onChange={(e) => setIsRolling(e.target.checked)} />
                                <FaSync className={`sync-icon ${isRolling ? 'spinning' : ''}`} />
                            </label>
                        </div>

                        <div className="alerts-container" onClick={() => (hasPartAlerts || hasMaintAlerts) && setShowAlertModal(true)} 
                             style={{cursor: (hasPartAlerts || hasMaintAlerts) ? 'pointer' : 'default'}}>
                            
                            {/* Bulle Pièces */}
                            <div className={`alert-bubble parts ${hasPartAlerts ? 'active' : 'inactive'}`}>
                                <FaExclamationTriangle />
                                {hasPartAlerts && <span className="badge-dot"></span>}
                            </div>

                            {/* Bulle Maintenance */}
                            <div className={`alert-bubble maintenance ${hasMaintAlerts ? 'active' : 'inactive'}`}>
                                <FaWrench />
                                {hasMaintAlerts && <span className="badge-dot"></span>}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="date-badge glass-panel">
                    <FaCalendarAlt style={{marginRight:8}}/> {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </div>
            </header>

            {/* MODALE ALERTES */}
            {showAlertModal && (
                <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
                    <div className="glass-panel modal-content alert-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Attentions Requises</h3>
                            <button onClick={() => setShowAlertModal(false)} className="close-btn"><FaTimes /></button>
                        </div>
                        
                        <div className="alert-list">
                            {alertList.parts.map((item, idx) => (
                                <div key={`part-${idx}`} className="alert-item critical" onClick={() => navigate(`/app/bike/${item.bikeId}`)}>
                                    <div className="alert-icon"><FaExclamationTriangle /></div>
                                    <div className="alert-info">
                                        <strong>{item.bikeName}</strong>
                                        <span>Pièce : {item.part} ({item.status === 'critical' ? 'Critique' : 'À surveiller'})</span>
                                    </div>
                                    <FaArrowRight className="arrow" />
                                </div>
                            ))}
                            {alertList.maintenance.map((item, idx) => (
                                <div key={`maint-${idx}`} className="alert-item warning" onClick={() => navigate(`/app/bike/${item.bikeId}`)}>
                                    <div className="alert-icon"><FaWrench /></div>
                                    <div className="alert-info">
                                        <strong>{item.bikeName}</strong>
                                        <span>Entretien : {item.task}</span>
                                    </div>
                                    <FaArrowRight className="arrow" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* KPI */}
            <div className="kpi-grid">
                <div className="kpi-card glass-panel blue">
                    <div className="kpi-icon"><FaRoad /></div>
                    <div className="kpi-content"><span className="kpi-label">Distance</span><span className="kpi-value">{kpi.dist.toLocaleString()} <small>km</small></span></div>
                </div>
                <div className="kpi-card glass-panel purple">
                    <div className="kpi-icon"><FaMountain /></div>
                    <div className="kpi-content"><span className="kpi-label">Dénivelé</span><span className="kpi-value">{kpi.elev.toLocaleString()} <small>m</small></span></div>
                </div>
                <div className="kpi-card glass-panel orange">
                    <div className="kpi-icon"><FaClock /></div>
                    <div className="kpi-content"><span className="kpi-label">Temps</span><span className="kpi-value">{kpi.hours} <small>h</small></span></div>
                </div>
                <div className="kpi-card glass-panel green">
                    <div className="kpi-icon"><FaBicycle /></div>
                    <div className="kpi-content"><span className="kpi-label">Parc</span><span className="kpi-value">{bikes.length} <small>vélos</small></span></div>
                </div>
            </div>

            <div className="dashboard-layout">
                <div className="main-column">
                    <ChartsSection activities={filteredData} allActivities={activities} period={period} bikes={bikes} />
                </div>
                <div className="side-column">
                    <div className="glass-panel weather-wrapper"><WeatherWidget /></div>
                    <div className="glass-panel actions-widget">
                        <h3>Raccourcis</h3>
                        <div className="actions-grid">
                            <button onClick={() => navigate('/app/add-bike')} className="quick-btn"><FaPlus /> Vélo</button>
                            <button onClick={() => navigate('/app/turlag')} className="quick-btn"><FaUsers /> Turlag</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;