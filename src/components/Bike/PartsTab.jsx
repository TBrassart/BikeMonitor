import React, { useState, useEffect } from 'react';
import { partsService, historyService, bikeService } from '../../services/api';
import { FaPlus, FaCogs, FaCompactDisc, FaCircle, FaWrench, FaTrash, FaSyncAlt, FaSearch } from 'react-icons/fa';
import AddPartModal from './AddPartModal';
import './PartsTab.css';

function PartsTab({ bikeId }) {
    const [parts, setParts] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentBikeKm, setCurrentBikeKm] = useState(0);

    useEffect(() => {
        loadData();
    }, [bikeId]);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // 1. Charger le vélo pour avoir son kilométrage TOTAL actuel
            const bike = await bikeService.getById(bikeId);
            setCurrentBikeKm(bike.total_km || 0);

            // 2. Charger les pièces
            const partsData = await partsService.getByBikeId(bikeId);
            setParts(partsData.filter(p => p.status !== 'archived'));
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    // --- REMPLACEMENT INTELLIGENT ---
    const handleReplace = async (part) => {
        const replaceSame = window.confirm(
            `Remplacer "${part.name}" ?\n\n` +
            `[OK] = Remplacer par la MÊME pièce (Neuf)\n` +
            `[ANNULER] = Choisir une autre pièce (Ouvrir bibliothèque)`
        );

        const today = new Date().toISOString().split('T')[0];

        try {
            // 1. Archiver la pièce actuelle
            await partsService.update(part.id, {
                status: 'archived',
                removal_date: today
            });

            if (replaceSame) {
                // 2. Créer copie identique
                const bike = await bikeService.getById(bikeId);
                await partsService.add({
                    bike_id: bikeId,
                    name: part.name,
                    category: part.category,
                    life_target_km: part.life_target_km,
                    installation_date: today,
                    km_current: bike.total_km || 0,
                    status: 'ok'
                });
                loadData();
            } else {
                // 3. Ouvrir la bibliothèque pour choisir la nouvelle
                loadData(); // Pour faire disparaître l'ancienne
                setShowLibrary(true);
            }

        } catch (e) {
            console.error(e);
            alert("Erreur technique.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Supprimer définitivement ce composant ?")) {
            await partsService.delete(id);
            loadData();
        }
    };

    // --- CALCUL DE L'USURE CORRIGÉ ---
    const getWearStatus = (installBikeKm, targetKm) => {
        if (!targetKm) return { pct: 0, color: '#4ade80', usage: 0 };
        
        // Formule : (Total Vélo Actuel) - (Km du vélo au moment de l'installation)
        // Math.max(0, ...) pour éviter les négatifs si incohérence de dates
        const usage = Math.max(0, currentBikeKm - installBikeKm);
        
        const pct = Math.min(100, Math.round((usage / targetKm) * 100));
        
        let color = '#4ade80'; // Vert
        if (pct > 75) color = '#fbbf24'; // Jaune
        if (pct > 90) color = '#f87171'; // Rouge
        if (pct >= 100) color = '#ef4444'; // Rouge vif
        
        return { pct, color, usage };
    };
    
    // Petite fonction pour gérer l'icône selon la catégorie
    const getIcon = (cat) => {
        const c = (cat || '').toLowerCase();
        if (c.includes('pneu')) return <FaCircle />; 
        if (c.includes('trans')) return <FaCogs />;
        if (c.includes('frein')) return <FaCompactDisc />;
        return <FaWrench />;
    };

    return (
        <div className="parts-tab">
            {/* EN-TÊTE SIMPLIFIÉ */}
            <div className="tab-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="gradient-text" style={{ margin: 0 }}>Composants</h3>
                
                {/* UN SEUL BOUTON */}
                <button 
                    onClick={() => setShowAddModal(true)} 
                    className="primary-btn" 
                    title="Ajouter un composant"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px' }}
                >
                    <FaPlus /> Ajouter une pièce
                </button>
            </div>

            {/* MODALE UNIFIÉE (Onglets Biblio / Manuel) */}
            {showAddModal && (
                <AddPartModal 
                    bikeId={bikeId}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => { setShowAddModal(false); loadData(); }}
                />
            )}

            {/* LISTE */}
            <div className="parts-list">
                {loading ? <div className="loading-text">Chargement...</div> : (
                    parts.length === 0 ? <div className="empty-state glass-panel"><p>Aucun composant suivi.</p></div> : (
                        parts.map(part => {
                            // APPEL DU CALCUL D'USURE
                            // part.km_current contient le KM du vélo à l'installation (nom de colonne historique)
                            const { pct, color, usage } = getWearStatus(part.km_current, part.life_target_km);
                            
                            return (
                                <div key={part.id} className="part-card glass-panel">
                                    <div className="part-icon-box" style={{color: color}}>{getIcon(part.category)}</div>
                                    <div className="part-content">
                                        <div className="part-header">
                                            <h4>{part.name}</h4>
                                            <span className="part-cat">{part.category}</span>
                                        </div>
                                        <div className="wear-container">
                                            <div className="wear-labels">
                                                {/* Affichage KM parcouru / KM Cible */}
                                                <span>{usage} / {part.life_target_km} km</span>
                                                <span style={{color: color, fontWeight:'bold'}}>{pct}%</span>
                                            </div>
                                            <div className="progress-bg">
                                                <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: color }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="part-actions">
                                        <button onClick={() => handleReplace(part)} className="action-icon-btn replace"><FaSyncAlt /></button>
                                        <button onClick={() => handleDelete(part.id)} className="action-icon-btn delete"><FaTrash /></button>
                                    </div>
                                </div>
                            );
                        })
                    )
                )}
            </div>
        </div>
    );
}

export default PartsTab;