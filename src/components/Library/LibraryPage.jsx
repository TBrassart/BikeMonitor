import React, { useState, useEffect } from 'react';
import { libraryService } from '../../services/api';
import { FaPlus, FaCogs, FaFilter } from 'react-icons/fa';
import LibraryForm from './LibraryForm';
import './LibraryPage.css';

function LibraryPage() {
    const [components, setComponents] = useState([]);
    const [filteredComponents, setFilteredComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // Catégories pour le filtre
    const categories = ['Tous', 'Transmission', 'Freinage', 'Pneus', 'Roues', 'Périphériques', 'Autre'];
    const [selectedCat, setSelectedCat] = useState('Tous');

    useEffect(() => {
        loadLibrary();
    }, []);

    const loadLibrary = async () => {
        try {
            setLoading(true);
            const data = await libraryService.getAll();
            setComponents(data || []);
            setFilteredComponents(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Logique de filtre
    const handleFilter = (category) => {
        setSelectedCat(category);
        if (category === 'Tous') {
            setFilteredComponents(components);
        } else {
            // On compare en minuscule pour être souple
            setFilteredComponents(components.filter(c => 
                c.category && c.category.toLowerCase().includes(category.toLowerCase())
            ));
        }
    };

    return (
        <div className="library-page">
            <header className="page-header">
                <div>
                    <h2>Bibliothèque</h2>
                    <p className="subtitle">Catalogue de pièces de référence</p>
                </div>
                <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                    <FaPlus /> <span className="desktop-only">Ajouter</span>
                </button>
            </header>

            {/* BARRE DE FILTRES */}
            <div className="filters-bar">
                <span className="filter-icon"><FaFilter /></span>
                <div className="chips-scroll">
                    {categories.map(cat => (
                        <button 
                            key={cat} 
                            className={`chip ${selectedCat === cat ? 'active' : ''}`}
                            onClick={() => handleFilter(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {showForm && (
                <div className="glass-panel form-panel">
                    <LibraryForm onSuccess={() => { setShowForm(false); loadLibrary(); }} onCancel={() => setShowForm(false)} />
                </div>
            )}

            {loading ? (
                <div className="loading-state">Chargement du catalogue...</div>
            ) : (
                <div className="library-grid">
                    {filteredComponents.length === 0 ? (
                        <div className="empty-state glass-panel">
                            <p>Aucune pièce dans cette catégorie.</p>
                        </div>
                    ) : (
                        filteredComponents.map(comp => (
                            <div key={comp.id} className="library-card glass-panel">
                                <div className="card-icon">
                                    <FaCogs />
                                </div>
                                <div className="card-content">
                                    <h4>{comp.brand} {comp.model}</h4>
                                    <span className="category-tag">{comp.category}</span>
                                    <div className="card-meta">
                                        <span>❤️ {comp.lifespan_km} km</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default LibraryPage;