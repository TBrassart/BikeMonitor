// src/components/Bike/MaintenanceForm.jsx

import React, { useState } from 'react';
import { FaSave, FaTimes, FaCalendarAlt, FaRoad } from 'react-icons/fa';
import './MaintenanceForm.css'; 

// Presets d'entretien courants (Quick win: preset de types d’entretien [cite: 85])
const maintenancePresets = [
    'Nettoyage et graissage chaîne',
    'Révision générale (Annuelle)',
    'Changement de câble',
    'Purge de freins'
];

const MaintenanceForm = ({ bikeId, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        type: '',
        datePrévue: '',
        kmPrévu: '',
        notes: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectPreset = (preset) => {
        setFormData(prev => ({ ...prev, type: preset }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation minimale: le type est requis
        if (!formData.type) {
            alert("Veuillez spécifier le type d'entretien.");
            return;
        }
        
        // La date OU le km sont requis pour la planification
        if (!formData.datePrévue && !formData.kmPrévu) {
            alert("Veuillez indiquer une date ou un kilométrage prévu.");
            return;
        }

        setIsSaving(true);
        
        // Appel au service API (POST /bikes/{bikeId}/maintenance)
        try {
            await onSave(bikeId, formData);
            // Toast léger "Vélo enregistré ✅" [cite: 24] (simulé par console.log)
            console.log(`[Toast] Entretien "${formData.type}" planifié ! ✅`);
            onClose();
        } catch (error) {
            console.error("Erreur lors de la planification de l'entretien:", error);
            // Afficher un bandeau ou toast avec message clair [cite: 7]
            alert("Erreur: Impossible de planifier l'entretien.");
        } finally {
            setIsSaving(false);
        }
    };

    const isFormValid = formData.type && (formData.datePrévue || formData.kmPrévu);

    return (
        <div className="maintenance-form-container">
            <header className="form-header">
                <h2>Planifier un Entretien</h2>
                <button onClick={onClose} className="close-btn" disabled={isSaving}>
                    <FaTimes />
                </button>
            </header>

            <form onSubmit={handleSubmit} className="maintenance-form">
                
                <section className="form-section">
                    <h3>Type d'entretien *</h3>
                    <input 
                        name="type" 
                        type="text" 
                        value={formData.type} 
                        onChange={handleChange} 
                        placeholder="Ex: Remplacement plaquettes avant" 
                        required 
                    />
                    
                    <div className="preset-chips">
                        {maintenancePresets.map(preset => (
                            <button
                                key={preset}
                                type="button"
                                className={`chip ${formData.type === preset ? 'active' : ''}`}
                                onClick={() => handleSelectPreset(preset)}
                            >
                                {preset}
                            </button>
                        ))}
                    </div>
                </section>
                
                <section className="form-section">
                    <h3>Quand planifier ? (Date ou KM)</h3>
                    
                    <label htmlFor="datePrévue"><FaCalendarAlt /> Date prévue</label>
                    <input 
                        id="datePrévue" 
                        name="datePrévue" 
                        type="date" 
                        value={formData.datePrévue} 
                        onChange={handleChange} 
                    />

                    <label htmlFor="kmPrévu"><FaRoad /> Kilométrage prévu (km)</label>
                    <input 
                        id="kmPrévu" 
                        name="kmPrévu" 
                        type="number" 
                        value={formData.kmPrévu} 
                        onChange={handleChange} 
                        placeholder="Ex: 3000" 
                    />
                </section>
                
                <section className="form-section">
                    <label htmlFor="notes">Notes</label>
                    <textarea 
                        id="notes" 
                        name="notes" 
                        value={formData.notes} 
                        onChange={handleChange} 
                        rows="3"
                        placeholder="Détails supplémentaires..."
                    />
                </section>

                <div className="form-actions">
                    <button 
                        type="submit" 
                        className="save-btn" 
                        disabled={!isFormValid || isSaving}
                    >
                        {isSaving ? 'Enregistrement...' : <><FaSave /> Planifier l'entretien</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default MaintenanceForm;