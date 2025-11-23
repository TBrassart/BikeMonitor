import React, { useState, useEffect } from 'react';
import { maintenanceService } from '../../services/api';
import { FaPlus, FaWrench, FaCalendarCheck, FaTrash } from 'react-icons/fa';
import MaintenanceForm from './MaintenanceForm';
import './MaintenanceTab.css';

function MaintenanceTab({ bikeId, bikeKm }) {
    const [maintenances, setMaintenances] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [bikeId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await maintenanceService.getByBikeId(bikeId);
            setMaintenances(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Supprimer cet entretien ?")) {
            await maintenanceService.delete(id);
            loadData();
        }
    };

    // Calcul du statut (En retard / À venir)
    const getStatus = (m) => {
        const isLateDate = m.date_due && new Date(m.date_due) < new Date();
        const isLateKm = m.km_due && bikeKm >= m.km_due;
        return (isLateDate || isLateKm) ? 'late' : 'upcoming';
    };

    return (
        <div className="maintenance-tab">
            <div className="tab-header-row">
                <h3>Carnet d'entretien</h3>
                <button onClick={() => setShowForm(!showForm)} className="add-mini-btn">
                    <FaPlus />
                </button>
            </div>

            {showForm && (
                <div className="form-wrapper">
                    <MaintenanceForm 
                        bikeId={bikeId} 
                        onSuccess={() => { setShowForm(false); loadData(); }} 
                        onCancel={() => setShowForm(false)}
                    />
                </div>
            )}

            <div className="maintenance-list">
                {maintenances.length === 0 && !loading && (
                    <div className="empty-state glass-panel">
                        <p>Aucun entretien prévu.</p>
                    </div>
                )}

                {maintenances.map(m => {
                    const status = getStatus(m);
                    return (
                        <div key={m.id} className={`maintenance-card glass-panel ${status}`}>
                            <div className="m-icon">
                                <FaWrench />
                            </div>
                            <div className="m-content">
                                <h4>{m.type}</h4>
                                <div className="m-meta">
                                    {m.date_due && <span><FaCalendarCheck /> {m.date_due}</span>}
                                    {m.km_due && <span>🚲 à {m.km_due} km</span>}
                                </div>
                                {m.notes && <p className="m-notes">{m.notes}</p>}
                            </div>
                            <button onClick={() => handleDelete(m.id)} className="trash-icon">
                                <FaTrash />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default MaintenanceTab;