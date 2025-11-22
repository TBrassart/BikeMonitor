import React, { useState, useEffect } from 'react';
import { FaWrench, FaExchangeAlt, FaStickyNote, FaPlus, FaCalendarAlt, FaRoad } from 'react-icons/fa';
import { bikeService } from '../../services/api';
import './HistoryTab.css';

const HistoryTab = ({ bikeId }) => {
    const [events, setEvents] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    // 1. AJOUT DU CHAMP DATE (initialisé à aujourd'hui)
    const [newEvent, setNewEvent] = useState({ 
        type: 'note', 
        title: '', 
        description: '', 
        km: '', 
        date: new Date().toISOString().split('T')[0] 
    });

    useEffect(() => {
        const loadHistory = async () => {
            const data = await bikeService.getBikeHistory(bikeId);
            setEvents(data);
        };
        loadHistory();
    }, [bikeId]);

    const handleAddEvent = async (e) => {
        e.preventDefault();
        if (!newEvent.title) return;

        const savedEvent = await bikeService.addHistoryEvent({ ...newEvent, bikeId });
        setEvents(prev => [savedEvent, ...prev]); 
        setIsFormOpen(false);
        // Reset avec date du jour par défaut
        setNewEvent({ type: 'note', title: '', description: '', km: '', date: new Date().toISOString().split('T')[0] });
    };

    const getIcon = (type) => {
        switch (type) {
            case 'maintenance': return <FaWrench />;
            case 'part': return <FaExchangeAlt />;
            default: return <FaStickyNote />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'maintenance': return 'Entretien';
            case 'part': return 'Pièce';
            default: return 'Note';
        }
    };

    return (
        <div className="history-container">
            {!isFormOpen ? (
                <button className="cta-add-standard" onClick={() => setIsFormOpen(true)}>
                    <FaPlus /> Ajouter une note / événement
                </button>
            ) : (
                <form className="history-form" onSubmit={handleAddEvent}>
                    <h3>Nouvel événement</h3>
                    <div className="form-row">
                        <select 
                            value={newEvent.type} 
                            onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                        >
                            <option value="note">Note</option>
                            <option value="maintenance">Entretien</option>
                            <option value="part">Changement Pièce</option>
                        </select>
                        
                        {/* 2. AJOUT DE L'INPUT DATE ICI */}
                        <input 
                            type="date"
                            value={newEvent.date}
                            onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                            required
                        />
                    </div>
                    
                    <div className="form-row">
                         <input 
                            type="text" 
                            placeholder="Titre (ex: Chute, Réglage)" 
                            value={newEvent.title}
                            onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                            required 
                            style={{flex: 2}} // Un peu plus large
                        />
                        <input 
                            type="number" 
                            placeholder="Km compteur" 
                            value={newEvent.km}
                            onChange={e => setNewEvent({...newEvent, km: e.target.value})}
                            style={{flex: 1}}
                        />
                    </div>
                    
                    <div className="form-row">
                         <textarea 
                            placeholder="Détails..." 
                            value={newEvent.description}
                            onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                            rows="2"
                        />
                    </div>
                    
                    <div className="form-actions-inline">
                        <button type="button" className="cancel-btn-small" onClick={() => setIsFormOpen(false)}>Annuler</button>
                        <button type="submit" className="save-btn-small">Ajouter</button>
                    </div>
                </form>
            )}

            <div className="timeline">
                {events.map(event => (
                    <div key={event.id} className={`timeline-item ${event.type}`}>
                        <div className="timeline-marker">
                            {getIcon(event.type)}
                        </div>
                        <div className="timeline-content">
                            <div className="timeline-header">
                                {/* Affichage de la date de l'événement stockée */}
                                <span className="event-date"><FaCalendarAlt /> {new Date(event.date).toLocaleDateString()}</span>
                                {event.km && <span className="event-km"><FaRoad /> {event.km} km</span>}
                            </div>
                            <h4>{event.title}</h4>
                            {event.description && <p>{event.description}</p>}
                            <span className="event-tag">{getTypeLabel(event.type)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HistoryTab;