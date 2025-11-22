import React, { useState, useEffect } from 'react';
import { FaSearch, FaTimes, FaCogs } from 'react-icons/fa';
import { bikeService } from '../../services/api';
import './LibrarySelector.css';

const LibrarySelector = ({ onClose, onSelect }) => {
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await bikeService.getLibrary();
                setItems(data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const filteredItems = items.filter(i => 
        i.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="library-selector-overlay">
            <div className="library-selector-modal">
                <header className="selector-header">
                    <h3>Choisir dans la bibliothèque</h3>
                    <button onClick={onClose} className="close-btn"><FaTimes /></button>
                </header>

                <div className="search-bar-container">
                    <FaSearch className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Rechercher (ex: Pneu...)" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="search-input"
                        autoFocus
                    />
                </div>

                <div className="selector-list">
                    {isLoading ? <p>Chargement...</p> : filteredItems.map(item => (
                        <div key={item.id} className="selector-item" onClick={() => onSelect(item)}>
                            <div className="item-icon"><FaCogs /></div>
                            <div className="item-info">
                                <h4>{item.brand} {item.model}</h4>
                                <span className="item-cat">{item.category}</span>
                                <span className="item-life">Durée : {item.lifespan_km} km</span>
                            </div>
                        </div>
                    ))}
                    
                    {filteredItems.length === 0 && !isLoading && (
                        <p className="no-results">Aucun modèle trouvé. Ajoutez-le d'abord dans la Bibliothèque.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LibrarySelector;