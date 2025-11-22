import React, { useState, useEffect } from 'react';
import { FaPlus, FaListAlt, FaCheckSquare, FaTrash, FaArrowLeft } from 'react-icons/fa';
import { bikeService } from '../../services/api';
import KitForm from './KitForm';
import './KitsPage.css';

const KitsPage = () => {
    const [kits, setKits] = useState([]);
    const [view, setView] = useState('list'); // 'list', 'form', 'checklist'
    const [activeKit, setActiveKit] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConsuming, setIsConsuming] = useState(false);

    useEffect(() => {
        loadKits();
    }, []);

    const loadKits = async () => {
        setIsLoading(true);
        const data = await bikeService.getKits();
        setKits(data);
        setIsLoading(false);
    };

    const handleSaveKit = async (newKit) => {
        const saved = await bikeService.createKit(newKit);
        setKits(prev => [...prev, saved]);
        setView('list');
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if(window.confirm("Supprimer ce kit ?")) {
            await bikeService.deleteKit(id);
            setKits(prev => prev.filter(k => k.id !== id));
        }
    };

    const openChecklist = (kit) => {
        // Créer une copie locale pour l'état des cases à cocher
        setActiveKit(JSON.parse(JSON.stringify(kit))); 
        setView('checklist');
    };

    const toggleCheckItem = (index) => {
        if (!activeKit) return;
        const updatedItems = [...activeKit.items];
        updatedItems[index].checked = !updatedItems[index].checked;
        setActiveKit({ ...activeKit, items: updatedItems });
    };

    const handleReadyToGo = async () => {
        if (!activeKit) return;
        
        // On demande confirmation pour éviter les clics accidentels
        if (window.confirm("Bonne sortie ! 🚴\nDéduire la nutrition utilisée de ton stock ?")) {
            setIsConsuming(true);
            try {
                // On récupère les items cochés (ou tous, selon ta logique. Ici on prend tout le kit par défaut)
                // Si tu veux déduire SEULEMENT ce qui est coché : 
                // const itemsToConsume = activeKit.items.filter(i => i.checked);
                const itemsToConsume = activeKit.items; 

                await bikeService.consumeKitItems(itemsToConsume);
                alert("Stock mis à jour. Bon ride !");
            } catch (e) {
                console.error(e);
                alert("Erreur lors de la mise à jour du stock.");
            } finally {
                setIsConsuming(false);
                setView('list'); // Retour à la liste
                setActiveKit(null);
            }
        } else {
            // Si l'utilisateur annule la déduction, on ferme juste
            setView('list');
            setActiveKit(null);
        }
    };

    // --- VUE FORMULAIRE ---
    if (view === 'form') {
        return <KitForm onClose={() => setView('list')} onSave={handleSaveKit} />;
    }

    // --- VUE CHECKLIST (AVANT SORTIE) ---
    if (view === 'checklist' && activeKit) {
        const progress = Math.round((activeKit.items.filter(i => i.checked).length / activeKit.items.length) * 100);
        
        return (
            <div className="kits-container checklist-mode">
                <header className="checklist-header">
                    <button onClick={() => setView('list')} className="back-btn"><FaArrowLeft /></button>
                    <h2>{activeKit.name}</h2>
                </header>
                
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="progress-text">{progress}% Prêt</p>

                <div className="checklist-items">
                    {activeKit.items.map((item, index) => (
                        <div 
                            key={index} 
                            className={`checklist-item ${item.checked ? 'checked' : ''}`}
                            onClick={() => toggleCheckItem(index)}
                        >
                            <div className="check-box">
                                {item.checked && <FaCheckSquare />}
                            </div>
                            <div className="item-name">
                                {item.name} {item.quantity > 1 && `(x${item.quantity})`}
                            </div>
                        </div>
                    ))}
                </div>
                
                {progress === 100 && (
                    <button 
                        className="cta-ready" 
                        onClick={handleReadyToGo} // <--- NOUVELLE FONCTION
                        disabled={isConsuming}
                    >
                        {isConsuming ? 'Mise à jour stock...' : '🚀 Je suis prêt !'}
                    </button>
                )}
            </div>
        );
    }

    // --- VUE LISTE DES KITS ---
    return (
        <div className="kits-container">
            <header className="page-header">
                <h1>Mes Kits de Sortie</h1>
                <button className="cta-add-standard" onClick={() => setView('form')}>
                    <FaPlus /> Créer un kit
                </button>
            </header>

            <div className="kits-grid">
                {kits.map(kit => (
                    <div key={kit.id} className="kit-card" onClick={() => openChecklist(kit)}>
                        <div className="kit-icon"><FaListAlt /></div>
                        <div className="kit-info">
                            <h3>{kit.name}</h3>
                            <p>{kit.items.length} objets</p>
                        </div>
                        <button className="delete-btn" onClick={(e) => handleDelete(e, kit.id)}>
                            <FaTrash />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KitsPage;