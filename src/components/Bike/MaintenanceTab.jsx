import React, { useState, useEffect } from 'react';
import { maintenanceService } from '../../services/api';
import MaintenanceForm from './MaintenanceForm'; // On suppose que ce fichier existe
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
            setMaintenances(data);
        } catch (e) {
            console.error("Erreur chargement entretien:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSuccess = () => {
        setShowForm(false);
        loadData();
    };

    const handleDelete = async (id) => {
        if (window.confirm("Supprimer cet entretien ?")) {
            try {
                await maintenanceService.delete(id);
                loadData();
            } catch (e) {
                console.error(e);
            }
        }
    };

    // Fonction utilitaire pour calculer l'urgence
    const getStatus = (m) => {
        if (m.date_due && new Date(m.date_due) < new Date()) return 'late';
        if (m.km_due && bikeKm >= m.km_due) return 'late';
        return 'upcoming';
    };

    if (loading) return <div>Chargement des entretiens...</div>;

    return (
        <div className="maintenance-tab">
            <div className="tab-actions">
                <h3>Carnet d'entretien</h3>
                <button onClick={() => setShowForm(!showForm)} className="secondary-btn">
                    {showForm ? "Fermer" : "+ Ajouter un entretien"}
                </button>
            </div>

            {showForm && (
                <div className="form-container">
                    <MaintenanceForm 
                        bikeId={bikeId} 
                        onSuccess={handleAddSuccess} 
                        onCancel={() => setShowForm(false)}
                    />
                </div>
            )}

            <div className="maintenance-list">
                {maintenances.length === 0 ? (
                    <p className="empty-msg">Aucun entretien prévu. Ajoutes-en un pour ne rien oublier !</p>
                ) : (
                    maintenances.map(m => {
                        const status = getStatus(m);
                        return (
                            <div key={m.id} className={`maintenance-item ${status}`}>
                                <div className="m-info">
                                    <strong>{m.type}</strong>
                                    <span className="m-due">
                                        {m.date_due ? `📅 ${m.date_due}` : ''} 
                                        {m.km_due ? ` 🚲 ${m.km_due} km` : ''}
                                    </span>
                                </div>
                                <div className="m-actions">
                                    <button onClick={() => handleDelete(m.id)} className="icon-btn">🗑️</button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default MaintenanceTab;