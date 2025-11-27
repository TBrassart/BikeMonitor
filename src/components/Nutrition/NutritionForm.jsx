import React, { useState, useEffect } from 'react';
import { FaSave, FaTimes } from 'react-icons/fa';
import './NutritionPage.css';

// NOTE : On a retiré l'import de nutritionService ici.
// C'est le parent (NutritionPage) qui gère l'appel API.

const NutritionForm = ({ onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        name: '', brand: '', category_type: 'bar', 
        quantity: 0, min_quantity: 2,
        carbs: 0, proteins: 0, fat: 0,
        caffeine: false, 
        tags: [], 
        timing: [], 
        recipe: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                tags: initialData.tags || [],
                timing: initialData.timing || []
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const toggleArrayItem = (field, value) => {
        setFormData(prev => {
            const list = prev[field].includes(value)
                ? prev[field].filter(i => i !== value)
                : [...prev[field], value];
            return { ...prev, [field]: list };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Préparation des données propres
        const dataToSave = {
            ...formData,
            // Si on modifie un item existant, on garde l'ID
            id: initialData ? initialData.id : undefined, 
            
            // Conversion des chiffres
            carbs: parseFloat(formData.carbs) || 0,
            proteins: parseFloat(formData.proteins) || 0,
            fat: parseFloat(formData.fat) || 0,
            quantity: parseInt(formData.quantity) || 0,
            min_quantity: parseInt(formData.min_quantity) || 0,
            
            // On s'assure que ces tableaux ne sont pas null
            tags: formData.tags || [],
            timing: formData.timing || []
        };

        // CORRECTION CRITIQUE : On passe les données au parent
        // On ne fait pas l'appel API ici
        if (onSave) {
            onSave(dataToSave);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="glass-panel modal-content nutri-form-modal">
                <div className="form-header">
                    <h3>{initialData ? 'Modifier' : 'Ajouter'} Nutrition</h3>
                    <button onClick={onClose} className="close-btn"><FaTimes /></button>
                </div>

                <form onSubmit={handleSubmit} className="nutri-form">
                    <div className="form-grid-2">
                        <div className="form-group">
                            <label>Nom</label>
                            <input name="name" value={formData.name} onChange={handleChange} required placeholder="Ex: Gel Caféine" />
                        </div>
                        <div className="form-group">
                            <label>Marque</label>
                            <input name="brand" value={formData.brand} onChange={handleChange} placeholder="Ex: Maurten" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Type</label>
                        <select name="category_type" value={formData.category_type} onChange={handleChange} className="neon-select">
                            <option value="bar">Barre</option>
                            <option value="gel">Gel</option>
                            <option value="drink">Boisson / Poudre</option>
                            <option value="compote">Compote / Purée</option>
                            <option value="meal">Repas lyophilisé</option>
                            <option value="other">Autre</option>
                        </select>
                    </div>

                    <div className="form-section-title">Macros (par unité)</div>
                    <div className="form-grid-3">
                        <div className="form-group"><label>Glucides</label><input type="number" name="carbs" step="0.1" value={formData.carbs} onChange={handleChange} /></div>
                        <div className="form-group"><label>Protéines</label><input type="number" name="proteins" step="0.1" value={formData.proteins} onChange={handleChange} /></div>
                        <div className="form-group"><label>Lipides</label><input type="number" name="fat" step="0.1" value={formData.fat} onChange={handleChange} /></div>
                    </div>

                    <div className="form-section-title">Propriétés</div>
                    <div className="tags-selector">
                        <button type="button" className={`chip ${formData.caffeine ? 'active' : ''}`} onClick={() => setFormData(p => ({...p, caffeine: !p.caffeine}))}>☕ Caféine</button>
                        <button type="button" className={`chip ${formData.tags.includes('vegan') ? 'active' : ''}`} onClick={() => toggleArrayItem('tags', 'vegan')}>🌱 Vegan</button>
                        <button type="button" className={`chip ${formData.tags.includes('homemade') ? 'active' : ''}`} onClick={() => toggleArrayItem('tags', 'homemade')}>🏠 Maison</button>
                        <button type="button" className={`chip ${formData.tags.includes('lactose_free') ? 'active' : ''}`} onClick={() => toggleArrayItem('tags', 'lactose_free')}>🥛 Sans Lactose</button>
                    </div>

                    <div className="form-section-title">Moment</div>
                    <div className="tags-selector">
                        <button type="button" className={`chip blue ${formData.timing.includes('pre') ? 'active' : ''}`} onClick={() => toggleArrayItem('timing', 'pre')}>Avant</button>
                        <button type="button" className={`chip orange ${formData.timing.includes('during') ? 'active' : ''}`} onClick={() => toggleArrayItem('timing', 'during')}>Pendant</button>
                        <button type="button" className={`chip green ${formData.timing.includes('post') ? 'active' : ''}`} onClick={() => toggleArrayItem('timing', 'post')}>Après</button>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group"><label>Stock Actuel</label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} /></div>
                        <div className="form-group"><label>Alerte Min.</label><input type="number" name="min_quantity" value={formData.min_quantity} onChange={handleChange} /></div>
                    </div>

                    {formData.tags.includes('homemade') && (
                        <div className="form-group">
                            <label>Recette</label>
                            <textarea name="recipe" value={formData.recipe} onChange={handleChange} rows="3" />
                        </div>
                    )}

                    <button type="submit" className="primary-btn full-width">
                        <FaSave /> {initialData ? 'Mettre à jour' : 'Enregistrer'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NutritionForm;