import React, { useState, useEffect } from 'react';
import { historyService } from '../../services/api';
import { FaPen, FaCalendarDay } from 'react-icons/fa';
import './HistoryTab.css';

function HistoryTab({ bikeId }) {
    const [history, setHistory] = useState([]);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, [bikeId]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const data = await historyService.getByBikeId(bikeId);
            setHistory(data || []);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!note.trim()) return;

        try {
            await historyService.add({
                bike_id: bikeId,
                type: 'note',
                title: 'Note manuelle',
                description: note,
                date: new Date().toISOString().split('T')[0]
            });
            setNote('');
            loadHistory();
        } catch (e) {
            alert("Erreur ajout note");
        }
    };

    return (
        <div className="history-tab">
            {/* FORMULAIRE D'AJOUT DE NOTE */}
            <form onSubmit={handleAddNote} className="history-input-group glass-panel">
                <input 
                    type="text" 
                    placeholder="Ajouter une note à l'historique..." 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
                <button type="submit" className="icon-btn-small">
                    <FaPen />
                </button>
            </form>

            <div className="timeline">
                {history.map((event) => (
                    <div key={event.id} className="timeline-item">
                        <div className="timeline-marker"></div>
                        <div className="timeline-content glass-panel">
                            <div className="timeline-header">
                                <span className="event-title">{event.title}</span>
                                <span className="event-date"><FaCalendarDay /> {event.date}</span>
                            </div>
                            {event.description && <p className="event-desc">{event.description}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default HistoryTab;