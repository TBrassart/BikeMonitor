import React, { useState, useEffect } from 'react';
import { FaPlus, FaMinus, FaAppleAlt, FaTint, FaCookieBite, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
// CORRECTION : On n'importe que nutritionService
import { nutritionService } from '../../services/api';
import NutritionForm from './NutritionForm';
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
            const data = await nutritionService.getAll();
            setItems(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveItem = async (itemData) => {
        try {
            if (editingItem) {
                // UPDATE (CORRIGÉ : Appel API réel)
                await nutritionService.update(itemData.id, itemData);
            } else {
                // CREATE (CORRIGÉ : Utilisation de nutritionService)
                await nutritionService.add(itemData);
            }
            // On recharge pour être sûr d'avoir les données fraîches
            loadData();
            setIsFormOpen(false);
            setEditingItem(null);
        } catch (e) {
            console.error("Erreur sauvegarde", e);
            alert("Erreur lors de la sauvegarde");
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Empêche le clic sur la carte
        if (window.confirm("Supprimer cet aliment ?")) {
            try {
                // CORRIGÉ : Utilisation de nutritionService
                await nutritionService.delete(id);
                loadData();
            } catch (e) {
                alert("Erreur suppression");
            }
        }
    };

    const handleStockChange = async (id, delta) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        const newQty = Math.max(0, item.quantity + delta);
        
        // Optimiste UI update (pour la réactivité)
        setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));

        try {
            // CORRIGÉ : Mise à jour simple du stock via update
            // (Pour l'historique d'achat complet avec prix, on passera par la fiche détail plus tard)
            await nutritionService.update(id, { quantity: newQty });
        } catch (e) {
            console.error(e);
            loadData(); // Revert en cas d'erreur
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const openNew = () => {
        setEditingItem(null);
        setIsFormOpen(true);
    };

    // Filtrage (optionnel, ici on affiche tout ou on filtre par type si besoin)
    // Pour l'instant on affiche tout, ou on peut filtrer par category_type si défini
    const displayedItems = items; 

    if (isLoading) return <div className="loading">Chargement du garde-manger...</div>;

    return (
        <div className="nutrition-container">
            
            {/* HEADER */}
            <header className="page-header">
                <div>
                    <h2 className="gradient-text">Nutrition</h2>
                    <p className="subtitle">Gère ton carburant</p>
                </div>
                <button className="add-btn primary-btn" onClick={openNew}>
                    <FaPlus /> <span className="desktop-only">Ajouter</span>
                </button>
            </header>

            {/* CALCULATEUR (On lui passe le stock) */}
            <NutritionCalculator inventory={items} onConsume={loadData} />

            {/* LISTE */}
            <div className="nutrition-grid">
                {displayedItems.length === 0 ? (
                    <div className="empty-state glass-panel">Stock vide.</div>
                ) : (
                    displayedItems.map(item => (
                        <div key={item.id} className={`nutrition-card glass-panel ${item.quantity <= item.min_quantity ? 'low-stock' : ''}`} onClick={() => openEdit(item)}>

                            <button className="delete-nutri-btn" onClick={(e) => handleDelete(e, item.id)}>
                                <FaTrash />
                            </button>

                            <div className="card-icon">
                                {/* Icône dynamique selon le type */}
                                {item.category_type === 'drink' || item.category_type === 'gel' ? <FaTint /> : <FaCookieBite />}
                            </div>
                            
                            <div className="card-content">
                                <h3>{item.name}</h3>
                                <p className="brand">{item.brand} {item.caffeine ? '• ⚡ Caféine' : ''}</p>
                                
                                {item.quantity <= item.min_quantity && (
                                    <p className="stock-alert"><FaExclamationTriangle /> Stock bas</p>
                                )}
                            </div>

                            <div className="stock-controls" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleStockChange(item.id, -1)}><FaMinus /></button>
                                <span className="stock-value">{item.quantity}</span>
                                <button onClick={() => handleStockChange(item.id, 1)}><FaPlus /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODALE FORMULAIRE */}
            {isFormOpen && (
                <NutritionForm 
                    onClose={() => setIsFormOpen(false)} 
                    onSave={handleSaveItem} 
                    initialData={editingItem}
                />
            )}
        </div>
    );
};

export default NutritionPage;