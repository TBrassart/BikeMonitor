import React, { useState, useEffect } from 'react';
import { libraryService, authService } from '../../services/api';
import { FaSearch, FaPlus, FaCogs, FaCompactDisc, FaCircle, FaWrench, FaEdit, FaTrash, FaDatabase } from 'react-icons/fa';
import LibraryForm from './LibraryForm';
import './LibraryPage.css';

// Mapping Catégories (Pour Icones et Labels)
const CATEGORIES_UI = [
        { id: 'all', label: 'Tout', icon: null },
        { id: 'transmission', label: 'Transmission', icon: <FaCogs /> },
        { id: 'freinage', label: 'Freinage', icon: <FaCompactDisc /> },
        { id: 'pneus', label: 'Pneus', icon: <FaCircle /> },
        { id: 'roues', label: 'Roues', icon: <FaCircle style={{opacity:0.7}} /> }, // Icône visuelle
        { id: 'pedales', label: 'Pédales', icon: <FaWrench /> },
        { id: 'chambres', label: 'Chambres à air', icon: <FaCogs />},
        { id: 'autre', label: 'Autre', icon: null },
    ];

const DISPLAY_MAP = {
        'battery': 'Batterie',
        'chainrings': 'Pédalier',
        'stem': 'Potence',
        'brake-pads': 'Plaquettes de frein',
        'pedals': 'Pédales',
        'chainguide': 'Guide Chaîne',
        'wheel': 'Roue',
        'chain': 'Chaîne',
        'brake-rotor': 'Disque de frein',
        'inner-tube': 'Chambre à air',
        'cranks': 'Manivelle',
        'seat-post': 'Tige de selle',
        'tyre': 'Pneu',
        'bottom-bracket': 'Boitier de pédalier',
        'shock': 'Amortisseur',
        'sprocket': 'Pignons',
        'hub': 'Moyeu',
        'handlebar': 'Guidon',
        'brake': 'Freins',
        'fork': 'Fourche',
        'other': 'Autres',
        'sealant': 'Sealant',
        'cassette': 'Cassette'
    };

const FILTER_MAP = {
        'all': [],
        'transmission': ['chain', 'cassette', 'chainrings', 'derailleur', 'bottom_bracket', 'sprocket', 'bottom', 'cranks', 'chainguide'],
        'freinage': ['brake-pads', 'brake-rotor', 'brake'],
        'pneus': ['tyre'],
        'roues': ['wheel', 'hub'],
        'chambre à air': ['inner-tube'],
        'pedales': ['pedals'],
        'autre': ['sealant', 'other', 'fork', 'handlebar', 'shock', 'seat-post', 'stem' ]
    };

function LibraryPage() {
    const [query, setQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Gestion Edition
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [canEdit, setCanEdit] = useState(false);

    useEffect(() => {
        checkPermissions();
        // Chargement initial (optionnel, ou on attend une recherche)
        // Ici on lance une recherche vide pour avoir les derniers ajouts ou tout
        performSearch();
    }, []);

    // Relancer la recherche quand les filtres changent
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch();
        }, 400); // Debounce 400ms
        return () => clearTimeout(timer);
    }, [query, selectedCategory]);

    const checkPermissions = async () => {
        const profile = await authService.getMyProfile();
        // Admin ou simple user (si on veut laisser tout le monde contribuer)
        if (profile) setCanEdit(true); 
    };

    const performSearch = async () => {
        setLoading(true);
        try {
            // Si pas de query et catégorie 'all', on charge un échantillon (ex: les 50 premiers)
            // Sinon on utilise la recherche filtrée
            const catsToSearch = FILTER_MAP[selectedCategory];
            const data = await libraryService.search(query, catsToSearch);
            setResults(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer cette référence de la bibliothèque globale ?")) return;
        // Supposons que libraryService a une méthode delete (à ajouter si besoin)
        // await libraryService.delete(id);
        alert("Fonctionnalité admin (à implémenter dans l'API)");
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setShowForm(true);
    };

    const handleAddNew = () => {
        setEditingItem(null);
        setShowForm(true);
    };

    return (
        <div className="library-page">
            
            {/* EN-TÊTE */}
            <div className="library-header">
                <h2 className="gradient-text"><FaDatabase /> Bibliothèque</h2>
                {canEdit && (
                    <button className="primary-btn" onClick={handleAddNew}>
                        <FaPlus /> Ajouter une référence
                    </button>
                )}
            </div>

            {/* BARRE DE RECHERCHE & FILTRES */}
            <div className="search-filter-container">
                <div className="search-bar-wrapper">
                    <FaSearch style={{position:'absolute', left:'15px', top:'50%', transform:'translateY(-50%)', color:'#888'}} />
                    <input 
                        type="text" 
                        className="search-input-lg"
                        placeholder="Rechercher un composant (ex: Ultegra R8000...)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className="filters-scroll">
                    {CATEGORIES_UI.map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`filter-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                        >
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* GRILLE RÉSULTATS */}
            {loading ? (
                <div className="loading-text">Recherche dans le catalogue...</div>
            ) : (
                <div className="library-grid">
                    {results.length === 0 ? (
                        <div className="empty-state" style={{gridColumn:'1/-1', textAlign:'center', padding:'40px', color:'#666'}}>
                            Aucun composant trouvé. <br/>
                            <button className="text-btn" onClick={handleAddNew} style={{color:'var(--neon-blue)', marginTop:'10px'}}>
                                Créer cette pièce ?
                            </button>
                        </div>
                    ) : (
                        results.map(item => (
                            <div key={item.id} className="library-card">
                                <div className="card-header">
                                    <div className="card-icon">
                                        {/* Icône dynamique selon catégorie */}
                                        {CATEGORIES_UI.find(c => c.id === item.category)?.icon || <FaCogs />}
                                    </div>
                                    {canEdit && (
                                        <div className="card-actions">
                                            <button onClick={() => handleEdit(item)} className="mini-action-btn edit"><FaEdit /></button>
                                            <button onClick={() => handleDelete(item.id)} className="mini-action-btn delete"><FaTrash /></button>
                                        </div>
                                    )}
                                </div>

                                <span className="card-brand">{item.brand}</span>
                                <h4 className="card-model">{item.name}</h4>
                                <span className="card-cat">
                                    {DISPLAY_MAP[item.category] || item.category}
                                </span>
                                
                                <div className="card-stats">
                                    Durée cible : {item.lifespan_km ? `${item.lifespan_km} km` : 'N/A'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* MODALE FORMULAIRE */}
            {showForm && (
                <div className="modal-overlay" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:5000, display:'flex', justifyContent:'center', alignItems:'center'}}>
                    <div className="glass-panel" style={{maxWidth:'500px', width:'100%', padding:'0'}}>
                        <LibraryForm 
                            initialData={editingItem}
                            onClose={() => setShowForm(false)}
                            onSave={() => {
                                setShowForm(false);
                                performSearch(); // Rafraîchir
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default LibraryPage;