import React, { useState, useEffect } from 'react';
import { FaPlus, FaCog, FaCircle, FaExchangeAlt, FaWrench, FaBook, FaTrash } from 'react-icons/fa'; 
import PartForm from './PartForm';
import LibrarySelector from '../Library/LibrarySelector'; 
import { bikeService } from '../../services/api';
import './PartsTab.css';

const iconMap = {
    'Chaîne': FaExchangeAlt,
    'chain': FaExchangeAlt,
    'Pneu': FaCircle, 
    'tire': FaCircle,
    'Cassette': FaCog,
    'cassette': FaCog,
    'Plaquettes': FaWrench,
    'Autre': FaWrench,
};

const getStatusColor = (percent) => {
    if (percent >= 100) return '#e74c3c'; 
    if (percent >= 75) return '#f39c12';  
    return '#2ecc71';                      
};

const PartItem = ({ part, currentBikeKm, onReplace, onDelete }) => {
    const IconComponent = iconMap[part.category] || FaWrench;

    const installDateRaw = part.installation_date || part.installationDate || new Date();
    const installDateDisplay = new Date(installDateRaw).toLocaleDateString();
    
    const safeCurrentKm = Number(currentBikeKm) || 0;
    const safeInstallKm = Number(part.km_current) || 0;
    const safeTargetKm = Number(part.life_target_km) || 2000;

    // --- AJOUTER CES LIGNES POUR LE DEBUG ---
    console.log(`🔍 DEBUG PIÈCE [${part.name}] :`);
    console.log(`- Km Actuel Vélo (Reçu) : ${safeCurrentKm}`);
    console.log(`- Km Installation Pièce : ${safeInstallKm}`);
    console.log(`- Différence (Usure)    : ${safeCurrentKm - safeInstallKm}`);
    // ---------------------------------------

    const distanceRidden = Math.max(0, safeCurrentKm - safeInstallKm);
    
    let wearPercentage = 0;
    if (safeTargetKm > 0) {
        wearPercentage = Math.min(100, Math.round((distanceRidden / safeTargetKm) * 100));
    }
    
    const progressColor = getStatusColor(wearPercentage);

    return (
        <div className="part-item">
            <div className="part-icon-container" style={{ color: progressColor, borderColor: progressColor }}>
                <IconComponent className="part-icon" />
            </div>
            <div className="part-info">
                <div className="part-name">{part.name}</div>
                <div className="part-category">
                    {part.category} • installé le {installDateDisplay}
                </div>
                
                <div className="wear-bar-container">
                    <div 
                        className="wear-bar" 
                        style={{ width: `${wearPercentage}%`, backgroundColor: progressColor }}
                    ></div>
                </div>
                
                <div className="wear-details">
                    Usure : {wearPercentage}% ({distanceRidden} / {safeTargetKm} km)
                </div>
            </div>
            
            <div className="part-actions">
                <button className="replace-btn" title="Remplacer" onClick={() => onReplace(part.id)}>
                    <FaExchangeAlt />
                </button>
                <button className="delete-btn" title="Supprimer" onClick={() => onDelete(part.id)}>
                    <FaTrash />
                </button>
            </div>
        </div>
    );
};

// --- COMPOSANT PRINCIPAL ---
const PartsTab = ({ bikeId, bikeTotalKm }) => { 
    const [parts, setParts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [selectedLibraryItem, setSelectedLibraryItem] = useState(null);

    useEffect(() => {
        const fetchParts = async () => {
            try {
                const fetchedParts = await bikeService.getComponentsByBike(bikeId);
                setParts(fetchedParts || []);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchParts();
    }, [bikeId]);

    const handleSavePart = async (id, data) => {
        const newPart = await bikeService.installComponent(id, data);
        setParts(prev => [...prev, newPart]); 
        setIsFormOpen(false);
        setSelectedLibraryItem(null);
    };

    const handleReplace = async (partId) => {
        if(window.confirm("Remplacer cette pièce (Ajout historique + Reset) ?")) {
            try {
                // Simulation refresh
                const fetchedParts = await bikeService.getComponentsByBike(bikeId);
                setParts(fetchedParts);
            } catch (e) {
                console.error(e);
                alert("Erreur lors du remplacement");
            }
        }
    };

    const handleDelete = async (partId) => {
        if(window.confirm("Supprimer définitivement ?")) {
            try {
                await bikeService.deleteComponent(partId); 
                setParts(prev => prev.filter(p => p.id !== partId));
            } catch (e) {
                alert("Erreur lors de la suppression");
            }
        }
    };

    const handleLibrarySelect = (item) => {
        setSelectedLibraryItem(item); 
        setIsLibraryOpen(false);      
        setIsFormOpen(true);          
    };

    if (isLibraryOpen) return <LibrarySelector onClose={() => setIsLibraryOpen(false)} onSelect={handleLibrarySelect} />;

    if (isFormOpen) {
        return (
            <PartForm 
                bikeId={bikeId} 
                onClose={() => { setIsFormOpen(false); setSelectedLibraryItem(null); }} 
                onSave={handleSavePart}
                initialData={selectedLibraryItem}
                currentBikeKm={Number(bikeTotalKm) || 0} // Sécurité ici aussi
            />
        );
    }

    if (isLoading) return <div style={{padding: '20px'}}>Chargement...</div>;
    
    return (
        <div className="parts-tab-container">
            <div className="tab-actions-row">
                <button className="cta-secondary" onClick={() => setIsFormOpen(true)}>
                    <FaPlus /> Manuel
                </button>
                <button className="cta-primary" onClick={() => setIsLibraryOpen(true)}>
                    <FaBook /> Depuis Bibliothèque
                </button>
            </div>

            {parts.length === 0 ? (
                <div className="empty-state-tab">
                    <FaCog size={60} color="#333" />
                    <p>Aucune pièce suivie sur ce vélo.</p>
                </div>
            ) : (
                <div className="parts-list">
                    {parts.map(part => (
                        <PartItem 
                            key={part.id} 
                            part={part} 
                            currentBikeKm={bikeTotalKm} 
                            onReplace={handleReplace} 
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PartsTab;