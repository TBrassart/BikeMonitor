import React, { useState, useEffect } from 'react';
// Ajoute FaToggleOn/Off si tu veux des icônes, ou on utilise un switch CSS
import { FaRoad, FaClock, FaCalendarCheck, FaExclamationTriangle, FaBicycle, FaArrowRight } from 'react-icons/fa';
import { bikeService } from '../../services/api';
import { Link } from 'react-router-dom';
import WeatherWidget from './WeatherWidget';
import './Dashboard.css';
import ChartsSection from './ChartsSection';

const Dashboard = ({ currentProfile }) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // ÉTATS FILTRES
    const [period, setPeriod] = useState('month');
    const [isRolling, setIsRolling] = useState(false); // False = Calendaire, True = Glissant

    useEffect(() => {
        if (currentProfile) {
            loadDashboard();
        }
    }, [currentProfile, period, isRolling]); // Recharge si l'un des deux change

    const loadDashboard = async () => {
        try {
            // On passe les deux paramètres
            const dashboardData = await bikeService.getDashboardData(currentProfile.id, period, isRolling);
            setData(dashboardData);
        } catch (e) {
            console.error("Erreur dashboard", e);
        } finally {
            setIsLoading(false);
        }
    };

    const periods = [
        { id: 'week', label: 'Semaine' },
        { id: 'month', label: 'Mois' },
        { id: 'year', label: 'Année' },
    ];

    if (isLoading) return <div className="dashboard-container">Chargement...</div>;
    if (!data) return <div className="dashboard-container">Erreur de chargement.</div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Bonjour, {currentProfile.name.split(' ')[0]}</h1>
                <p className="subtitle">Prêt à rouler ? Voici ce qu'il faut savoir.</p>
            </header>

            <WeatherWidget />

            {/* BARRE D'OUTILS : FILTRES + TOGGLE */}
            <div className="stats-toolbar">
                
                {/* Zone Gauche : Chips */}
                <div className="stats-filter-chips">
                    {periods.map(p => (
                        <button 
                            key={p.id}
                            className={`filter-chip ${period === p.id ? 'active' : ''}`}
                            onClick={() => setPeriod(p.id)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Zone Droite : Toggle Glissant */}
                <div className="rolling-toggle" onClick={() => setIsRolling(!isRolling)}>
                    <span className={`toggle-label ${isRolling ? 'active' : ''}`}>Glissant</span>
                    <div className={`toggle-switch ${isRolling ? 'on' : 'off'}`}>
                        <div className="toggle-handle"></div>
                    </div>
                </div>
            </div>

            {/* KPI DYNAMIQUES */}
            <div className="stats-overview">
                <div className="stat-card highlight">
                    <div className="stat-icon"><FaRoad /></div>
                    <div className="stat-content">
                        <h3>{data.stats.km} km</h3>
                        <p>Distance</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><FaClock /></div>
                    <div className="stat-content">
                        <h3>{data.stats.hours} h</h3>
                        <p>Temps</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><FaBicycle /></div>
                    <div className="stat-content">
                        <h3>{data.stats.count}</h3>
                        <p>Sorties</p>
                    </div>
                </div>
            </div>

            <ChartsSection 
                profileId={currentProfile.id} 
                period={period}
                isRolling={isRolling}
            />

            <div className="dashboard-grid">
                <section className="dashboard-section">
                    <div className="section-header">
                        <h2><FaCalendarCheck /> Maintenance</h2>
                        {data.maintenance.length > 0 && <Link to="/garage">Voir tout</Link>}
                    </div>
                    
                    {data.maintenance.length === 0 ? (
                        <div className="empty-card">
                            <p>✅ Rien à signaler. Tes vélos sont prêts !</p>
                        </div>
                    ) : (
                        <div className="alert-list">
                            {data.maintenance.map(m => (
                                <div key={m.id} className="alert-item">
                                    <div className="alert-icon maintenance">
                                        {m.isPart ? <FaExclamationTriangle /> : <FaCalendarCheck />}
                                    </div>
                                    <div className="alert-info">
                                        <h4>{m.type}</h4>
                                        <p>
                                            {m.bikes?.name} 
                                            {!m.isPart && ` • ${new Date(m.date_due).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="dashboard-section">
                    <div className="section-header">
                        <h2>🍎 Nutrition & Stock</h2>
                        <Link to="/nutrition">Gérer</Link>
                    </div>

                    {data.lowStock.length === 0 ? (
                        <div className="empty-card">
                            <p>✅ Stock suffisant.</p>
                        </div>
                    ) : (
                        <div className="alert-list">
                            {data.lowStock.map(item => (
                                <div key={item.id} className="alert-item">
                                    <div className="alert-icon stock"><FaExclamationTriangle /></div>
                                    <div className="alert-info">
                                        <h4>{item.name}</h4>
                                        <p>Reste : <strong>{item.quantity}</strong> (Min: {item.min_quantity})</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
            
            <Link to="/kits" className="cta-main">
                Préparer une sortie <FaArrowRight />
            </Link>
        </div>
    );
};

export default Dashboard;