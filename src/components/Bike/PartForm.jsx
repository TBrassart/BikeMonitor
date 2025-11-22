import React, { useState, useEffect } from 'react';
import { FaSave, FaTimes, FaRoad, FaCalendarAlt, FaCog, FaMagic } from 'react-icons/fa'; 
import { bikeService } from '../../services/api'; 
import './PartForm.css'; 

const partCategories = ['Chaîne', 'Cassette', 'Pneu', 'Plaquettes', 'Autre'];

const PartForm = ({ bikeId, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        installationDate: new Date().toISOString().split('T')[0], 
        kmInstallation: 0,
        lifeTargetKm: 2000, 
        price: 0,
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false); 

    // 1. Initialisation
    useEffect(() => {
        if (initialData) {
            // ... (Logique de mapping catégorie inchangée) ...
            const incomingCat = initialData.category ? initialData.category.toLowerCase() : '';
            let mappedCategory = 'Autre';
            if (incomingCat.includes('chain') || incomingCat.includes('chaîne')) mappedCategory = 'Chaîne';
            else if (incomingCat.includes('tire') || incomingCat.includes('pneu')) mappedCategory = 'Pneu';
            else if (incomingCat.includes('cassette')) mappedCategory = 'Cassette';
            else if (incomingCat.includes('brake') || incomingCat.includes('plaquette')) mappedCategory = 'Plaquettes';
            else if (partCategories.includes(initialData.category)) mappedCategory = initialData.category;

            setFormData(prev => ({
                ...prev,
                name: `${initialData.brand} ${initialData.model}`, 
                category: mappedCategory,
                lifeTargetKm: initialData.lifespan_km || 2000
            }));
        }
        // On lance le calcul initial
        updateKmFromDate(new Date().toISOString().split('T')[0]);
    }, [initialData]);

    // 2. FONCTION DE CALCUL (Corrigée avec logs)
    const updateKmFromDate = async (dateVal) => {
        if (!dateVal || !bikeId) return;
        
        setIsCalculating(true);
        try {
            console.log(`🧮 Calcul KM pour date: ${dateVal} sur vélo ${bikeId}`);
            const kmAtDate = await bikeService.getBikeKmAtDate(bikeId, dateVal);
            console.log(`👉 Résultat API: ${kmAtDate} km`);
            
            // On ne met à jour que si on trouve un résultat positif, 
            // ou si c'est 0 mais qu'on veut vraiment le remettre à zéro.
            // Ici on écrase systématiquement pour refléter la réalité de la base.
            setFormData(prev => ({
                ...prev,
                kmInstallation: kmAtDate
            }));
        } catch (e) {
            console.error(e);
        } finally {
            setIsCalculating(false);
        }
    };

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setFormData(prev => ({ ...prev, installationDate: newDate }));
        updateKmFromDate(newDate);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const isFormValid = formData.name && formData.category && formData.lifeTargetKm > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) return;

        setIsSaving(true);
        try {
            await onSave(bikeId, formData); 
            onClose();
        } catch (error) {
            alert("Erreur lors de l'enregistrement.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="maintenance-form-container">
            <header className="form-header">
                <h2>Installer une nouvelle pièce</h2>
                <button onClick={onClose} className="close-btn" disabled={isSaving}>
                    <FaTimes />
                </button>
            </header>

            <form onSubmit={handleSubmit} className="maintenance-form">
                <section className="form-section">
                    <h3>Détails de la pièce *</h3>
                    <input 
                        name="name" 
                        type="text" 
                        value={formData.name} 
                        onChange={handleChange} 
                        placeholder="Ex: Chaîne Shimano HG601" 
                        required 
                    />
                    
                    <label htmlFor="category"><FaCog /> Catégorie *</label>
                    <select id="category" name="category" value={formData.category} onChange={handleChange} required>
                        <option value="">Sélectionner une catégorie</option>
                        {partCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <div className="input-group">
                        <label>Prix d'achat (€)</label>
                        <input 
                            name="price" 
                            type="number" 
                            step="0.01" 
                            value={formData.price || ''} 
                            onChange={handleChange} 
                            placeholder="Ex: 45.99" 
                        />
                    </div>
                </section>
                
                <section className="form-section">
                    <h3>Historique</h3>
                    
                    <label htmlFor="installationDate"><FaCalendarAlt /> Date d'installation</label>
                    <input 
                        id="installationDate" 
                        name="installationDate" 
                        type="date" 
                        value={formData.installationDate} 
                        onChange={handleDateChange} 
                    />

                    <label htmlFor="kmInstallation" style={{display:'flex', justifyContent:'space-between'}}>
                        <span><FaRoad /> Km vélo à cette date</span>
                        {isCalculating && <span style={{color: '#00e5ff', fontSize:'0.8rem'}}>Calcul...</span>}
                    </label>
                    
                    <div style={{position: 'relative'}}>
                        <input 
                            id="kmInstallation" 
                            name="kmInstallation" 
                            type="number" 
                            value={formData.kmInstallation} 
                            onChange={handleChange} 
                            // CORRECTION ICI : J'ai retiré le readOnly !
                            style={{
                                backgroundColor: '#12121e', 
                                color: 'white', 
                                borderColor: isCalculating ? '#00e5ff' : '#444'
                            }}
                        />
                        <FaMagic 
                            style={{position: 'absolute', right: '10px', top: '12px', color: isCalculating ? '#00e5ff' : '#666', cursor:'help'}} 
                            title="Calculé automatiquement (modifiable)"
                        />
                    </div>
                    <p style={{fontSize: '0.75rem', color: '#666', marginTop: '5px'}}>
                        Historique détecté : {formData.kmInstallation} km. Vous pouvez corriger manuellement.
                    </p>
                    
                    <label htmlFor="lifeTargetKm">Durée de vie ciblée (km) *</label>
                     <input 
                        id="lifeTargetKm" 
                        name="lifeTargetKm" 
                        type="number" 
                        value={formData.lifeTargetKm} 
                        onChange={handleChange} 
                        required
                    />
                </section>

                <div className="form-actions">
                    <button type="submit" className="save-btn" disabled={!isFormValid || isSaving}>
                        {isSaving ? 'Installation...' : <><FaSave /> Installer la pièce</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PartForm;