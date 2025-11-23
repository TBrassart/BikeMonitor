import React, { useState, useEffect } from 'react';
import { partsService, bikeService } from '../../services/api'; // Import bikeService aussi
import './PartForm.css';

function PartForm({ bikeId, onSuccess, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'transmission',
        installation_date: new Date().toISOString().split('T')[0],
        km_current: 0, // Ce champ sera calculé auto
        life_target_km: 5000
    });

    // --- CALCUL AUTOMATIQUE ---
    useEffect(() => {
        if (formData.installation_date && bikeId) {
            calculateUsage();
        }
    }, [formData.installation_date, bikeId]);

    const calculateUsage = async () => {
        setCalculating(true);
        try {
            // 1. On récupère le kilométrage actuel du vélo
            const bike = await bikeService.getById(bikeId);
            const currentBikeKm = bike.total_km || 0;

            // 2. On récupère le kilométrage du vélo A LA DATE d'installation
            const kmAtInstall = await partsService.getBikeKmAtDate(bikeId, formData.installation_date);

            // 3. La différence = ce que la pièce a roulé
            // Note : Si kmAtInstall > current (impossible sauf bug), on met 0
            const usage = Math.max(0, currentBikeKm - kmAtInstall);
            
            setFormData(prev => ({ ...prev, km_current: usage }));
        } catch (e) {
            console.error("Erreur calcul auto:", e);
        } finally {
            setCalculating(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await partsService.add({
                bike_id: bikeId,
                ...formData,
                km_current: parseInt(formData.km_current),
                life_target_km: parseInt(formData.life_target_km)
            });
            if (onSuccess) onSuccess();
        } catch (e) {
            alert("Erreur ajout pièce");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="part-form" onSubmit={handleSubmit}>
            <h4>Ajouter une pièce</h4>
            
            <div className="form-group">
                <label>Nom</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Ex: Chaîne neuve" />
            </div>

            <div className="form-group">
                <label>Catégorie</label>
                <select name="category" value={formData.category} onChange={handleChange}>
                    <option value="transmission">Transmission</option>
                    <option value="pneus">Pneus</option>
                    <option value="freinage">Freinage</option>
                    <option value="autre">Autre</option>
                </select>
            </div>

            <div className="form-row">
                <div className="form-group half">
                    <label>Date d'installation</label>
                    <input type="date" name="installation_date" value={formData.installation_date} onChange={handleChange} />
                </div>
                
                <div className="form-group half">
                    <label>Usure calculée (km)</label>
                    <input 
                        type="number" 
                        name="km_current" 
                        value={formData.km_current} 
                        onChange={handleChange} 
                        readOnly // On empêche la modif manuelle pour forcer le calcul
                        style={{opacity: 0.7, cursor: 'not-allowed'}}
                    />
                    {calculating && <small style={{color: 'var(--neon-blue)'}}>Calcul...</small>}
                </div>
            </div>

            <div className="form-group">
                <label>Durée de vie estimée</label>
                <input type="number" name="life_target_km" value={formData.life_target_km} onChange={handleChange} />
            </div>

            <div className="form-buttons">
                <button type="button" onClick={onCancel} className="cancel-btn">Annuler</button>
                <button type="submit" disabled={loading || calculating} className="submit-btn">Ajouter</button>
            </div>
        </form>
    );
}

export default PartForm;