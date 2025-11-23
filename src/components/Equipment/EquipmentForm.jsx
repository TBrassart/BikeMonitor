import React, { useState } from 'react';
import { equipmentService } from '../../services/api';
import './EquipmentForm.css';

function EquipmentForm({ typePreselect, onSuccess, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        type: typePreselect || 'textile',
        category: '',
        season: 'all',
        condition: 'good',
        purchase_date: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await equipmentService.add(formData);
            if (onSuccess) onSuccess();
        } catch (err) {
            alert("Erreur ajout");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="equipment-form" onSubmit={handleSubmit}>
            <h3>Ajouter un équipement</h3>
            
            <div className="form-group">
                <label>Nom</label>
                <input type="text" name="name" placeholder="Ex: Maillot Club" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="form-row">
                <div className="form-group half">
                    <label>Marque</label>
                    <input type="text" name="brand" value={formData.brand} onChange={handleChange} />
                </div>
                <div className="form-group half">
                    <label>Type</label>
                    <select name="type" value={formData.type} onChange={handleChange}>
                        <option value="textile">Textile</option>
                        <option value="tech">Tech</option>
                        <option value="accessory">Accessoire</option>
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label>Catégorie</label>
                <input type="text" name="category" list="categories" placeholder="Ex: Cuissard, Casque..." value={formData.category} onChange={handleChange} />
                <datalist id="categories">
                    <option value="Maillot" /><option value="Cuissard" /><option value="Veste" />
                    <option value="Casque" /><option value="Chaussures" /><option value="GPS" />
                </datalist>
            </div>

            {formData.type === 'textile' && (
                <div className="form-group">
                    <label>Saison</label>
                    <select name="season" value={formData.season} onChange={handleChange}>
                        <option value="all">Toutes saisons</option>
                        <option value="summer">Été ☀️</option>
                        <option value="winter">Hiver ❄️</option>
                        <option value="mid-season">Mi-saison 🍂</option>
                    </select>
                </div>
            )}

            <div className="form-group">
                <label>État</label>
                <select name="condition" value={formData.condition} onChange={handleChange}>
                    <option value="new">Neuf (Top)</option>
                    <option value="good">Bon état</option>
                    <option value="worn">Usé (Entraînement)</option>
                    <option value="retired">HS / Archivé</option>
                </select>
            </div>

            <div className="form-actions">
                <button type="button" onClick={onCancel}>Annuler</button>
                <button type="submit" className="primary-btn" disabled={loading}>Ajouter</button>
            </div>
        </form>
    );
}

export default EquipmentForm;