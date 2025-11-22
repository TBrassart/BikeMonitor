import React, { useState, useEffect } from 'react';
import { FaPlus, FaCalendarCheck, FaClock, FaCheckCircle, FaWrench } from 'react-icons/fa';
import MaintenanceForm from './MaintenanceForm';
import './MaintenanceTab.css';
import { bikeService } from '../../services/api';

// --- MODAL INTERNE POUR LA VALIDATION ---
const CompletionModal = ({ isOpen, onClose, onConfirm }) => {
    const [dateDone, setDateDone] = useState(new Date().toISOString().split('T')[0]);

    if (!isOpen) return null;

    return (
        <div className="library-selector-overlay"> {/* Réutilisation du style overlay existant si possible, sinon créer un simple style */}
            <div className="library-selector-modal" style={{height: 'auto', padding: '20px', maxWidth: '400px'}}>
                <h3 style={{color: 'white', marginTop: 0}}>Valider l'entretien</h3>
                <p style={{color: '#ccc'}}>À quelle date cet entretien a-t-il été réalisé ?</p>
                
                <input 
                    type="date" 
                    value={dateDone} 
                    onChange={(e) => setDateDone(e.target.value)}
                    style={{width: '100%', padding: '10px', margin: '15px 0', background: '#12121e', color:'white', border:'1px solid #444'}}
                />
                
                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                    <button onClick={onClose} className="cancel-btn-small">Annuler</button>
                    <button onClick={() => onConfirm(dateDone)} className="save-btn-small">Valider</button>
                </div>
            </div>
        </div>
    );
};

const MaintenanceItem = ({ item, onCompleteClick }) => {
    const isOverdue = item.status === 'overdue';
    const isDone = item.status === 'done';

    const getStatusIcon = () => {
        if (isOverdue) return <FaClock color="#e74c3c" />; 
        if (isDone) return <FaCheckCircle color="#2ecc71" />;
        return <FaCalendarCheck color="#3498db" />;
    };

    const getStatusLabel = () => {
        if (isOverdue) return "EN RETARD";
        if (isDone) return `Effectué le ${new Date(item.dateDone).toLocaleDateString()}`; // Format date locale
        return `Prévu le ${item.dateDue}`;
    };

    return (
        <div className={`maintenance-item ${isOverdue ? 'overdue' : ''} ${isDone ? 'done' : ''}`}>
            <div className="item-icon">{getStatusIcon()}</div>
            <div className="item-info">
                <div className="item-type">{item.type}</div>
                <div className="item-due">{getStatusLabel()}</div>
            </div>
            
            {!isDone && (
                <button 
                    className="mark-done-btn" 
                    title="Marquer comme effectué"
                    // On appelle onCompleteClick qui va ouvrir la modale
                    onClick={() => onCompleteClick(item.id)} 
                >
                    <FaCheckCircle />
                </button>
            )}
        </div>
    );
};

const MaintenanceTab = ({ bikeId, onAddMaintenance }) => {
    const [maintenances, setMaintenances] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // État pour la modale de validation
    const [completionModal, setCompletionModal] = useState({ isOpen: false, itemId: null });
    
    useEffect(() => {
        const loadMaintenances = async () => {
            try {
                const data = await bikeService.getMaintenancesByBike(bikeId);
                setMaintenances(data);
            } catch (e) {
                console.error("Erreur chargement entretiens", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadMaintenances();
    }, [bikeId]);

    const overdue = maintenances.filter(item => item.status === 'overdue');
    const upcoming = maintenances.filter(item => item.status === 'upcoming');
    const history = maintenances.filter(item => item.status === 'done');
    
    const handleAddMaintenanceClick = () => setIsFormOpen(true);

    const handleSaveAndRefresh = async (id, data) => {
        const newMaint = await onAddMaintenance(id, data);
        setMaintenances(prev => [...prev, newMaint]); 
    };

    // 1. Clic sur le bouton -> Ouvre la modale
    const handleOpenCompletionModal = (maintenanceId) => {
        setCompletionModal({ isOpen: true, itemId: maintenanceId });
    };

    // 2. Validation dans la modale -> Appel API
    const handleConfirmComplete = async (dateDone) => {
        const maintenanceId = completionModal.itemId;
        
        try {
            // On suppose que completeMaintenance accepte maintenant une date
            await bikeService.completeMaintenance(bikeId, maintenanceId, dateDone);
            
            setMaintenances(prev => prev.map(m => 
                m.id === maintenanceId ? { ...m, status: 'done', dateDone: dateDone } : m
            ));
            
            setCompletionModal({ isOpen: false, itemId: null });
        } catch (e) {
            alert("Erreur lors de la validation");
        }
    };

    if (isLoading) return <div style={{padding: '20px', color:'#888'}}>Chargement...</div>;

    if (isFormOpen) {
        return (
            <MaintenanceForm 
                bikeId={bikeId} 
                onClose={() => setIsFormOpen(false)} 
                onSave={handleSaveAndRefresh} 
            />
        );
    }

    if (maintenances.length === 0) {
        return (
            <div className="maintenance-tab-container empty-state-tab">
                <FaWrench size={60} color="#ccc" />
                <h1>Entretien</h1>
                <p>Aucun entretien planifié pour le moment.</p>
                <button className="cta-add-standard" onClick={handleAddMaintenanceClick}>
                    <FaPlus /> Planifier un entretien
                </button>
            </div>
        );
    }

    return (
        <div className="maintenance-tab-container">
            <div className="tab-actions">
                 <button className="cta-add-standard small" onClick={handleAddMaintenanceClick}>
                    <FaPlus /> Planifier un entretien
                </button>
            </div>

            {/* Sections... */}
            <section className="maintenance-section overdue-section">
                <h3>🚨 En retard ({overdue.length})</h3>
                {overdue.length > 0 ? overdue.map(item => ( 
                    <MaintenanceItem key={item.id} item={item} onCompleteClick={handleOpenCompletionModal} /> 
                )) : <p className="no-tasks">Rien en retard.</p>}
            </section>
            
            <section className="maintenance-section upcoming-section">
                <h3>🗓️ À venir ({upcoming.length})</h3>
                {upcoming.length > 0 ? upcoming.map(item => (
                    <MaintenanceItem key={item.id} item={item} onCompleteClick={handleOpenCompletionModal} />
                )) : <p className="no-tasks">Rien à venir.</p>}
            </section>

            <section className="maintenance-section history-section">
                <h3>✅ Historique ({history.length})</h3>
                {history.length > 0 ? history.map(item => <MaintenanceItem key={item.id} item={item} />) : <p className="no-tasks">Historique vide.</p>}
            </section>
            
            {/* MODALE DE VALIDATION */}
            <CompletionModal 
                isOpen={completionModal.isOpen} 
                onClose={() => setCompletionModal({isOpen: false, itemId: null})}
                onConfirm={handleConfirmComplete}
            />
        </div>
    );
};

export default MaintenanceTab;