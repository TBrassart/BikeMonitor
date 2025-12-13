import React, { useState, useEffect } from 'react';
import { libraryService, partsService, bikeService } from '../../services/api';
import PartForm from './PartForm';
import { FaSearch, FaTimes, FaDatabase, FaPen, FaCompactDisc, FaCogs, FaArrowRight, FaCircle, FaWrench } from 'react-icons/fa';

const AddPartModal = ({ bikeId, onClose, onSuccess }) => {
    const [activeTab, setActiveTab] = useState('library');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [librarySelection, setLibrarySelection] = useState(null);

    // État pour le filtre
    const [selectedCategory, setSelectedCategory] = useState('all');

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

    // Mapping pour le FILTRE (Français IHM -> Anglais BDD)
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

    // Mapping pour l'AFFICHAGE des résultats
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

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (activeTab === 'library') {
                if (query.length >= 2 || selectedCategory !== 'all') {
                    setLoading(true);
                    try {
                        const catsToSearch = FILTER_MAP[selectedCategory];
                        // Si le filtre est "all", catsToSearch est vide, donc la recherche est globale
                        const data = await libraryService.search(query, catsToSearch);
                        setResults(data);
                    } catch (e) { console.error(e); } 
                    finally { setLoading(false); }
                } else {
                    setResults([]);
                }
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [query, selectedCategory, activeTab]);

    const handleSelectFromLibrary = (item) => {
        // Nettoyage de la catégorie reçue (minuscule, tirets...)
        const rawCat = (item.category || '').toLowerCase().replace('-', '_');
        
        // On cherche la correspondance, sinon par défaut "Autre" (plus sûr que Transmission pour éviter les erreurs)
        const mappedCategory = DISPLAY_MAP[rawCat] || 'Autre';

        const cleanData = {
            name: item.name,
            category: mappedCategory, 
            lifespan_km: item.lifespan_km
        };
        
        setLibrarySelection(cleanData);
        setActiveTab('manual');
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000,
            display: 'flex', justifyContent: 'center', paddingTop: '60px', backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{ 
                width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                border: '1px solid var(--border-color)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', padding: 0, overflow: 'hidden'
            }}>
                
                {/* EN-TÊTE + ONGLETS */}
                <div style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="gradient-text" style={{margin:0}}>Ajouter un composant</h3>
                        <button onClick={onClose} style={{background:'none', border:'none', color:'white', fontSize:'1.2rem', cursor:'pointer'}}><FaTimes /></button>
                    </div>

                    <div style={{ display: 'flex', padding: '0 15px' }}>
                        <button onClick={() => setActiveTab('library')} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeTab === 'library' ? '2px solid var(--neon-blue)' : '2px solid transparent', color: activeTab === 'library' ? 'white' : '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <FaDatabase /> Bibliothèque
                        </button>
                        <button onClick={() => setActiveTab('manual')} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeTab === 'manual' ? '2px solid var(--neon-blue)' : '2px solid transparent', color: activeTab === 'manual' ? 'white' : '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <FaPen /> Manuel
                        </button>
                    </div>
                </div>

                {/* CONTENU BIBLIOTHÈQUE */}
                {activeTab === 'library' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        
                        <div style={{ padding: '15px 15px 5px 15px', display:'flex', flexDirection:'column', gap:'10px' }}>
                            
                            {/* 1. BARRE DE RECHERCHE */}
                            <div style={{ position: 'relative', width:'100%' }}>
                                <FaSearch style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input 
                                    type="text" placeholder="Rechercher (ex: Ultegra...)" 
                                    value={query} onChange={(e) => setQuery(e.target.value)}
                                    style={{ 
                                        width: '100%', padding: '12px 12px 12px 45px', 
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                                        borderRadius: '8px', color: 'white', fontSize: '1rem', outline: 'none'
                                    }}
                                />
                            </div>

                            {/* 2. NOUVELLE LISTE DE CHIPS (FILTRES) */}
                            <div className="category-chips-scroll">
                                {CATEGORIES_UI.map(cat => (
                                    <button 
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`cat-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                                    >
                                        {cat.icon} {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* RÉSULTATS */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 15px 15px' }}>
                            {loading && <div style={{textAlign:'center', color:'#888', marginTop:'20px'}}>Recherche...</div>}
                            
                            {!loading && results.map(item => (
                                <div key={item.id} onClick={() => handleSelectFromLibrary(item)}
                                    style={{ 
                                        padding: '12px', marginBottom: '8px', background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer', 
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <div style={{fontWeight:'bold', color:'white'}}>{item.name}</div>
                                        <div style={{fontSize:'0.8rem', color:'#aaa'}}>
                                            {item.brand} • {DISPLAY_MAP[item.category] || item.category}
                                        </div>
                                    </div>
                                    <div style={{textAlign:'right'}}>
                                        <span style={{fontSize:'0.75rem', color:'#4ade80', background:'rgba(74, 222, 128, 0.1)', padding:'2px 6px', borderRadius:'4px'}}>
                                            ~{item.lifespan_km || '?'} km
                                        </span>
                                        <FaArrowRight style={{marginLeft:'10px', color:'var(--neon-blue)', fontSize:'0.8rem'}}/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'manual' && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                        <PartForm 
                            bikeId={bikeId} 
                            onSuccess={onSuccess} 
                            onCancel={onClose}
                            initialData={librarySelection} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddPartModal;