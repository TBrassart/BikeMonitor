import React, { useState, useEffect } from 'react';
import { maintenanceService, historyService } from '../../services/api';
import { FaPlus, FaWrench, FaCheck, FaTrash, FaCalendarCheck } from 'react-icons/fa';
import MaintenanceForm from './MaintenanceForm';
import './MaintenanceTab.css';

function MaintenanceTab({ bikeId, bikeKm }) {
    const [maintenances, setMaintenances] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // État pour la validation (ID de l'item en cours de validation + date)
    const [validatingId, setValidatingId] = useState(null);
    const [doneDate, setDoneDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadData();
    }, [bikeId]);

    const loadData = async () => {
        setLoading(true);
        const data = await maintenanceService.getByBikeId(bikeId);
        // On n'affiche que les entretiens "à faire" (upcoming ou late)
        setMaintenances(data.filter(m => m.status !== 'done') || []);
        setLoading(false);
    };

    // --- VALIDATION DE L'ENTRETIEN ---
    const handleValidateClick = (id) => {
        setValidatingId(id); // Ouvre l'input date pour cet item
        setDoneDate(new Date().toISOString().split('T')[0]);
    };

    const confirmValidation = async (maintenanceItem) => {
        try {
            // 1. Mettre à jour l'entretien comme "FAIT"
            await maintenanceService.update(maintenanceItem.id, {
                status: 'done',
                date_done: doneDate
            });

            // 2. Ajouter une entrée dans l'HISTORIQUE
            await historyService.add({
                bike_id: bikeId,
                type: 'maintenance',
                title: `Entretien : ${maintenanceItem.type}`,
                description: maintenanceItem.notes || 'Entretien validé',
                date: doneDate,
                km: bikeKm // On enregistre le km du vélo au moment du fait
            });

            setValidatingId(null);
            loadData(); // Rafraîchir la liste
        } catch (e) {
            alert("Erreur lors de la validation");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Supprimer ?")) {
            await maintenanceService.delete(id);
            loadData();
        }
    };

    const getStatus = (m) => {
        const isLateDate = m.date_due && new Date(m.date_due) < new Date();
        const isLateKm = m.km_due && bikeKm >= m.km_due;
        return (isLateDate || isLateKm) ? 'late' : 'upcoming';
    };

    return (
        <div className="maintenance-tab">
            <div className="tab-header-row">
                <h3>À faire</h3>
                <button onClick={() => setShowForm(!showForm)} className="add-mini-btn"><FaPlus /></button>
            </div>

            {showForm && (
                <div className="form-wrapper">
                    <MaintenanceForm bikeId={bikeId} onSuccess={() => { setShowForm(false); loadData(); }} onCancel={() => setShowForm(false)} />
                </div>
            )}

            <div className="maintenance-list">
                {maintenances.length === 0 && !loading && <p className="empty-text">Tout est en ordre ! 🚲</p>}

                {maintenances.map(m => (
                    <div key={m.id} className={`maintenance-card glass-panel ${getStatus(m)}`}>
                        
                        {/* Si on est en train de valider cet item */}
                        {validatingId === m.id ? (
                            <div className="validation-box">
                                <label>Fait le :</label>
                                <input type="date" value={doneDate} onChange={e => setDoneDate(e.target.value)} />
                                <div className="val-actions">
                                    <button onClick={() => setValidatingId(null)} className="cancel-link">Annuler</button>
                                    <button onClick={() => confirmValidation(m)} className="confirm-btn">Valider</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="m-icon"><FaWrench /></div>
                                <div className="m-content">
                                    <h4>{m.type}</h4>
                                    <div className="m-meta">
                                        {m.date_due && <span>📅 {m.date_due}</span>}
                                        {m.km_due && <span>📏 {m.km_due} km</span>}
                                    </div>
                                </div>
                                <div className="m-actions">
                                    <button onClick={() => handleValidateClick(m.id)} className="check-btn" title="Marquer comme fait">
                                        <FaCheck />
                                    </button>
                                    <button onClick={() => handleDelete(m.id)} className="trash-icon">
                                        <FaTrash />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MaintenanceTab;