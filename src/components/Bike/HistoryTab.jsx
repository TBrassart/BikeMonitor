import React, { useState, useEffect } from 'react';
import { historyService } from '../../services/api';
import { FaPen, FaCalendarDay, FaPlus } from 'react-icons/fa';
import './HistoryTab.css';

function HistoryTab({ bikeId }) {
    const [history, setHistory] = useState([]);
    const [note, setNote] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        loadHistory();
    }, [bikeId]);

    const loadHistory = async () => {
        const data = await historyService.getByBikeId(bikeId);
        setHistory(data || []);
    };

    const handleAddNote = async (e) => {
        e.preventDefault(); // Empêche le rechargement de la page
        if (!note.trim()) return;

        setAdding(true);
        try {
            await historyService.add({
                bike_id: bikeId,
                type: 'note',
                title: 'Note manuelle',
                description: note,
                date: new Date().toISOString().split('T')[0]
            });
            setNote(''); // Vide le champ
            loadHistory(); // Recharge la liste
        } catch (e) {
            console.error(e);
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="history-tab">
            {/* FORMULAIRE MANUEL SÉCURISÉ */}
            <div className="glass-panel" style={{padding: '15px', marginBottom: '20px'}}>
                <form onSubmit={handleAddNote} style={{display: 'flex', gap: '10px'}}>
                    <input 
                        type="text" 
                        className="note-input"
                        placeholder="Ajouter une note (ex: Sortie sous la pluie)..." 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                    <button type="submit" className="add-mini-btn" disabled={adding}>
                        {adding ? '...' : <FaPlus />}
                    </button>
                </form>
            </div>

            <div className="timeline">
                {history.map((event) => (
                    <div key={event.id} className="timeline-item">
                        <div className="timeline-marker"></div>
                        <div className="timeline-content glass-panel">
                            <div className="timeline-header">
                                <span className="event-title">{event.title}</span>
                                <span className="event-date">{event.date}</span>
                            </div>
                            {event.description && <p className="event-desc">{event.description}</p>}
                            {event.km && <span className="event-km">à {event.km} km</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default HistoryTab;