import React, { useState, useEffect } from 'react';
import { FaSearch, FaPlus, FaDatabase, FaCogs, FaPen, FaFilter } from 'react-icons/fa';
import { bikeService } from '../../services/api';
import LibraryForm from './LibraryForm';
import './LibraryPage.css';

const LibraryPage = () => {
    const [libraryItems, setLibraryItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    // 1. NOUVEL ÉTAT POUR LE FILTRE
    const [selectedCategory, setSelectedCategory] = useState('all');
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const isAdmin = true; 

    // Liste des filtres disponibles
    const categories = [
        { id: 'all', label: 'Tout' },
        { id: 'chain', label: 'Chaînes' },
        { id: 'cassette', label: 'Cassettes' },
        { id: 'tire', label: 'Pneus' },
        { id: 'brake_pads', label: 'Plaquettes' },
        { id: 'other', label: 'Autres' }
    ];

    useEffect(() => {
        loadLibrary();
    }, []);

    const loadLibrary = async () => {
        setIsLoading(true);
        const data = await bikeService.getLibrary();
        setLibraryItems(data || []);
        setIsLoading(false);
    };

    const handleSaveItem = async (itemData) => {
        if (editingItem) {
            const updated = await bikeService.updateLibraryItem(editingItem.id, itemData);
            setLibraryItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
            setEditingItem(null);
        } else {
            const added = await bikeService.addToLibrary(itemData);
            setLibraryItems(prev => [...prev, added]);
        }
    };

    const handleEditClick = (item) => {
        setEditingItem(item); 
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingItem(null);
    };

    // 2. LOGIQUE DE FILTRAGE MISE À JOUR
    const filteredItems = libraryItems.filter(item => {
        // Filtre par texte
        const matchesSearch = 
            item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.brand.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Filtre par catégorie
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    if (isFormOpen) {
        return (
            <LibraryForm 
                onClose={handleCloseForm} 
                onSave={handleSaveItem} 
                initialData={editingItem} 
            />
        );
    }

    return (
        <div className="library-container">
            <header className="page-header">
                <h1><FaDatabase /> Bibliothèque</h1>
                {isAdmin && (
                    <button className="cta-add-standard" onClick={() => setIsFormOpen(true)}>
                        <FaPlus /> Nouveau Modèle
                    </button>
                )}
            </header>

            <div className="search-bar-container">
                <FaSearch className="search-icon" />
                <input 
                    type="text" 
                    placeholder="Rechercher un composant..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            {/* 3. BARRE DE FILTRES HORIZONTALE */}
            <div className="filters-bar">
                <FaFilter className="filter-icon" style={{marginRight: '10px', color: '#666'}}/>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`filter-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat.id)}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            <div className="library-grid">
                {filteredItems.map(item => (
                    <div key={item.id} className="library-card" style={{position: 'relative'}}>
                        <div className="lib-icon"><FaCogs /></div>
                        <div className="lib-content">
                            <h3>{item.brand} {item.model}</h3>
                            <span className="lib-tag">{item.category}</span>
                            <p className="lib-specs">Durée : <strong>{item.lifespan_km} km</strong></p>
                        </div>

                        {isAdmin && (
                            <button 
                                onClick={() => handleEditClick(item)}
                                title="Modifier ce modèle"
                                style={{
                                    position: 'absolute', top: '15px', right: '15px', 
                                    background: 'rgba(255,255,255,0.1)', border: 'none', 
                                    color: '#ccc', cursor: 'pointer', padding: '8px', 
                                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <FaPen size={12} />
                            </button>
                        )}
                    </div>
                ))}
                
                {filteredItems.length === 0 && !isLoading && (
                    <p style={{gridColumn: '1/-1', textAlign: 'center', color: '#666', marginTop: '20px'}}>
                        Aucun composant ne correspond à votre recherche.
                    </p>
                )}
            </div>
        </div>
    );
};

export default LibraryPage;