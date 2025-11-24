import React, { useState, useEffect } from 'react';
import { partsService, historyService, bikeService } from '../../services/api';
import { specsService } from '../../services/specsService';
import { FaPlus, FaCogs, FaCompactDisc, FaCircle, FaWrench, FaTrash, FaSyncAlt, FaCloudDownloadAlt } from 'react-icons/fa';
import PartForm from './PartForm';
import './PartsTab.css';

function PartsTab({ bikeId }) {
    const [parts, setParts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

    const [importing, setImporting] = useState(false);

    useEffect(() => {
        loadParts();
    }, [bikeId]);

    const loadParts = async () => {
        try {
            setLoading(true);
            const data = await partsService.getByBikeId(bikeId);
            setParts(data.filter(p => p.status !== 'archived'));
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    const handleAutoImport = async () => {
        setImporting(true);
        try {
            // 1. On récupère les infos du vélo (Marque, Modèle, Année)
            const bike = await bikeService.getById(bikeId);
            
            if (!bike.brand || !bike.model || !bike.model_year) {
                alert("Il manque la Marque, le Modèle ou l'Année dans la fiche vélo pour faire une recherche.");
                setImporting(false);
                return;
            }

            // 2. On appelle notre service (Simulation pour l'instant)
            const foundParts = await specsService.fetchSpecs(bike.brand, bike.model_year, bike.model);

            if (!foundParts || foundParts.length === 0) {
                alert("Aucune fiche technique trouvée pour ce modèle.");
                setImporting(false);
                return;
            }

            // 3. On demande confirmation
            const confirm = window.confirm(`${foundParts.length} pièces trouvées. Voulez-vous les ajouter à votre inventaire ?`);
            
            if (confirm) {
                // 4. On ajoute chaque pièce
                const today = new Date().toISOString().split('T')[0];
                for (const part of foundParts) {
                    await partsService.add({
                        bike_id: bikeId,
                        name: part.name,
                        category: part.category,
                        life_target_km: part.life_target_km,
                        installation_date: today,
                        km_current: 0, // On suppose qu'elles sont neuves ou on commence le suivi ici
                        status: 'ok'
                    });
                }
                loadParts(); // Rafraîchir la liste
                alert("Pièces importées avec succès ! 🚀");
            }

        } catch (e) {
            console.error(e);
            alert("Erreur lors de l'import.");
        } finally {
            setImporting(false);
        }
    };

    // --- ACTION REMPLACER PIÈCE (CORRIGÉE) ---
    const handleReplace = async (part) => {
        const confirm = window.confirm(`Remplacer "${part.name}" ?\nCela l'archivera et ajoutera une note dans l'historique.`);
        if (!confirm) return;

        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Archiver la pièce actuelle
            // CORRECTION : On retire 'notes' qui faisait planter car la colonne n'existe pas sur 'parts'
            await partsService.update(part.id, { 
                status: 'archived'
            });

            // 2. Ajouter à l'historique (Là on peut mettre une description)
            await historyService.add({
                bike_id: bikeId,
                type: 'part_change',
                title: `Remplacement : ${part.name}`,
                description: `Pièce archivée après ${part.km_current} km.`,
                date: today,
                km: part.km_current // On garde le km final
            });

            loadParts();
            // On ouvre le formulaire pour ajouter la remplaçante immédiatement
            setShowForm(true);

        } catch (e) {
            console.error(e);
            alert("Erreur lors du remplacement. Vérifiez la console.");
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

                
                <div className="actions-group" style={{display:'flex', gap:'10px'}}>
                    <button 
                        onClick={handleAutoImport} 
                        className="import-btn" 
                        disabled={importing}
                        title="Importer depuis 99spokes (Beta)"
                    >
                        {importing ? '...' : <><FaCloudDownloadAlt /> Auto-Detect</>}
                    </button>

                    <button onClick={() => setShowForm(!showForm)} className="add-mini-btn">
                        <FaPlus />
                    </button>
                </div>
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
                                    <button onClick={() => handleReplace(part)} className="action-icon-btn replace" title="Remplacer">
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