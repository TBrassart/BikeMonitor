import React, { useState, useEffect } from 'react';
import { partsService, bikeService } from '../../services/api';
import './PartForm.css';

function PartForm({ bikeId, onSuccess, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'transmission',
        installation_date: new Date().toISOString().split('T')[0],
        km_current: 0,
        life_target_km: 5000
    });

    // CALCUL AUTOMATIQUE
    useEffect(() => {
        if (formData.installation_date && bikeId) {
            calculateUsage();
        }
    }, [formData.installation_date, bikeId]);

    const calculateUsage = async () => {
        console.log("Calcul en cours pour date:", formData.installation_date);
        try {
            // 1. Km total actuel
            const bike = await bikeService.getById(bikeId);
            const currentTotal = bike.total_km || 0;

            // 2. Km du vélo à la date d'install
            const kmAtInstall = await partsService.getBikeKmAtDate(bikeId, formData.installation_date);
            console.log(`Total: ${currentTotal}, AtInstall: ${kmAtInstall}`);

            // 3. Différence = usage de la pièce
            const usage = Math.max(0, currentTotal - kmAtInstall);
            
            setFormData(prev => ({ ...prev, km_current: usage }));
        } catch (e) {
            console.error("Erreur calcul", e);
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
            alert("Erreur ajout");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="part-form" onSubmit={handleSubmit}>
            <h4>Nouvelle Pièce</h4>
            {/* ... Les champs sont les mêmes qu'avant, assurez-vous juste que les inputs ont bien onChange={handleChange} ... */}
            {/* Pour abréger, je remets juste les champs clés */}
            <div className="form-group">
                <label>Nom</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label>Type</label>
                <select name="category" value={formData.category} onChange={handleChange}>
                    <option value="transmission">Transmission</option>
                    <option value="pneus">Pneus</option>
                    <option value="freinage">Freinage</option>
                    <option value="autre">Autre</option>
                </select>
            </div>
            <div className="form-row">
                <div className="form-group half">
                    <label>Installée le</label>
                    <input type="date" name="installation_date" value={formData.installation_date} onChange={handleChange} />
                </div>
                <div className="form-group half">
                    <label>Km parcourus (Auto)</label>
                    <input type="number" name="km_current" value={formData.km_current} readOnly style={{opacity:0.7}} />
                </div>
            </div>
            <div className="form-group">
                <label>Durée de vie (km)</label>
                <input type="number" name="life_target_km" value={formData.life_target_km} onChange={handleChange} />
            </div>
            <div className="form-buttons">
                <button type="button" onClick={onCancel} className="cancel-btn">Annuler</button>
                <button type="submit" className="submit-btn" disabled={loading}>Ajouter</button>
            </div>
        </form>
    );
}

export default PartForm;