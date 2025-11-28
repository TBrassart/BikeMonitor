import React, { useState, useEffect } from 'react';
import { kitService, equipmentService, nutritionService } from '../../services/api';
import { FaSave, FaTimes, FaPlus, FaTrash, FaBoxOpen, FaPen, FaSmile } from 'react-icons/fa';
import './KitsPage.css';

const KitForm = ({ onClose, onSave, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '', description: '', icon: '🎒', items: []
    });

    // Données pour la sélection
    const [stockEquipment, setStockEquipment] = useState([]);
    const [stockNutrition, setStockNutrition] = useState([]);
    
    // État de l'ajout
    const [addMode, setAddMode] = useState('stock'); // 'stock' | 'manual'
    const [selectedStockId, setSelectedStockId] = useState('');
    const [newItem, setNewItem] = useState({ label: '', category: 'gear' });

    // État Modale Icône
    const [showIconPicker, setShowIconPicker] = useState(false);
    const iconsList = ['🎒', '🌧️', '☀️', '🏔️', '🏁', '🚴', '🛠️', '🚑', '🌙', '🏕️', '🥶', '🔥', '🌊', '🔋', '🥪'];

    useEffect(() => {
        loadResources();
        if (initialData) setFormData(initialData);
    }, [initialData]);

    const loadResources = async () => {
        const [equip, nutri] = await Promise.all([
            equipmentService.getAll(),
            nutritionService.getAll()
        ]);
        setStockEquipment(equip || []);
        setStockNutrition(nutri || []);
    };

    // --- GESTION AJOUT ---
    
    const handleStockSelect = (e) => {
        const id = e.target.value;
        setSelectedStockId(id);
        
        if (!id) return;

        // On cherche dans l'équipement
        let found = stockEquipment.find(i => i.id === id);
        let cat = 'gear';

        if (found) {
            // Mapping catégorie Equipement -> Kit
            if (found.type === 'textile') cat = 'wear';
            if (found.type === 'tech') cat = 'tech';
        } else {
            // Sinon on cherche dans la nutrition
            found = stockNutrition.find(i => i.id === id);
            if (found) cat = 'nutrition';
        }

        if (found) {
            setNewItem({ label: found.name, category: cat });
        }
    };

    const addItem = (e) => {
        e.preventDefault();
        if (!newItem.label) return;
        
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { ...newItem, checked: false }]
        }));
        
        // Reset
        setNewItem({ label: '', category: 'gear' });
        setSelectedStockId('');
    };

    const removeItem = (index) => {
        const updated = [...formData.items];
        updated.splice(index, 1);
        setFormData({ ...formData, items: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (initialData) await kitService.update(initialData.id, formData);
            else await kitService.add(formData);
            if (onSave) onSave();
            onClose();
        } catch(e) { alert("Erreur sauvegarde"); } 
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay">
            {/* MODALE SÉLECTION ICONE (Z-INDEX SUPÉRIEUR) */}
            {showIconPicker && (
                <div className="icon-picker-overlay" onClick={() => setShowIconPicker(false)}>
                    <div className="glass-panel icon-picker-modal" onClick={e => e.stopPropagation()}>
                        <h4>Choisir une icône</h4>
                        <div className="icons-grid">
                            {iconsList.map(ico => (
                                <button key={ico} onClick={() => { setFormData({...formData, icon: ico}); setShowIconPicker(false); }} className="icon-option">
                                    {ico}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-panel modal-content kit-form-modal">
                <div className="form-header">
                    <h3>{initialData ? 'Modifier' : 'Nouveau'} Kit</h3>
                    <button onClick={onClose} className="close-btn"><FaTimes /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Identité du Kit</label>
                        <div style={{display:'flex', gap:'10px'}}>
                            <button 
                                type="button" 
                                className="icon-select-btn" 
                                onClick={() => setShowIconPicker(true)}
                            >
                                {formData.icon}
                            </button>
                            <input 
                                style={{flex:1}} 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                placeholder="Nom (ex: Sortie Pluie)" 
                                required 
                            />
                        </div>
                    </div>

                    {/* ZONE D'AJOUT INTELLIGENTE */}
                    <div className="add-item-box glass-panel">
                        <div className="add-tabs">
                            <button type="button" className={addMode === 'stock' ? 'active' : ''} onClick={() => setAddMode('stock')}><FaBoxOpen /> Depuis Stock</button>
                            <button type="button" className={addMode === 'manual' ? 'active' : ''} onClick={() => setAddMode('manual')}><FaPen /> Manuel</button>
                        </div>

                        <div className="add-inputs">
                            {addMode === 'stock' ? (
                                <select className="neon-select full-width" value={selectedStockId} onChange={handleStockSelect}>
                                    <option value="">-- Choisir un objet --</option>
                                    <optgroup label="Nutrition">
                                        {stockNutrition.map(n => <option key={n.id} value={n.id}>{n.name} ({n.brand})</option>)}
                                    </optgroup>
                                    <optgroup label="Équipement">
                                        {stockEquipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </optgroup>
                                </select>
                            ) : (
                                <input 
                                    value={newItem.label} 
                                    onChange={e => setNewItem({...newItem, label: e.target.value})} 
                                    placeholder="Nom de l'objet..." 
                                    className="full-width"
                                />
                            )}

                            <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                                <select 
                                    value={newItem.category} 
                                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                                    className="neon-select"
                                    style={{width:'140px'}}
                                >
                                    <option value="gear">Matos 🔧</option>
                                    <option value="wear">Vêtements 🧢</option>
                                    <option value="nutrition">Nutrition 🍎</option>
                                    <option value="tech">Tech 📱</option>
                                </select>
                                <button onClick={addItem} className="add-action-btn">
                                    <FaPlus /> Ajouter
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* LISTE */}
                    <div className="items-preview-list">
                        {formData.items.length === 0 && <p className="empty-text">Liste vide.</p>}
                        {formData.items.map((it, i) => (
                            <div key={i} className="preview-item">
                                <span className={`cat-dot ${it.category}`}></span>
                                <span style={{flex:1}}>{it.label}</span>
                                <FaTrash className="trash-icon" onClick={() => removeItem(i)} />
                            </div>
                        ))}
                    </div>

                    <button type="submit" className="primary-btn full-width" style={{marginTop:'20px'}} disabled={loading}>
                        <FaSave /> Enregistrer le Kit
                    </button>
                </form>
            </div>
        </div>
    );
};

export default KitForm;