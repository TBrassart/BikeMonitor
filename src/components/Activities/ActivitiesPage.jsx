import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FaCalendarAlt, FaRoad, FaMountain, FaBicycle, FaRunning, FaHiking } from 'react-icons/fa';
import './ActivitiesPage.css';

function ActivitiesPage() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActivities();
    }, []);

    const loadActivities = async () => {
        try {
            setLoading(true);
            const data = await api.getActivities();
            setActivities(data || []);
        } catch (e) {
            console.error("Erreur activités:", e);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m < 10 ? '0' : ''}${m}`;
    };

    // Icône selon le type de sport Strava
    const getSportIcon = (type) => {
        if (type === 'Run') return <FaRunning />;
        if (type === 'Hike' || type === 'Walk') return <FaHiking />;
        return <FaBicycle />; // Par défaut (Ride, VirtualRide, Gravel...)
    };

    return (
        <div className="activities-page">
            <h2 className="gradient-text">Activités Récentes</h2>
            
            {loading ? (
                <div className="loading">Chargement...</div>
            ) : (
                <div className="activities-list">
                    {activities.length === 0 ? (
                        <div className="empty-state glass-panel">
                            <p>Aucune activité synchronisée.</p>
                        </div>
                    ) : (
                        activities.map(act => {
                            // CORRECTION UNITÉS :
                            // Si la valeur est très grande (> 1000), c'est sûrement des mètres stockés comme tel
                            // Sinon c'est déjà des km. On gère les deux cas par sécurité.
                            const distanceKm = act.distance > 1000 ? act.distance / 1000 : act.distance;

                            return (
                                <div key={act.id} className="activity-card glass-panel">
                                    {/* 1. ICONE DU SPORT À GAUCHE */}
                                    <div className="act-icon-container">
                                        {getSportIcon(act.type)}
                                    </div>

                                    <div className="act-details">
                                        <h4>{act.name}</h4>
                                        
                                        {/* 2. MÉTA-DONNÉES REGROUPÉES (Date | Dist | D+ | Temps) */}
                                        <div className="act-meta">
                                            <span className="meta-item"><FaCalendarAlt /> {formatDate(act.start_date)}</span>
                                            <span className="meta-item highlight"><FaRoad /> {Number(distanceKm).toFixed(1)} km</span>
                                            {/* 3. DÉNIVELÉ INTÉGRÉ ICI */}
                                            <span className="meta-item highlight"><FaMountain /> {Math.round(act.total_elevation_gain)}m</span>
                                            <span className="meta-item">⏱️ {formatTime(act.moving_time)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

export default ActivitiesPage;