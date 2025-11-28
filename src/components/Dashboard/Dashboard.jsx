import React, { useState, useEffect, useMemo } from 'react';
import { api, authService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { 
    FaRoad, FaMountain, FaClock, FaBicycle, FaPlus, FaUsers,
    FaExclamationTriangle, FaWrench, FaCalendarAlt, FaSync, FaTimes, FaArrowRight, FaEdit, FaEye, FaEyeSlash, FaGripVertical
} from 'react-icons/fa';
import ChartsSection from './ChartsSection';
import WeatherWidget from './WeatherWidget';
import './Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    
    // Données
    const [activities, setActivities] = useState([]);
    const [bikes, setBikes] = useState([]);
    
    // Filtres
    const [period, setPeriod] = useState('month');
    const [isRolling, setIsRolling] = useState(false);

    // Alertes
    const [alertList, setAlertList] = useState({ parts: [], maintenance: [] });
    const [showAlertModal, setShowAlertModal] = useState(false);

    // --- GESTION PERSONNALISATION (KPI & CHARTS) ---
    const [isEditMode, setIsEditMode] = useState(false);
    
    // KPI Config
    const [kpiOrder, setKpiOrder] = useState(['dist', 'elev', 'time', 'fleet']);
    const [hiddenKpis, setHiddenKpis] = useState([]);

    // Charts Config (NOUVEAU)
    const [chartOrder, setChartOrder] = useState(['heatmap', 'radar', 'volume', 'fitness']);
    const [hiddenCharts, setHiddenCharts] = useState([]);

    // Drag & Drop State
    const [draggedItem, setDraggedItem] = useState(null);
    const [draggedType, setDraggedType] = useState(null); // 'kpi' ou 'chart'

    useEffect(() => {
        loadData();
        loadPreferences();
    }, []);

    const loadPreferences = () => {
        // KPI
        const savedKpiOrder = localStorage.getItem('bm_dashboard_order');
        const savedKpiHidden = localStorage.getItem('bm_dashboard_hidden');
        if (savedKpiOrder) setKpiOrder(JSON.parse(savedKpiOrder));
        if (savedKpiHidden) setHiddenKpis(JSON.parse(savedKpiHidden));

        // CHARTS
        const savedChartOrder = localStorage.getItem('bm_charts_order');
        const savedChartHidden = localStorage.getItem('bm_charts_hidden');
        if (savedChartOrder) setChartOrder(JSON.parse(savedChartOrder));
        if (savedChartHidden) setHiddenCharts(JSON.parse(savedChartHidden));
    };

    const savePreferences = (type, newOrder, newHidden) => {
        if (type === 'kpi') {
            if (newOrder) { setKpiOrder(newOrder); localStorage.setItem('bm_dashboard_order', JSON.stringify(newOrder)); }
            if (newHidden) { setHiddenKpis(newHidden); localStorage.setItem('bm_dashboard_hidden', JSON.stringify(newHidden)); }
        } else if (type === 'chart') {
            if (newOrder) { setChartOrder(newOrder); localStorage.setItem('bm_charts_order', JSON.stringify(newOrder)); }
            if (newHidden) { setHiddenCharts(newHidden); localStorage.setItem('bm_charts_hidden', JSON.stringify(newHidden)); }
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);

            const acts = await api.getActivities();
            setActivities(acts || []);

            const myBikes = await api.getBikes();
            setBikes(myBikes || []);

            const partsIssues = [];
            const maintIssues = [];

            if (Array.isArray(myBikes)) {
                myBikes.forEach(bike => {
                    if (bike.parts && Array.isArray(bike.parts)) {
                        bike.parts.forEach(p => {
                            if (p.status === 'critical' || p.status === 'warning') {
                                partsIssues.push({ bikeName: bike.name, bikeId: bike.id, part: p.name, status: p.status });
                            }
                        });
                    }
                });
            }
            setAlertList({ parts: partsIssues, maintenance: maintIssues });

        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

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

    const kpiValues = useMemo(() => {
        const dist = filteredData.reduce((acc, a) => acc + (a.distance > 1000 ? a.distance/1000 : a.distance), 0);
        const elev = filteredData.reduce((acc, a) => acc + (a.total_elevation_gain || 0), 0);
        const time = filteredData.reduce((acc, a) => acc + (a.moving_time || 0), 0);
        
        return {
            dist: { id: 'dist', label: 'Distance', val: Math.round(dist).toLocaleString(), unit: 'km', icon: <FaRoad />, color: 'blue', link: '/app/activities' },
            elev: { id: 'elev', label: 'Dénivelé', val: Math.round(elev).toLocaleString(), unit: 'm', icon: <FaMountain />, color: 'purple', link: '/app/activities' },
            time: { id: 'time', label: 'Temps', val: Math.floor(time / 3600), unit: 'h', icon: <FaClock />, color: 'orange', link: '/app/activities' },
            fleet: { id: 'fleet', label: 'Parc', val: bikes.length, unit: 'vélos', icon: <FaBicycle />, color: 'green', link: '/app/garage' }
        };
    }, [filteredData, bikes]);

    // --- DRAG & DROP HANDLERS ---
    const handleDragStart = (e, id, type) => {
        setDraggedItem(id);
        setDraggedType(type);
        e.dataTransfer.effectAllowed = "move";
        e.target.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedItem(null);
        setDraggedType(null);
    };

    const handleDragOver = (e) => e.preventDefault();

    const handleDrop = (e, targetId, type) => {
        e.preventDefault();
        if (!draggedItem || draggedItem === targetId || draggedType !== type) return;

        const currentOrder = type === 'kpi' ? kpiOrder : chartOrder;
        const newOrder = [...currentOrder];
        const draggedIdx = newOrder.indexOf(draggedItem);
        const targetIdx = newOrder.indexOf(targetId);

        newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, draggedItem);

        savePreferences(type, newOrder, null);
    };

    const toggleVisibility = (id, type) => {
        const currentHidden = type === 'kpi' ? hiddenKpis : hiddenCharts;
        const newHidden = currentHidden.includes(id) 
            ? currentHidden.filter(k => k !== id)
            : [...currentHidden, id];
        savePreferences(type, null, newHidden);
    };

    if (loading) return <div className="loading-screen">Chargement...</div>;

    const hasPartAlerts = alertList.parts.length > 0;
    const hasMaintAlerts = alertList.maintenance.length > 0;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div>
                    <h1 className="gradient-text">Bonjour, {user?.user_metadata?.full_name || "Pilote"}</h1>
                    <div className="header-controls">
                        <div className="time-filters glass-panel">
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

                        <button 
                            className={`edit-dashboard-btn ${isEditMode ? 'active' : ''}`}
                            onClick={() => setIsEditMode(!isEditMode)}
                            title="Modifier l'affichage"
                        >
                            <FaEdit />
                        </button>

                        <div className="alerts-container" onClick={() => (hasPartAlerts || hasMaintAlerts) && setShowAlertModal(true)} 
                             style={{cursor: (hasPartAlerts || hasMaintAlerts) ? 'pointer' : 'default'}}>
                            <div className={`alert-bubble parts ${hasPartAlerts ? 'active' : 'inactive'}`}>
                                <FaExclamationTriangle />
                                {hasPartAlerts && <span className="badge-dot"></span>}
                            </div>
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

            {/* MODALE ALERTES (Identique) */}
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
                                    <div className="alert-info"><strong>{item.bikeName}</strong><span>{item.part} ({item.status})</span></div>
                                    <FaArrowRight className="arrow" />
                                </div>
                            ))}
                            {alertList.maintenance.map((item, idx) => (
                                <div key={`maint-${idx}`} className="alert-item warning" onClick={() => navigate(`/app/bike/${item.bikeId}`)}>
                                    <div className="alert-icon"><FaWrench /></div>
                                    <div className="alert-info"><strong>{item.bikeName}</strong><span>{item.task}</span></div>
                                    <FaArrowRight className="arrow" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* KPI GRID (KPI TYPE) */}
            <div className={`kpi-grid ${isEditMode ? 'edit-mode' : ''}`}>
                {kpiOrder.map(key => {
                    const item = kpiValues[key];
                    if (!item) return null;
                    const isHidden = hiddenKpis.includes(key);
                    if (!isEditMode && isHidden) return null;

                    return (
                        <div 
                            key={key}
                            className={`kpi-card glass-panel ${item.color} ${isHidden ? 'hidden-item' : ''}`}
                            draggable={isEditMode}
                            onDragStart={(e) => handleDragStart(e, key, 'kpi')}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, key, 'kpi')}
                            onClick={() => !isEditMode && navigate(item.link)}
                            style={{cursor: isEditMode ? 'grab' : 'pointer'}}
                        >
                            {isEditMode && (
                                <div className="kpi-edit-controls">
                                    <FaGripVertical className="drag-handle" />
                                    <button onClick={(e) => { e.stopPropagation(); toggleVisibility(key, 'kpi'); }} className="vis-btn">
                                        {isHidden ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                            )}
                            <div className="kpi-icon">{item.icon}</div>
                            <div className="kpi-content">
                                <span className="kpi-label">{item.label}</span>
                                <span className="kpi-value">{item.val} <small>{item.unit}</small></span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="dashboard-layout">
                <div className="main-column">
                    {/* GRAPHIQUES AVEC PROPS D'EDITION */}
                    <ChartsSection 
                        activities={filteredData} 
                        allActivities={activities} 
                        period={period} 
                        bikes={bikes}
                        isEditMode={isEditMode}
                        chartOrder={chartOrder}
                        hiddenCharts={hiddenCharts}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        toggleVisibility={toggleVisibility}
                    />
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