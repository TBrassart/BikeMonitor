import React, { useState } from 'react';
import { partsService } from '../../services/api';
import './PartForm.css';

function PartForm({ bikeId, onSuccess, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        category: 'transmission', // Valeur par défaut
        installation_date: new Date().toISOString().split('T')[0], // Aujourd'hui par défaut
        km_current: '0',
        life_target_km: '5000'
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
            // Préparation du payload
            const payload = {
                bike_id: bikeId,
                name: formData.name,
                category: formData.category,
                installation_date: formData.installation_date,
                km_current: parseInt(formData.km_current) || 0,
                life_target_km: parseInt(formData.life_target_km) || 0,
                status: 'ok',
                wear_percentage: 0 // On initialise à 0
            };

            await partsService.add(payload);

            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Erreur ajout pièce:", err);
            setError("Impossible d'ajouter la pièce.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="part-form" onSubmit={handleSubmit}>
            <h4>Ajouter une nouvelle pièce</h4>
            
            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
                <label>Nom de la pièce</label>
                <input 
                    type="text" 
                    name="name"
                    placeholder="Ex: Chaîne Shimano Ultegra"
                    value={formData.name}
                    onChange={handleChange}
                    required 
                />
            </div>

            <div className="form-group">
                <label>Catégorie</label>
                <select name="category" value={formData.category} onChange={handleChange}>
                    <option value="transmission">Transmission (Chaîne, Cassette)</option>
                    <option value="pneus">Pneus / Chambres</option>
                    <option value="freinage">Freinage (Plaquettes, Disques)</option>
                    <option value="peripheriques">Périphériques (Guidoline, Câbles)</option>
                    <option value="autre">Autre</option>
                </select>
            </div>

            <div className="form-row">
                <div className="form-group half">
                    <label>Installée le</label>
                    <input 
                        type="date" 
                        name="installation_date"
                        value={formData.installation_date}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group half">
                    <label>Durée de vie estimée (km)</label>
                    <input 
                        type="number" 
                        name="life_target_km"
                        value={formData.life_target_km}
                        onChange={handleChange}
                    />
                </div>
            </div>

            <div className="form-buttons">
                <button type="button" onClick={onCancel} disabled={loading} className="cancel-btn">
                    Annuler
                </button>
                <button type="submit" disabled={loading} className="submit-btn">
                    {loading ? 'Ajout...' : 'Ajouter la pièce'}
                </button>
            </div>
        </form>
    );
}

export default PartForm;