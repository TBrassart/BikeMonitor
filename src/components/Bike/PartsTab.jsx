import React, { useState, useEffect } from 'react';
import { partsService } from '../../services/api';
import PartForm from './PartForm'; // On s'assure que ce fichier existe
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
        } catch (e) {
            console.error("Erreur chargement pièces:", e);
        } finally {
            setLoading(false);
        }
    };

    const getWearColor = (percentage) => {
        if (percentage >= 100) return 'red';
        if (percentage >= 75) return 'orange';
        return 'green';
    };

    const handleDelete = async (id) => {
        if(window.confirm("Retirer cette pièce ?")) {
            await partsService.delete(id);
            loadParts();
        }
    }

    if (loading) return <div>Chargement des composants...</div>;

    return (
        <div className="parts-tab">
            <div className="tab-actions">
                <h3>Composants installés</h3>
                <button onClick={() => setShowForm(!showForm)} className="secondary-btn">
                    {showForm ? "Fermer" : "+ Ajouter une pièce"}
                </button>
            </div>

            {showForm && (
                <div className="form-container">
                    {/* Note: PartForm devra être vérifié ensuite si tu as des erreurs à l'ajout */}
                    <PartForm 
                        bikeId={bikeId} 
                        onSuccess={() => { setShowForm(false); loadParts(); }} 
                        onCancel={() => setShowForm(false)}
                    />
                </div>
            )}

            <div className="parts-list">
                {parts.length === 0 ? (
                    <p className="empty-msg">Aucune pièce suivie. Ajoute ta chaîne ou tes pneus pour suivre l'usure.</p>
                ) : (
                    parts.map(part => (
                        <div key={part.id} className="part-item">
                            <div className="part-header">
                                <span className="part-name">{part.name}</span>
                                <span className="part-cat">{part.category}</span>
                            </div>
                            
                            <div className="wear-bar-container">
                                <div 
                                    className={`wear-bar ${getWearColor(part.wear_percentage || 0)}`} 
                                    style={{ width: `${Math.min(part.wear_percentage || 0, 100)}%` }}
                                ></div>
                            </div>
                            
                            <div className="part-stats">
                                <span>{part.km_current} / {part.life_target_km} km</span>
                                <button onClick={() => handleDelete(part.id)} className="trash-btn">×</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default PartsTab;