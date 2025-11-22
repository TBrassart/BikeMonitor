import React, { useState, useEffect } from 'react';
import { FaPlus, FaTshirt, FaMicrochip, FaTrash, FaBatteryFull, FaBatteryQuarter, FaCheckCircle } from 'react-icons/fa';
import { bikeService } from '../../services/api';
import EquipmentForm from './EquipmentForm';
import './EquipmentPage.css';

const EquipmentPage = () => {
    const [items, setItems] = useState([]);
    const [filter, setFilter] = useState('textile');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await bikeService.getEquipment();
            setItems(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveItem = async (itemData) => {
        if (editingItem) {
            // Mode ÉDITION (Simulé : on supprime l'ancien et on met le nouveau, ou on update via API)
            // Pour simplifier avec l'API mock, on fait une mise à jour locale
            setItems(prev => prev.map(i => i.id === itemData.id ? itemData : i));
            // Dans la vraie vie : await bikeService.updateEquipment(itemData);
        } else {
            // Mode CRÉATION
            const added = await bikeService.addEquipment(itemData);
            setItems(prev => [...prev, added]);
        }
        setEditingItem(null); // Fermer le mode édition
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    // Modification de la fermeture
    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingItem(null);
    }

    if (isFormOpen) {
        return <EquipmentForm onClose={handleCloseForm} onSave={handleSaveItem} initialData={editingItem} />;
    }

    const handleAddItem = async (newItem) => {
        const added = await bikeService.addEquipment(newItem);
        setItems(prev => [...prev, added]);
    };

    const handleDelete = async (id) => {
        if(window.confirm("Supprimer cet équipement ?")) {
            await bikeService.deleteEquipment(id);
            setItems(prev => prev.filter(i => i.id !== id));
        }
    };

    const filteredItems = items.filter(item => item.category === filter);

    const getStateColor = (state) => {
        if (state === 'new') return '#2ecc71'; // Vert
        if (state === 'good') return '#3498db'; // Bleu
        if (state === 'worn') return '#f39c12'; // Orange
        return '#ccc';
    };

    if (isFormOpen) {
        return <EquipmentForm onClose={() => setIsFormOpen(false)} onSave={handleAddItem} />;
    }

    return (
        <div className="equipment-container">
            <header className="page-header">
                <h1>Mon Matériel</h1>
                <button className="cta-add-standard" onClick={() => setIsFormOpen(true)}>
                    <FaPlus /> Ajouter équipement
                </button>
            </header>

            {/* Navigation Onglets */}
            <div className="equipment-tabs">
                <button 
                    className={`equip-tab ${filter === 'textile' ? 'active' : ''}`}
                    onClick={() => setFilter('textile')}
                >
                    <FaTshirt /> Textile
                </button>
                <button 
                    className={`equip-tab ${filter === 'tech' ? 'active' : ''}`}
                    onClick={() => setFilter('tech')}
                >
                    <FaMicrochip /> Tech & Accessoires
                </button>
            </div>

            <div className="equipment-grid">
                {filteredItems.map(item => (
                    <div key={item.id} className="equipment-card" onClick={() => openEdit(item)}>
                        <div className="card-icon-equip">
                            {item.category === 'textile' ? <FaTshirt /> : <FaMicrochip />}
                        </div>
                        
                        <div className="card-content">
                            <h3>{item.name}</h3>
                            <p className="brand">{item.brand} • {item.type}</p>
                            
                            <div className="status-badge">
                                {item.category === 'textile' ? (
                                    <span style={{ color: getStateColor(item.state) }}>
                                        <FaCheckCircle /> État : {item.state === 'new' ? 'Neuf' : item.state === 'good' ? 'Bon' : 'Usé'}
                                    </span>
                                ) : (
                                    <span className="tech-status">
                                        <FaBatteryFull /> Batterie OK
                                    </span>
                                )}
                            </div>
                        </div>

                        <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                            <FaTrash />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default EquipmentPage;