import React, { useState, useEffect } from 'react';
import { FaSave, FaTimes } from 'react-icons/fa';
// On réutilise le CSS du formulaire vélo pour la cohérence
import '../Bike/BikeForm.css'; 

const NutritionForm = ({ onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        category: 'solid', // Default
        flavor: '',
        quantity: 0,
        minStock: 5
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if(formData.name) {
            onSave(formData);
            onClose();
        }
    };

    return (
        <div className="bike-form-container"> 
            <header className="form-header">
                <h2>{initialData ? 'Modifier' : 'Nouveau'} Produit</h2>
                <button onClick={onClose} className="close-btn"><FaTimes /></button>
            </header>

            <form onSubmit={handleSubmit} className="bike-form">
                <section className="form-section">
                    <h3>Informations Produit</h3>
                    
                    <div className="input-group">
                        <label>Nom du produit *</label>
                        <input name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Ex: Gel Caféine" required />
                    </div>

                    <div className="input-group">
                        <label>Marque</label>
                        <input name="brand" type="text" value={formData.brand} onChange={handleChange} placeholder="Ex: Sis" />
                    </div>

                    <div className="input-group">
                        <label>Catégorie</label>
                        <div className="type-chips">
                            <button type="button" className={`chip ${formData.category === 'solid' ? 'active' : ''}`} onClick={() => setFormData({...formData, category: 'solid'})}>Solide</button>
                            <button type="button" className={`chip ${formData.category === 'liquid' ? 'active' : ''}`} onClick={() => setFormData({...formData, category: 'liquid'})}>Liquide</button>
                        </div>
                    </div>
                </section>

                <section className="form-section">
                    <h3>Stock & Gestion</h3>
                    <div className="input-group">
                        <label>Stock initial</label>
                        <input name="quantity" type="number" value={formData.quantity} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label>Seuil d'alerte (min)</label>
                        <input name="minStock" type="number" value={formData.minStock} onChange={handleChange} />
                    </div>
                </section>

                <section className="form-section">
                    <h3>Valeurs Nutritionnelles (par unité)</h3>
                    <div className="details-grid"> {/* Utilise ta grille existante */}
                        <div className="input-group">
                            <label>Glucides (g)</label>
                            <input name="carbs" type="number" value={formData.carbs} onChange={handleChange} />
                        </div>
                        <div className="input-group">
                            <label>Protéines (g)</label>
                            <input name="proteins" type="number" value={formData.proteins} onChange={handleChange} />
                        </div>
                        <div className="input-group">
                            <label>Lipides (g)</label>
                            <input name="fat" type="number" value={formData.fat} onChange={handleChange} />
                        </div>
                        <div className="input-group">
                            <label>Prix (€)</label>
                            <input name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} />
                        </div>
                    </div>
                </section>

                <div className="form-actions">
                    <button type="submit" className="save-btn">
                        <FaSave /> {initialData ? 'Mettre à jour' : 'Ajouter'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NutritionForm;