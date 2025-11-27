import React, { useState, useEffect } from 'react';
import { nutritionService } from '../../services/api';
import { FaSave, FaTimes, FaLeaf, FaCoffee, FaUtensils } from 'react-icons/fa';
import './NutritionPage.css';

const NutritionForm = ({ onClose, onSave, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '', brand: '', category_type: 'bar', 
        quantity: 0, min_quantity: 2,
        carbs: 0, proteins: 0, fat: 0,
        caffeine: false, 
        tags: [], 
        timing: [], // 'pre', 'during', 'post'
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

    // Gestion des arrays (Tags, Timing)
    const toggleArrayItem = (field, value) => {
        setFormData(prev => {
            const list = prev[field].includes(value)
                ? prev[field].filter(i => i !== value)
                : [...prev[field], value];
            return { ...prev, [field]: list };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSave = {
                ...formData,
                carbs: parseFloat(formData.carbs),
                proteins: parseFloat(formData.proteins),
                fat: parseFloat(formData.fat),
                quantity: parseInt(formData.quantity),
                min_quantity: parseInt(formData.min_quantity)
            };

            if (initialData) {
                await nutritionService.update(initialData.id, dataToSave);
            } else {
                await nutritionService.add(dataToSave);
            }
            if (onSave) onSave();
            onClose();
        } catch (err) {
            alert("Erreur enregistrement");
        } finally {
            setLoading(false);
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

                    {/* MACROS */}
                    <div className="form-section-title">Macros (par unité/dose)</div>
                    <div className="form-grid-3">
                        <div className="form-group"><label>Glucides</label><input type="number" name="carbs" step="0.1" value={formData.carbs} onChange={handleChange} /></div>
                        <div className="form-group"><label>Protéines</label><input type="number" name="proteins" step="0.1" value={formData.proteins} onChange={handleChange} /></div>
                        <div className="form-group"><label>Lipides</label><input type="number" name="fat" step="0.1" value={formData.fat} onChange={handleChange} /></div>
                    </div>

                    {/* OPTIONS & TAGS */}
                    <div className="form-section-title">Propriétés</div>
                    <div className="tags-selector">
                        <button type="button" className={`chip ${formData.caffeine ? 'active' : ''}`} onClick={() => setFormData(p => ({...p, caffeine: !p.caffeine}))}>☕ Caféine</button>
                        <button type="button" className={`chip ${formData.tags.includes('vegan') ? 'active' : ''}`} onClick={() => toggleArrayItem('tags', 'vegan')}>🌱 Vegan</button>
                        <button type="button" className={`chip ${formData.tags.includes('homemade') ? 'active' : ''}`} onClick={() => toggleArrayItem('tags', 'homemade')}>🏠 Maison</button>
                        <button type="button" className={`chip ${formData.tags.includes('lactose_free') ? 'active' : ''}`} onClick={() => toggleArrayItem('tags', 'lactose_free')}>🥛 Sans Lactose</button>
                    </div>

                    <div className="form-section-title">Moment de consommation</div>
                    <div className="tags-selector">
                        <button type="button" className={`chip blue ${formData.timing.includes('pre') ? 'active' : ''}`} onClick={() => toggleArrayItem('timing', 'pre')}>Avant</button>
                        <button type="button" className={`chip orange ${formData.timing.includes('during') ? 'active' : ''}`} onClick={() => toggleArrayItem('timing', 'during')}>Pendant</button>
                        <button type="button" className={`chip green ${formData.timing.includes('post') ? 'active' : ''}`} onClick={() => toggleArrayItem('timing', 'post')}>Après (Récup)</button>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group"><label>Stock Actuel</label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} /></div>
                        <div className="form-group"><label>Alerte Min.</label><input type="number" name="min_quantity" value={formData.min_quantity} onChange={handleChange} /></div>
                    </div>

                    {/* RECETTE (Si Maison) */}
                    {formData.tags.includes('homemade') && (
                        <div className="form-group">
                            <label>Recette / Notes</label>
                            <textarea name="recipe" value={formData.recipe} onChange={handleChange} rows="3" placeholder="Ingrédients, préparation..." />
                        </div>
                    )}

                    <button type="submit" className="primary-btn full-width" disabled={loading}>
                        <FaSave /> {loading ? '...' : 'Enregistrer'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NutritionForm;