import React, { useState, useEffect } from 'react';
import { historyService } from '../../services/api';
import { FaPen, FaCalendarDay, FaPlus, FaWrench, FaCogs, FaStickyNote, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import './HistoryTab.css';

function HistoryTab({ bikeId }) {
    const [history, setHistory] = useState([]);
    const [noteData, setNoteData] = useState({ text: '', date: new Date().toISOString().split('T')[0] });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        loadHistory();
    }, [bikeId]);

    const loadHistory = async () => {
        const data = await historyService.getByBikeId(bikeId);
        setHistory(data || []);
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteData.text.trim()) return;

        setAdding(true);
        try {
            await historyService.add({
                bike_id: bikeId,
                type: 'note',
                title: 'Note manuelle',
                description: noteData.text,
                date: noteData.date
            });
            setNoteData({ text: '', date: new Date().toISOString().split('T')[0] });
            loadHistory();
        } catch (e) {
            console.error(e);
        } finally {
            setAdding(false);
        }
    };

    // NOUVEAU : Suppression d'un élément de l'historique
    const handleDelete = async (id) => {
        if(window.confirm("Supprimer cette entrée de l'historique ?")) {
            try {
                await historyService.delete(id);
                loadHistory();
            } catch (e) {
                console.error("Erreur suppression", e);
            }
        }
    };

    const getEventStyle = (type) => {
        switch(type) {
            case 'maintenance': return { icon: <FaWrench />, color: '#f59e0b', label: 'Entretien' };
            case 'part_change': return { icon: <FaCogs />, color: '#3b82f6', label: 'Pièce' };
            case 'incident': return { icon: <FaExclamationTriangle />, color: '#ef4444', label: 'Incident' };
            default: return { icon: <FaStickyNote />, color: '#94a3b8', label: 'Note' };
        }
    };

    return (
        <div className="history-tab">
            <div className="glass-panel history-form-panel">
                <form onSubmit={handleAddNote} className="note-form">
                    <div className="input-row">
                        <input 
                            type="date" 
                            className="date-input"
                            value={noteData.date}
                            onChange={(e) => setNoteData({...noteData, date: e.target.value})}
                        />
                        <input 
                            type="text" 
                            className="text-input"
                            placeholder="Ajouter une note..." 
                            value={noteData.text}
                            onChange={(e) => setNoteData({...noteData, text: e.target.value})}
                        />
                        <button type="submit" className="add-mini-btn" disabled={adding}>
                            {adding ? '...' : <FaPlus />}
                        </button>
                    </div>
                </form>
            </div>

            <div className="timeline">
                {history.map((event) => {
                    const style = getEventStyle(event.type);
                    return (
                        <div key={event.id} className="timeline-item">
                            <div className="timeline-marker" style={{backgroundColor: style.color, boxShadow: `0 0 10px ${style.color}`}}>
                                {style.icon}
                            </div>
                            
                            <div className="timeline-content glass-panel" style={{borderLeft: `3px solid ${style.color}`}}>
                                <div className="timeline-header">
                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                        <span className="event-type-badge" style={{color: style.color}}>{style.label}</span>
                                        <span className="event-date"><FaCalendarDay /> {event.date}</span>
                                    </div>
                                    {/* Bouton suppression discret */}
                                    <button onClick={() => handleDelete(event.id)} className="delete-history-btn">
                                        <FaTrash />
                                    </button>
                                </div>
                                <h4 className="event-title">{event.title}</h4>
                                {event.description && <p className="event-desc">{event.description}</p>}
                                {event.km && <span className="event-km">à {event.km} km</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default HistoryTab;