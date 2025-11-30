import React, { useState } from 'react';
import { equipmentService } from '../../services/api';
import './EquipmentForm.css';

function EquipmentForm({ typePreselect, onSuccess, onCancel, initialData }) {
    const isEditMode = Boolean(initialData);

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        type: typePreselect || 'textile',
        category: '',
        season: 'all',
        condition: 'good',
        purchase_date: '',
        is_shared: false
    });

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const cleanedData = {
                name: formData.name,
                brand: formData.brand || null,
                type: formData.type,
                category: formData.category || null,
                season: formData.season,
                condition: formData.condition,
                purchase_date: formData.purchase_date || null,
                is_shared: formData.is_shared,
            };

            if (isEditMode) {
                await equipmentService.update(initialData.id, cleanedData); 
            } else {
                await equipmentService.add(cleanedData); 
            }
            if (onSuccess) onSuccess();
        } catch (err) {
            // Afficher une erreur plus précise en console
            console.error("Erreur détaillée lors de l'ajout d'équipement:", err);
            alert("Erreur ajout. Veuillez vérifier la console pour le détail.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="equipment-form" onSubmit={handleSubmit}>
            <h3>{isEditMode ? 'Modifier' : 'Ajouter'} un équipement</h3>
            
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

            <div className="form-group checkbox-group" style={{background:'rgba(255,255,255,0.05)', padding:'10px', borderRadius:'8px', marginTop:'10px'}}>
                <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer'}}>
                    <input 
                        type="checkbox" 
                        name="is_shared" 
                        checked={formData.is_shared} 
                        onChange={handleChange}
                        style={{width:'20px', height:'20px'}}
                    />
                    <div>
                        <span style={{display:'block', fontWeight:'bold'}}>Partager dans l'Atelier Turlag</span>
                        <small style={{color:'#aaa', fontWeight:'normal'}}>Visible par les membres de vos groupes (pour prêt/dépannage)</small>
                    </div>
                </label>
            </div>
            
            <div className="form-actions">
                <button type="button" onClick={onCancel}>Annuler</button>
                <button type="submit" className="primary-btn" disabled={loading}>
                    {isEditMode ? 'Mettre à jour' : 'Ajouter'}
                </button>
            </div>
        </form>
    );
}

export default EquipmentForm;