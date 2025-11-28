import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaBicycle, FaTshirt, FaAppleAlt, FaMobileAlt, FaRedo } from 'react-icons/fa';
import './KitsPage.css'; // On partage le CSS

const KitPlayer = ({ kit, onClose }) => {
    // On clone les items pour gérer l'état localement sans toucher à la BDD tout de suite
    const [items, setItems] = useState(kit.items || []);
    const [progress, setProgress] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        // Calcul progression
        const total = items.length;
        const checked = items.filter(i => i.checked).length;
        const pct = total === 0 ? 0 : Math.round((checked / total) * 100);
        setProgress(pct);
        setIsComplete(pct === 100);
    }, [items]);

    const toggleItem = (index) => {
        const newItems = [...items];
        newItems[index].checked = !newItems[index].checked;
        setItems(newItems);
    };

    const resetAll = () => {
        const newItems = items.map(i => ({ ...i, checked: false }));
        setItems(newItems);
    };

    // Icône par catégorie
    const getCatIcon = (cat) => {
        switch(cat) {
            case 'wear': return <FaTshirt />;
            case 'nutrition': return <FaAppleAlt />;
            case 'tech': return <FaMobileAlt />;
            default: return <FaBicycle />;
        }
    };

    return (
        <div className="modal-overlay">
            <div className="glass-panel player-modal">
                
                {/* HEADER AVEC PROGRESSION */}
                <div className="player-header">
                    <div className="player-title">
                        <span className="player-icon">{kit.icon}</span>
                        <h3>{kit.name}</h3>
                    </div>
                    <button onClick={onClose} className="close-btn"><FaTimes /></button>
                </div>

                <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    <span className="progress-text">{progress}% Prêt</span>
                </div>

                {/* LISTE À COCHER */}
                <div className="player-list">
                    {items.map((item, idx) => (
                        <div 
                            key={idx} 
                            className={`check-item glass-panel ${item.checked ? 'checked' : ''}`}
                            onClick={() => toggleItem(idx)}
                        >
                            <div className="check-icon-box">
                                {item.checked ? <FaCheck /> : getCatIcon(item.category)}
                            </div>
                            <span className="check-label">{item.label}</span>
                        </div>
                    ))}
                </div>

                {/* FOOTER / SUCCESS */}
                <div className="player-footer">
                    {isComplete ? (
                        <div className="success-msg">
                            🚀 Prêt au décollage !
                            <button onClick={onClose} className="primary-btn finish-btn">GO RIDE !</button>
                        </div>
                    ) : (
                        <button onClick={resetAll} className="secondary-btn">
                            <FaRedo /> Tout décocher
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};

export default KitPlayer;