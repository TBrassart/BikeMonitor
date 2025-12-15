import React, { useState, useEffect } from 'react';
import { partsService, historyService, bikeService } from '../../services/api';
import { FaPlus, FaCogs, FaCompactDisc, FaCircle, FaWrench, FaTrash, FaSyncAlt, FaSearch } from 'react-icons/fa';
import AddPartModal from './AddPartModal';
import ActionModal from './ActionModal';
import './PartsTab.css';

function PartsTab({ bikeId }) {
    const [parts, setParts] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentBikeKm, setCurrentBikeKm] = useState(0);
    const [partToReplace, setPartToReplace] = useState(null);

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

    const initiateReplace = (part) => {
        setPartToReplace(part);
    };

    // LOGIQUE D'ARCHIVAGE (Commune aux deux choix)
    const archiveOldPart = async (part) => {
        const today = new Date().toISOString().split('T')[0];
        const usage = Math.max(0, currentBikeKm - (part.km_current || 0));

        // Archive pièce
        await partsService.update(part.id, { 
            status: 'archived', 
            removal_date: today 
        });

        // Ajout historique
        await historyService.add({
            bike_id: bikeId,
            date: today,
            type: 'part_change',
            title: `Remplacement : ${part.name}`,
            description: `Pièce archivée après ${usage} km.`,
            km: currentBikeKm
        });

        return today;
    };

    // ACTION A : REMPLACER À L'IDENTIQUE
    const handleReplaceSame = async () => {
        if (!partToReplace) return;
        try {
            const today = await archiveOldPart(partToReplace);
            
            // Création de la nouvelle pièce identique
            await partsService.add({
                bike_id: bikeId,
                name: partToReplace.name,
                category: partToReplace.category,
                life_target_km: partToReplace.life_target_km,
                installation_date: today,
                km_current: currentBikeKm,
                status: 'ok'
            });

            setPartToReplace(null); // Ferme modale
            loadData();
        } catch (e) { console.error(e); alert("Erreur lors du remplacement"); }
    };

    // ACTION B : CHOISIR NOUVEAU (Ouvre bibliothèque)
    const handleReplaceNew = async () => {
        if (!partToReplace) return;
        try {
            await archiveOldPart(partToReplace);
            setPartToReplace(null); // Ferme modale remplacement
            loadData(); // Rafraîchit (l'ancienne disparaît)
            setShowAddModal(true); // Ouvre modale ajout
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id) => {
        // Pour la suppression simple, on peut aussi utiliser un ActionModal, 
        // mais pour l'instant un confirm natif est acceptable ou on peut créer un state partToDelete.
        if (window.confirm("Supprimer définitivement ce composant ? (Sans historique)")) {
            await partsService.delete(id);
            loadData();
        }
    };

    // --- CALCUL DE L'USURE CORRIGÉ ---
    const getWearStatus = (installBikeKm, targetKm) => {
        if (!targetKm) return { pct: 0, color: '#4ade80', usage: 0 };

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

            {/* MODALE DE REMPLACEMENT */}
            <ActionModal
                isOpen={!!partToReplace}
                onClose={() => setPartToReplace(null)}
                title="Remplacer le composant"
                actions={[
                    { 
                        label: 'Annuler', 
                        onClick: () => setPartToReplace(null),
                        className: 'secondary-btn',
                        style: { border: 'none', background: 'transparent' }
                    },
                    { 
                        label: 'Nouveau modèle', 
                        onClick: handleReplaceNew,
                        className: 'secondary-btn',
                        icon: <FaSearch />
                    },
                    { 
                        label: 'Même pièce (Neuve)', 
                        onClick: handleReplaceSame,
                        className: 'primary-btn',
                        icon: <FaSyncAlt />
                    }
                ]}
            >
                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                    <div className="part-icon-box" style={{fontSize:'1.5rem', width:'50px', height:'50px', background:'rgba(255,255,255,0.1)'}}>
                        {getIcon(partToReplace?.category)}
                    </div>
                    <div>
                        <p style={{margin:0, fontSize:'1.1rem', fontWeight:'bold', color:'white'}}>
                            {partToReplace?.name}
                        </p>
                        <p style={{margin:'5px 0 0 0', fontSize:'0.9rem', color:'#aaa'}}>
                            Cette action archivera la pièce actuelle dans l'historique.
                            Par quoi voulez-vous la remplacer ?
                        </p>
                    </div>
                </div>
            </ActionModal>

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
                                        <button onClick={() => initiateReplace(part)} className="action-icon-btn replace"><FaSyncAlt /></button>
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