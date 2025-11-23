import React, { useState, useEffect, useCallback } from 'react';
import { partsService, bikeService } from '../../services/api';
import { FaCalculator } from 'react-icons/fa';
import './PartForm.css';

function PartForm({ bikeId, onSuccess, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        category: 'transmission',
        installation_date: new Date().toISOString().split('T')[0],
        km_current: 0,
        life_target_km: 5000
    });

    // --- FONCTION DE CALCUL ROBUSTE ---
    const calculateUsage = useCallback(async (dateToUse) => {
        if (!dateToUse || !bikeId) return;
        
        setCalculating(true);
        try {
            const bike = await bikeService.getById(bikeId);
            const currentTotal = bike.total_km || 0;

            // Appel API pour avoir le kilométrage historique
            const kmAtInstall = await partsService.getBikeKmAtDate(bikeId, dateToUse);
            
            const usage = Math.max(0, currentTotal - kmAtInstall);
            
            console.log(`Calcul : Total=${currentTotal} - Install(${dateToUse})=${kmAtInstall} => Usage=${usage}`);
            
            setFormData(prev => ({ ...prev, km_current: usage }));
        } catch (e) {
            console.error("Erreur calcul", e);
        } finally {
            setCalculating(false);
        }
    }, [bikeId]);

    // Déclencher le calcul quand la date change
    useEffect(() => {
        calculateUsage(formData.installation_date);
    }, [formData.installation_date, calculateUsage]);

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
                life_target_km: parseInt(formData.life_target_km),
                status: 'ok', 
                wear_percentage: 0
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
            
            <div className="form-group">
                <label>Nom</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Ex: Chaîne Shimano" />
            </div>

            <div className="form-group">
                <label>Catégorie</label>
                <select name="category" value={formData.category} onChange={handleChange}>
                    <option value="transmission">Transmission</option>
                    <option value="pneus">Pneus</option>
                    <option value="freinage">Freinage</option>
                    <option value="peripheriques">Périphériques</option>
                    <option value="autre">Autre</option>
                </select>
            </div>

            <div className="form-row">
                <div className="form-group half">
                    <label>Date d'installation</label>
                    <input 
                        type="date" 
                        name="installation_date" 
                        value={formData.installation_date} 
                        onChange={handleChange} 
                    />
                </div>
                
                <div className="form-group half">
                    <label style={{display:'flex', justifyContent:'space-between'}}>
                        Usure (km)
                        {/* Bouton de recalcul manuel au cas où */}
                        <button type="button" onClick={() => calculateUsage(formData.installation_date)} style={{background:'none', border:'none', color:'var(--neon-blue)', cursor:'pointer', fontSize:'0.8rem'}}>
                            <FaCalculator /> Recalc.
                        </button>
                    </label>
                    <input 
                        type="number" 
                        name="km_current" 
                        value={formData.km_current} 
                        readOnly 
                        style={{opacity: 0.7, cursor:'not-allowed', borderColor: calculating ? 'var(--neon-blue)' : ''}}
                    />
                </div>
            </div>

            <div className="form-group">
                <label>Durée de vie (km)</label>
                <input type="number" name="life_target_km" value={formData.life_target_km} onChange={handleChange} />
            </div>

            <div className="form-buttons">
                <button type="button" onClick={onCancel} className="secondary-btn cancel-btn">Annuler</button>
                <button type="submit" className="primary-btn submit-btn" disabled={loading}>Ajouter</button>
            </div>
        </form>
    );
}

export default PartForm;