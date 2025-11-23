import React, { useState, useEffect } from 'react';
import { partsService, historyService } from '../../services/api';
import { FaPlus, FaCogs, FaCompactDisc, FaCircle, FaWrench, FaTrash, FaSyncAlt } from 'react-icons/fa';
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
            // On filtre les pièces actives si l'API ne le fait pas déjà
            setParts(data.filter(p => p.status !== 'archived'));
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    // --- ACTION REMPLACER PIÈCE ---
    const handleReplace = async (part) => {
        const confirm = window.confirm(`Remplacer "${part.name}" ?\nCela l'archivera et ajoutera une note dans l'historique.`);
        if (!confirm) return;

        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Archiver la pièce actuelle
            await partsService.update(part.id, { 
                status: 'archived',
                notes: `Remplacée le ${today}`
            });

            // 2. Ajouter à l'historique
            await historyService.add({
                bike_id: bikeId,
                type: 'part_change', // Sera affiché en bleu/engrenage
                title: `Remplacement : ${part.name}`,
                description: `Pièce remplacée après ${part.km_current} km d'utilisation.`,
                date: today
            });

            // 3. Recharger
            loadParts();
            // Optionnel : Ouvrir le formulaire pour ajouter la nouvelle
            setShowForm(true);

        } catch (e) {
            alert("Erreur lors du remplacement");
        }
    };

    const handleDelete = async (id) => {
        if(window.confirm("Supprimer définitivement cette pièce ?")) {
            await partsService.delete(id);
            loadParts();
        }
    };

    const getWearStatus = (current, target) => {
        if (!target) return { pct: 0, color: 'var(--neon-green)' };
        const pct = Math.min(Math.round((current / target) * 100), 100);
        let color = 'var(--neon-green)';
        if (pct >= 75) color = '#f59e0b';
        if (pct >= 100) color = '#ef4444';
        return { pct, color };
    };

    const getIcon = (cat) => {
        const c = cat ? cat.toLowerCase() : '';
        if (c.includes('transmission')) return <FaCogs />;
        if (c.includes('frein')) return <FaCompactDisc />;
        if (c.includes('pneu')) return <FaCircle />;
        return <FaWrench />;
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
                    <div className="empty-state glass-panel"><p>Aucune pièce active.</p></div>
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
                                    <div className="wear-container">
                                        <div className="wear-labels">
                                            <span>Usure {pct}%</span>
                                            <span>{part.km_current} / {part.life_target_km} km</span>
                                        </div>
                                        <div className="progress-bg">
                                            <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: color }}></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="part-actions">
                                    {/* BOUTON REMPLACER */}
                                    <button onClick={() => handleReplace(part)} className="action-icon-btn replace" title="Remplacer la pièce">
                                        <FaSyncAlt />
                                    </button>
                                    <button onClick={() => handleDelete(part.id)} className="action-icon-btn delete" title="Supprimer">
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default PartsTab;