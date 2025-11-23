import React, { useState, useEffect } from 'react';
import { api, authService } from '../../services/api';
import { FaStrava, FaCalendarAlt, FaRoad } from 'react-icons/fa';
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
            // L'appel api.getActivities() est déjà filtré par user_id dans api.js
            const data = await api.getActivities();
            setActivities(data || []);
        } catch (e) {
            console.error("Erreur activités:", e);
        } finally {
            setLoading(false);
        }
    };

    // Formatage de la date (ex: 24 Nov 2024)
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    // Conversion secondes -> H:MM
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m < 10 ? '0' : ''}${m}`;
    };

    return (
        <div className="activities-page">
            <h2>Activités Récentes</h2>
            
            {loading ? (
                <div className="loading">Chargement de vos sorties...</div>
            ) : (
                <div className="activities-list">
                    {activities.length === 0 ? (
                        <div className="empty-state glass-panel">
                            <p>Aucune activité synchronisée.</p>
                            <small>Connectez Strava dans les paramètres pour voir vos sorties ici.</small>
                        </div>
                    ) : (
                        activities.map(act => (
                            <div key={act.id} className="activity-card glass-panel">
                                <div className="act-icon">
                                    <FaStrava />
                                </div>
                                <div className="act-details">
                                    <h4>{act.name}</h4>
                                    <div className="act-meta">
                                        <span><FaCalendarAlt /> {formatDate(act.start_date)}</span>
                                        <span><FaRoad /> {Number(act.distance).toFixed(1)} km</span>
                                        <span>⏱️ {formatTime(act.moving_time)}</span>
                                    </div>
                                </div>
                                <div className="act-elevation">
                                    {Math.round(act.total_elevation_gain)}m D+
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default ActivitiesPage;