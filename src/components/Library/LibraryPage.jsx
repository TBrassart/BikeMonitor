import React, { useState, useEffect } from 'react';
import { authService, libraryService } from '../../services/api';
import { FaPlus, FaCogs, FaFilter } from 'react-icons/fa';
import LibraryForm from './LibraryForm';
import './LibraryPage.css';

function LibraryPage() {
    const [components, setComponents] = useState([]);
    const [filteredComponents, setFilteredComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // On initialise juste avec 'Tous', le reste sera dynamique
    const [categories, setCategories] = useState(['Tous']);
    const [selectedCat, setSelectedCat] = useState('Tous');
    const [canEdit, setCanEdit] = useState(false); // Nouvel état

    useEffect(() => {
        loadLibrary();
    }, []);

    const checkPermissions = async () => {
        const profile = await authService.getMyProfile();
        // Seuls Admin et Moderator peuvent éditer
        if (profile && (profile.app_role === 'admin' || profile.app_role === 'moderator')) {
            setCanEdit(true);
        }
    };

    const loadLibrary = async () => {
        try {
            setLoading(true);
            const data = await libraryService.getAll();
            setComponents(data || []);
            setFilteredComponents(data || []);

            // --- GÉNÉRATION DYNAMIQUE DES CATÉGORIES ---
            // On regarde ce qu'il y a vraiment dans la base
            const uniqueCats = [...new Set(data.map(item => item.category).filter(Boolean))];
            // On trie alphabétiquement
            uniqueCats.sort();
            setCategories(['Tous', ...uniqueCats]);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = (category) => {
        setSelectedCat(category);
        if (category === 'Tous') {
            setFilteredComponents(components);
        } else {
            // Comparaison stricte maintenant possible car la catégorie vient de la base
            setFilteredComponents(components.filter(c => c.category === category));
        }
    };

    return (
        <div className="library-page">
            <header className="page-header">
                <div>
                    <h2>Bibliothèque</h2>
                    <p className="subtitle">Catalogue de pièces de référence</p>
                </div>

                {canEdit && (
                    <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                        <FaPlus /> <span className="desktop-only">Ajouter</span>
                    </button>
                )}
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