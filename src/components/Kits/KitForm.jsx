import React, { useState, useEffect } from 'react';
import { FaSave, FaTimes, FaTshirt, FaAppleAlt } from 'react-icons/fa';
import { bikeService } from '../../services/api';
import '../Bike/BikeForm.css'; // Réutilisation style form global

const KitForm = ({ onClose, onSave }) => {
    const [kitName, setKitName] = useState('');
    const [inventory, setInventory] = useState({ equipment: [], nutrition: [] });
    const [selectedItems, setSelectedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [equip, nutri] = await Promise.all([
                    bikeService.getEquipment(),
                    bikeService.getNutrition()
                ]);
                setInventory({ equipment: equip, nutrition: nutri });
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggleItem = (item, category) => {
        const exists = selectedItems.find(i => i.id === item.id);
        if (exists) {
            // Retirer
            setSelectedItems(prev => prev.filter(i => i.id !== item.id));
        } else {
            // Ajouter
            setSelectedItems(prev => [...prev, { 
                id: item.id, 
                name: item.name, 
                category, 
                quantity: 1 // Par défaut
            }]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!kitName || selectedItems.length === 0) return;
        onSave({ name: kitName, items: selectedItems });
    };

    return (
        <div className="bike-form-container">
            <header className="form-header">
                <h2>Nouveau Kit</h2>
                <button onClick={onClose} className="close-btn"><FaTimes /></button>
            </header>

            <form onSubmit={handleSubmit} className="bike-form">
                {/* Partie Gauche : Nom et Résumé */}
                <section className="form-section">
                    <h3>Détails du Kit</h3>
                    <div className="input-group full-width">
                        <label>Nom du kit *</label>
                        <input 
                            type="text" 
                            value={kitName} 
                            onChange={(e) => setKitName(e.target.value)} 
                            placeholder="Ex: Sortie Pluie, Sortie Longue..." 
                            required
                        />
                    </div>
                    
                    <div className="selected-summary" style={{ marginTop: '20px' }}>
                        <h4>{selectedItems.length} éléments sélectionnés</h4>
                        <ul style={{ listStyle: 'none', padding: 0, color: '#aaa' }}>
                            {selectedItems.map(i => <li key={i.id}>• {i.name}</li>)}
                        </ul>
                    </div>
                </section>

                {/* Partie Droite : Sélecteur d'items */}
                <section className="form-section advanced-section">
                    <h3>Contenu du Kit</h3>
                    {isLoading ? <p>Chargement inventaire...</p> : (
                        <div className="inventory-selector">
                            {/* 1. NUTRITION SOLIDE */}
                            <h4 style={{ color: 'var(--color-neon-primary)', marginTop:'10px' }}>Barres & Gels</h4>
                            <div className="selector-grid">
                                {inventory.nutrition.filter(i => i.category === 'solid').map(item => (
                                    <div 
                                        key={item.id} 
                                        className={`chip selector-chip ${selectedItems.find(i=>i.id===item.id) ? 'active' : ''}`}
                                        onClick={() => toggleItem(item, 'nutrition')}
                                    >
                                        {item.name}
                                    </div>
                                ))}
                            </div>

                            {/* 2. NUTRITION LIQUIDE */}
                            <h4 style={{ color: 'var(--color-neon-primary)', marginTop:'20px' }}>Hydratation</h4>
                            <div className="selector-grid">
                                {inventory.nutrition.filter(i => i.category === 'liquid').map(item => (
                                    <div 
                                        key={item.id} 
                                        className={`chip selector-chip ${selectedItems.find(i=>i.id===item.id) ? 'active' : ''}`}
                                        onClick={() => toggleItem(item, 'nutrition')}
                                    >
                                        {item.name}
                                    </div>
                                ))}
                            </div>

                            {/* 3. TEXTILE */}
                            <h4 style={{ color: 'var(--color-neon-primary)', marginTop:'20px' }}>Textile</h4>
                            <div className="selector-grid">
                                {inventory.equipment.filter(i => i.category === 'textile').map(item => (
                                    <div 
                                        key={item.id} 
                                        className={`chip selector-chip ${selectedItems.find(i=>i.id===item.id) ? 'active' : ''}`}
                                        onClick={() => toggleItem(item, 'equipment')}
                                    >
                                        {item.name}
                                    </div>
                                ))}
                            </div>

                            {/* 4. TECH / ACCESSOIRES */}
                            <h4 style={{ color: 'var(--color-neon-primary)', marginTop:'20px' }}>Tech & Accessoires</h4>
                            <div className="selector-grid">
                                {inventory.equipment.filter(i => i.category === 'tech').map(item => (
                                    <div 
                                        key={item.id} 
                                        className={`chip selector-chip ${selectedItems.find(i=>i.id===item.id) ? 'active' : ''}`}
                                        onClick={() => toggleItem(item, 'equipment')}
                                    >
                                        {item.name}
                                    </div>
                                ))}
                            </div>

                        </div>
                    )}
                </section>

                <div className="form-actions">
                    <button type="submit" className="save-btn" disabled={!kitName || selectedItems.length === 0}>
                        <FaSave /> Créer le Kit
                    </button>
                </div>
            </form>
        </div>
    );
};

export default KitForm;