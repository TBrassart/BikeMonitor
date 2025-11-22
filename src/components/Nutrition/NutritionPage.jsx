import React, { useState, useEffect } from 'react';
import { FaPlus, FaMinus, FaAppleAlt, FaTint, FaCookieBite, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import { bikeService } from '../../services/api';
import NutritionForm from './NutritionForm'; // On va le créer juste après
import './NutritionPage.css';
import NutritionCalculator from './NutritionCalculator';

const NutritionPage = () => {
    const [items, setItems] = useState([]);
    const [filter, setFilter] = useState('solid'); // 'solid' ou 'liquid'
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await bikeService.getNutrition();
            setItems(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveItem = async (itemData) => {
        if (editingItem) {
            // UPDATE LOCAL
            setItems(prev => prev.map(i => i.id === itemData.id ? itemData : i));
        } else {
            // CREATE
            const added = await bikeService.addNutritionItem(itemData);
            setItems(prev => [...prev, added]);
        }
        setEditingItem(null);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation(); // Empêche d'ouvrir le formulaire
        if(window.confirm("Supprimer ce produit ?")) {
            setItems(prev => prev.filter(i => i.id !== id));
            // Appel API delete si elle existait
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleStockChange = async (id, change) => {
        // Mise à jour optimiste (instantanée dans l'UI)
        setItems(prev => prev.map(item => 
            item.id === id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
        ));
        // Appel API silencieux
        await bikeService.updateStock(id, change);
    };

    const handleAddItem = async (newItem) => {
        const added = await bikeService.addNutritionItem(newItem);
        setItems(prev => [...prev, added]);
    };

    // Filtrage
    const filteredItems = items.filter(item => item.category === filter);

    if (isFormOpen) {
        return <NutritionForm onClose={() => {setIsFormOpen(false); setEditingItem(null);}} onSave={handleSaveItem} initialData={editingItem} />;    }

    return (
        <div className="nutrition-container">
            <header className="page-header">
                <h1>Nutrition & Hydratation</h1>
                <button className="cta-add-standard" onClick={() => setIsFormOpen(true)}>
                    <FaPlus /> Ajouter un produit
                </button>
            </header>

            {/* On passe l'inventaire complet et la fonction pour déduire le stock */}
            <NutritionCalculator inventory={items} onConsume={handleStockChange} />

            {/* Navigation Onglets Interne */}
            <div className="nutrition-tabs">
                <button 
                    className={`nutri-tab ${filter === 'solid' ? 'active' : ''}`}
                    onClick={() => setFilter('solid')}
                >
                    <FaCookieBite /> Solide (Barres/Gels)
                </button>
                <button 
                    className={`nutri-tab ${filter === 'liquid' ? 'active' : ''}`}
                    onClick={() => setFilter('liquid')}
                >
                    <FaTint /> Hydratation (Boissons)
                </button>
            </div>

            <div className="nutrition-grid">
                {filteredItems.map(item => (
                    <div key={item.id} className={`nutrition-card ...`} onClick={() => openEdit(item)}>

                        <button className="delete-nutri-btn" onClick={(e) => handleDelete(e, item.id)}>
                            <FaTrash />
                        </button>

                        <div className="card-icon">
                            {item.category === 'solid' ? <FaCookieBite /> : <FaTint />}
                        </div>
                        
                        <div className="card-content">
                            <h3>{item.name}</h3>
                            <p className="brand">{item.brand} • {item.flavor}</p>
                            
                            {item.quantity <= item.minStock && (
                                <p className="stock-alert"><FaExclamationTriangle /> Stock bas</p>
                            )}
                        </div>

                        <div className="stock-controls" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleStockChange(item.id, -1)}><FaMinus /></button>
                            <span className="stock-value">{item.quantity}</span>
                            <button onClick={() => handleStockChange(item.id, 1)}><FaPlus /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NutritionPage;