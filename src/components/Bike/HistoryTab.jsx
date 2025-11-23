import React, { useState, useEffect } from 'react';
import { historyService } from '../../services/api';
import './HistoryTab.css';

function HistoryTab({ bikeId }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, [bikeId]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const data = await historyService.getByBikeId(bikeId);
            setHistory(data);
        } catch (e) {
            console.error("Erreur historique:", e);
        } finally {
            setLoading(false);
        }
    };

    // Fonction utilitaire pour l'icône selon le type d'event
    const getIcon = (type) => {
        switch(type) {
            case 'maintenance': return '🔧';
            case 'part_change': return '⚙️';
            case 'note': return '📝';
            case 'incident': return '⚠️';
            default: return '📅';
        }
    };

    if (loading) return <div>Chargement de l'historique...</div>;

    return (
        <div className="history-tab">
            <h3>Historique du vélo</h3>
            
            {history.length === 0 ? (
                <div className="empty-history">
                    <p>Rien à signaler pour l'instant.</p>
                    <p>L'historique se remplit automatiquement quand tu valides un entretien ou changes une pièce.</p>
                </div>
            ) : (
                <div className="timeline">
                    {history.map((event) => (
                        <div key={event.id} className="timeline-item">
                            <div className="timeline-icon">
                                {getIcon(event.type)}
                            </div>
                            <div className="timeline-content">
                                <div className="timeline-header">
                                    <span className="event-title">{event.title}</span>
                                    <span className="event-date">{event.date}</span>
                                </div>
                                {event.description && (
                                    <p className="event-desc">{event.description}</p>
                                )}
                                {event.km && (
                                    <span className="event-km">à {event.km} km</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default HistoryTab;