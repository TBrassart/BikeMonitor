import React, { useState } from 'react';
import { maintenanceService } from '../../services/api';
import './MaintenanceForm.css';

function MaintenanceForm({ bikeId, onSuccess, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Champs du formulaire
    const [formData, setFormData] = useState({
        type: 'Révision générale', // Valeur par défaut
        date_due: '',
        km_due: '',
        notes: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Préparation de l'objet pour Supabase
            // On s'assure que les champs vides (comme km_due) sont null et pas ""
            const payload = {
                bike_id: bikeId,
                type: formData.type,
                date_due: formData.date_due || null,
                km_due: formData.km_due ? parseInt(formData.km_due) : null,
                notes: formData.notes,
                status: 'upcoming' // Par défaut
            };

            // Appel au service
            await maintenanceService.add(payload);

            // Si succès, on prévient le parent pour rafraîchir la liste
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            console.error("Erreur planification:", err);
            setError("Impossible de planifier l'entretien. Vérifie ta connexion.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="maintenance-form" onSubmit={handleSubmit}>
            <h4>Planifier un entretien</h4>
            
            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
                <label>Type d'entretien</label>
                <input 
                    type="text" 
                    name="type"
                    placeholder="Ex: Changement chaîne, Révision..."
                    value={formData.type}
                    onChange={handleChange}
                    required 
                    list="maintenance-types" 
                />
                {/* Suggestions pour aider la saisie */}
                <datalist id="maintenance-types">
                    <option value="Révision générale" />
                    <option value="Changement chaîne" />
                    <option value="Changement plaquettes" />
                    <option value="Purge freins" />
                    <option value="Changement pneus" />
                    <option value="Graissage" />
                </datalist>
            </div>

            <div className="form-row">
                <div className="form-group half">
                    <label>Date prévue</label>
                    <input 
                        type="date" 
                        name="date_due"
                        value={formData.date_due}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group half">
                    <label>À quel kilométrage ?</label>
                    <input 
                        type="number" 
                        name="km_due"
                        placeholder="Ex: 5000"
                        value={formData.km_due}
                        onChange={handleChange}
                    />
                </div>
            </div>

            <div className="form-group">
                <label>Notes (optionnel)</label>
                <textarea 
                    name="notes"
                    placeholder="Détails, référence pièces..."
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                />
            </div>

            <div className="form-buttons">
                <button type="button" onClick={onCancel} disabled={loading} className="cancel-btn">
                    Annuler
                </button>
                <button type="submit" disabled={loading} className="submit-btn">
                    {loading ? 'Enregistrement...' : 'Planifier'}
                </button>
            </div>
        </form>
    );
}

export default MaintenanceForm;