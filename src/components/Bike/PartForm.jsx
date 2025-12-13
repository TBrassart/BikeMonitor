import React, { useState, useEffect, useCallback } from 'react';
import { partsService, bikeService } from '../../services/api';
import { FaCalculator, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import './PartForm.css';

function PartForm({ bikeId, onSuccess, onCancel, initialData }) {
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [currentBikeTotal, setCurrentBikeTotal] = useState(0); // On stocke le total actuel du vélo
    
    const [formData, setFormData] = useState({
        name: '',
        category: 'Transmission',
        installation_date: new Date().toISOString().split('T')[0],
        km_current: 0,
        life_target_km: 5000
    });

    // 1. Initialisation : On récupère le total du vélo + Données bibliothèque
    useEffect(() => {
        const init = async () => {
            try {
                const bike = await bikeService.getById(bikeId);
                setCurrentBikeTotal(bike.total_km || 0);
                
                // Si pas de données bibliothèque, on initialise km_current au total actuel
                if (!initialData) {
                    setFormData(prev => ({ ...prev, km_current: bike.total_km || 0 }));
                }
            } catch (e) { console.error(e); }
        };
        init();

        if (initialData) {
            setFormData(prev => ({
                ...prev,
                name: initialData.name || '',
                category: initialData.category || 'Transmission', 
                life_target_km: initialData.lifespan_km || 5000
            }));
        }
    }, [bikeId, initialData]);

    // 2. Calculateur intelligent
    const calculateUsage = useCallback(async (dateToUse) => {
        if (!dateToUse || !bikeId) return;
        
        setCalculating(true);
        try {
            // On récupère le KM historique
            const kmAtInstall = await partsService.getBikeKmAtDate(bikeId, dateToUse);
            
            // Logique de fallback : Si l'API renvoie null, on met le total actuel
            // Si l'API renvoie une valeur, on l'utilise
            
            // Astuce : Si kmAtInstall est null, on utilise currentBikeTotal (récupéré dans le state ou via l'API ici)
            // Pour être sûr, on refait un getById si besoin, mais ici on va utiliser le state s'il est prêt
            
            let estimatedKm = kmAtInstall;
            if (estimatedKm === null) {
                // Pas d'historique trouvé -> on met le max par défaut
                const bike = await bikeService.getById(bikeId); // Sécurité
                estimatedKm = bike.total_km || 0;
            }
            
            setFormData(prev => ({ ...prev, km_current: estimatedKm }));

        } catch (e) { console.error(e); } 
        finally { setCalculating(false); }
    }, [bikeId]);

    // Recalcul au changement de date
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
                km_current: parseInt(formData.km_current || 0),
                life_target_km: parseInt(formData.life_target_km || 0)
            });
            onSuccess();
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'ajout.");
        } finally {
            setLoading(false);
        }
    };

    // --- CALCULS POUR L'AFFICHAGE UI ---
    // Usure théorique = (Total Actuel du vélo) - (Km Compteur saisi)
    const previewUsage = Math.max(0, currentBikeTotal - (parseInt(formData.km_current) || 0));
    
    // Détection d'incohérence : Date passée (> 2 jours) MAIS Km Saisi == Total Actuel
    // Ça veut dire "Pas d'historique trouvé"
    const isDatePast = new Date(formData.installation_date) < new Date(Date.now() - 86400000 * 2);
    const isHistoryMissing = isDatePast && (parseInt(formData.km_current) === currentBikeTotal);

    return (
        <form className="part-form" onSubmit={handleSubmit}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                <h4 style={{margin:0}}>{initialData ? 'Confirmer l\'ajout' : 'Ajouter un composant'}</h4>
                {/* Badge Info Vélo */}
                <span className="chip" style={{background:'rgba(255,255,255,0.5)', fontSize:'0.8rem'}}>
                    Vélo : {currentBikeTotal.toLocaleString()} km
                </span>
            </div>
            
            <div className="form-group">
                <label>Nom du composant</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Ex: Chaîne Shimano Ultegra"/>
            </div>

            <div className="form-row">
                <div className="form-group half">
                    <label>Catégorie</label>
                    <select name="category" value={formData.category} onChange={handleChange}>
                        <option value="Transmission">Transmission</option>
                        <option value="Pneus">Pneus</option>
                        <option value="Freinage">Freinage</option>
                        <option value="Roues">Roues</option>
                        <option value="Pédales">Pédales</option>
                        <option value="Roulements">Roulements</option>
                        <option value="Guidoline">Guidoline</option>
                        <option value="Autre">Autre</option>
                    </select>
                </div>
                <div className="form-group half">
                    <label>Durée de vie cible (km)</label>
                    <input type="number" name="life_target_km" value={formData.life_target_km} onChange={handleChange} />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group half">
                    <label>Date d'installation</label>
                    <input type="date" name="installation_date" value={formData.installation_date} onChange={handleChange} required />
                </div>
                
                <div className="form-group half">
                    <label style={{display:'flex', justifyContent:'space-between', color:'var(--text-primary)'}}>
                        Km compteur à l'install
                        {calculating && <span style={{color:'var(--neon-blue)', fontSize:'0.7rem'}}>...</span>}
                    </label>
                    <input 
                        type="number" 
                        name="km_current" 
                        value={formData.km_current} 
                        onChange={handleChange}
                        className={isHistoryMissing ? "input-warning" : ""}
                    />
                </div>
            </div>

            {/* --- BLOC D'INFORMATION DYNAMIQUE --- */}
            <div style={{
                background: isHistoryMissing ? 'rgba(251, 191, 36, 0.1)' : 'rgba(74, 222, 128, 0.1)',
                border: `1px solid ${isHistoryMissing ? '#fbbf24' : '#4ade80'}`,
                borderRadius: '8px', padding: '10px', marginBottom: '15px',
                fontSize: '0.9rem', color: isHistoryMissing ? '#f59e0b' : '#22c55e'
            }}>
                <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom: isHistoryMissing ? '5px' : '0'}}>
                    <FaCalculator /> 
                    <strong>Usure calculée : {previewUsage} km</strong>
                </div>

                {isHistoryMissing && (
                    <div style={{fontSize:'0.8rem', display:'flex', gap:'5px', marginTop:'5px', color:'#d97706'}}>
                        <FaExclamationTriangle style={{marginTop:'2px'}}/>
                        <span>
                            Historique introuvable pour cette date.<br/>
                            <strong>Veuillez saisir manuellement le kilométrage qu'avait le vélo le {new Date(formData.installation_date).toLocaleDateString()}.</strong>
                        </span>
                    </div>
                )}
            </div>

            <div className="form-buttons">
                <button type="button" onClick={onCancel} className="secondary-btn cancel-btn">Annuler</button>
                <button type="submit" className="primary-btn submit-btn" disabled={loading}>
                    {loading ? '...' : 'Valider'}
                </button>
            </div>
        </form>
    );
}

export default PartForm;