import React, { useState, useEffect } from 'react';
import { equipmentService } from '../../services/api';
import { FaTshirt, FaMicrochip, FaTools, FaPlus, FaSnowflake, FaSun, FaLeaf, FaTrash, FaBatteryThreeQuarters } from 'react-icons/fa';
import EquipmentForm from './EquipmentForm';
import './EquipmentPage.css';

function EquipmentPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('textile'); // 'textile', 'tech', 'accessory'
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await equipmentService.getAll();
            setItems(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Supprimer cet équipement ?")) {
            await equipmentService.delete(id);
            loadData();
        }
    };

    // Filtre par onglet
    const filteredItems = items.filter(item => item.type === activeTab);

    // Helpers visuels
    const getConditionColor = (cond) => {
        if (cond === 'new') return 'var(--neon-green)';     // Vert
        if (cond === 'good') return '#facc15';              // Jaune
        if (cond === 'worn') return '#fb923c';              // Orange
        if (cond === 'retired') return '#ef4444';           // Rouge
        return 'white';
    };

    const getSeasonIcon = (season) => {
        if (season === 'winter') return <FaSnowflake title="Hiver" />;
        if (season === 'summer') return <FaSun title="Été" />;
        if (season === 'mid-season') return <FaLeaf title="Mi-saison" />;
        return null;
    };

    return (
        <div className="equipment-page">
            <header className="page-header">
                <div>
                    <h2 className="gradient-text">Vestiaire</h2>
                    <p className="subtitle">Gère tes tenues et ton matos</p>
                </div>
                <button className="add-btn" onClick={() => setShowForm(true)}>
                    <FaPlus />
                </button>
            </header>

            {/* TABS DE NAVIGATION */}
            <div className="equip-tabs glass-panel">
                <button 
                    className={`equip-tab ${activeTab === 'textile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('textile')}
                >
                    <FaTshirt /> Textile
                </button>
                <button 
                    className={`equip-tab ${activeTab === 'tech' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tech')}
                >
                    <FaMicrochip /> Tech
                </button>
                <button 
                    className={`equip-tab ${activeTab === 'accessory' ? 'active' : ''}`}
                    onClick={() => setActiveTab('accessory')}
                >
                    <FaTools /> Atelier
                </button>
            </div>

            {/* FORMULAIRE (MODAL) */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="glass-panel modal-content">
                        <EquipmentForm 
                            typePreselect={activeTab}
                            onSuccess={() => { setShowForm(false); loadData(); }} 
                            onCancel={() => setShowForm(false)} 
                        />
                    </div>
                </div>
            )}

            {/* GRILLE D'ITEMS */}
            {loading ? <div className="loading">Chargement du matos...</div> : (
                <div className="equipment-grid">
                    {filteredItems.length === 0 ? (
                        <div className="empty-state glass-panel">
                            <p>Rien ici pour l'instant.</p>
                        </div>
                    ) : (
                        filteredItems.map(item => (
                            <div 
                                key={item.id} 
                                className="equip-card glass-panel"
                                style={{ borderLeft: `4px solid ${getConditionColor(item.condition)}` }}
                            >
                                <div className="equip-header">
                                    <div className="equip-title">
                                        <h4>{item.name}</h4>
                                        <span className="brand">{item.brand}</span>
                                    </div>
                                    <div className="equip-icons">
                                        {item.type === 'textile' && <span className="season-icon">{getSeasonIcon(item.season)}</span>}
                                        {item.type === 'tech' && <FaBatteryThreeQuarters className="tech-icon" />}
                                    </div>
                                </div>

                                <div className="equip-meta">
                                    <span className="category-badge">{item.category}</span>
                                    {item.profiles?.avatar && (
                                        <div className="owner-avatar-small" title={item.profiles.name}>
                                            {item.profiles.avatar}
                                        </div>
                                    )}
                                </div>

                                <button onClick={() => handleDelete(item.id)} className="delete-icon">
                                    <FaTrash />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default EquipmentPage;