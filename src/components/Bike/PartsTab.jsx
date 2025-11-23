import React, { useState, useEffect } from 'react';
import { partsService } from '../../services/api';
import { FaPlus, FaCogs, FaCompactDisc, FaCircle, FaWrench, FaTrash } from 'react-icons/fa';
import PartForm from './PartForm';
import './PartsTab.css';

function PartsTab({ bikeId }) {
    const [parts, setParts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadParts();
    }, [bikeId]);

    const loadParts = async () => {
        try {
            setLoading(true);
            const data = await partsService.getByBikeId(bikeId);
            setParts(data);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    // --- LOGIQUE D'USURE ---
    const getWearStatus = (current, target) => {
        if (!target) return { pct: 0, color: 'var(--neon-green)' };
        const pct = Math.min(Math.round((current / target) * 100), 100);
        
        let color = 'var(--neon-green)'; // Vert
        if (pct >= 75) color = '#f59e0b'; // Orange
        if (pct >= 100) color = '#ef4444'; // Rouge
        
        return { pct, color };
    };

    // --- ICONES ---
    const getIcon = (cat) => {
        const c = cat ? cat.toLowerCase() : '';
        if (c.includes('transmission') || c.includes('chain')) return <FaCogs />;
        if (c.includes('frein') || c.includes('brake')) return <FaCompactDisc />;
        if (c.includes('pneu') || c.includes('tire')) return <FaCircle />;
        return <FaWrench />;
    };

    const handleDelete = async (id) => {
        if(window.confirm("Supprimer cette pièce ?")) {
            await partsService.delete(id);
            loadParts();
        }
    };

    if (loading) return <div className="loading-text">Scan des composants...</div>;

    return (
        <div className="parts-tab">
            <div className="tab-actions-row">
                <h3 className="gradient-text">Composants</h3>
                <button onClick={() => setShowForm(!showForm)} className="add-mini-btn">
                    <FaPlus />
                </button>
            </div>

            {showForm && (
                <div className="glass-panel form-wrapper">
                    <PartForm bikeId={bikeId} onSuccess={() => { setShowForm(false); loadParts(); }} onCancel={() => setShowForm(false)} />
                </div>
            )}

            <div className="parts-list">
                {parts.length === 0 ? (
                    <div className="empty-state glass-panel">
                        <p>Aucune pièce installée.</p>
                    </div>
                ) : (
                    parts.map(part => {
                        const { pct, color } = getWearStatus(part.km_current, part.life_target_km);
                        const isCritical = pct >= 100;

                        return (
                            <div key={part.id} className={`part-card glass-panel ${isCritical ? 'critical-border' : ''}`}>
                                <div className="part-icon-box" style={{color: color}}>
                                    {getIcon(part.category)}
                                </div>
                                
                                <div className="part-content">
                                    <div className="part-header">
                                        <h4>{part.name}</h4>
                                        <span className="part-cat">{part.category}</span>
                                    </div>

                                    {/* BARRE D'USURE */}
                                    <div className="wear-container">
                                        <div className="wear-labels">
                                            <span>Usure {pct}%</span>
                                            <span>{part.km_current} / {part.life_target_km} km</span>
                                        </div>
                                        <div className="progress-bg">
                                            <div 
                                                className="progress-fill" 
                                                style={{ width: `${pct}%`, backgroundColor: color }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => handleDelete(part.id)} className="trash-icon">
                                    <FaTrash />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default PartsTab;