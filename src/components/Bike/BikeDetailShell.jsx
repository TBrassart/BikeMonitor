import React, { useState, useEffect, useRef } from 'react';
// 1. Import de FaEdit
import { FaArrowLeft, FaPen, FaCamera, FaSave, FaMountain, FaStopwatch, FaRoad, FaTrash, FaEdit } from 'react-icons/fa';
import MaintenanceTab from './MaintenanceTab';
import PartsTab from './PartsTab';
import TirePressureTab from './TirePressureTab';
import HistoryTab from './HistoryTab';
// 2. Import du Formulaire
import BikeForm from './BikeForm';
import { bikeService } from '../../services/api';
import './BikeDetailShell.css';

const formatNumber = (num) => new Intl.NumberFormat('fr-FR').format(Math.round(num || 0));

const BikeDetailShell = ({ bike: initialBike, onBackToGarage, onAddMaintenance }) => { 
    const [bike, setBike] = useState(initialBike);
    const [activeTab, setActiveTab] = useState('maintenance');
    
    // État pour le formulaire d'édition complet
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const refreshStats = async () => {
            const stats = await bikeService.refreshBikeStats(bike.id);
            if (stats) setBike(prev => ({ ...prev, ...stats }));
        };
        refreshStats();
    }, [bike.id]);

    // Gestion Upload Rapide (Bouton Camera)
    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const publicUrl = await bikeService.uploadBikePhoto(bike.id, file);
            const updatedBike = await bikeService.updateBike(bike.id, { photo_url: publicUrl });
            setBike(updatedBike);
        } catch (error) {
            console.error(error);
            alert("Erreur upload");
        } finally {
            setIsUploading(false);
        }
    };

    // Gestion Suppression
    const handleDelete = async () => {
        if (window.confirm(`Supprimer définitivement "${bike.name}" ?`)) {
            try {
                await bikeService.deleteBike(bike.id);
                onBackToGarage(); 
            } catch (e) { alert("Erreur suppression"); }
        }
    };

    // 3. NOUVELLE FONCTION : Sauvegarde depuis le formulaire complet
    const handleUpdateBike = async (updatedData) => {
        // Appel API update
        const saved = await bikeService.updateBike(bike.id, updatedData);
        setBike(saved); // Mise à jour locale
        return saved; // Important pour le formulaire (pour l'upload image éventuel)
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'maintenance': return <MaintenanceTab bikeId={bike.id} onAddMaintenance={onAddMaintenance} />;            
            case 'parts': return <PartsTab bikeId={bike.id} bikeTotalKm={bike.total_km} />;
            case 'tires': return <TirePressureTab bikeId={bike.id} />;
            case 'history': return <HistoryTab bikeId={bike.id} />;
            default: return <div className="tab-content">À venir</div>;
        }
    };

    const headerStyle = {
        backgroundImage: bike.photo_url 
            ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url(${bike.photo_url})`
            : 'linear-gradient(135deg, #1e1e2d 0%, #2a2a3e 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    };

    // 4. Affichage du Formulaire Modal si ouvert
    if (isEditFormOpen) {
        return (
            <BikeForm 
                initialData={bike} // On passe les données actuelles
                onClose={() => setIsEditFormOpen(false)} 
                onSave={handleUpdateBike} // La fonction de sauvegarde
            />
        );
    }

    return (
        <div className="bike-detail-shell">
            <input type="file" ref={fileInputRef} style={{display: 'none'}} accept="image/*" onChange={handlePhotoUpload} />

            <header className="detail-header-rich" style={headerStyle}>
                <div className="header-top-row">
                    <button onClick={onBackToGarage} className="back-btn-glass" title="Retour">
                        <FaArrowLeft />
                    </button>
                    
                    <div style={{display: 'flex', gap: '10px'}}>
                        {/* BOUTON PHOTO RAPIDE */}
                        <button className="edit-photo-btn" onClick={() => fileInputRef.current.click()} disabled={isUploading} title="Changer photo">
                            {isUploading ? '...' : <FaCamera />}
                        </button>

                        {/* 5. BOUTON ÉDITER (CRAYON) */}
                        <button 
                            className="edit-photo-btn" 
                            onClick={() => setIsEditFormOpen(true)}
                            title="Modifier les détails (Année, Poids...)"
                        >
                            <FaEdit />
                        </button>

                        {/* BOUTON SUPPRIMER */}
                        <button className="edit-photo-btn" onClick={handleDelete} title="Supprimer" style={{borderColor: '#e74c3c', color: '#e74c3c'}}>
                            <FaTrash style={{color: '#e74c3c'}} />
                        </button>
                    </div>
                </div>

                <div className="header-main-info">
                    <div className="title-row">
                        <h1>{bike.name}</h1>
                    </div>
                    
                    {/* SOUS-TITRE TECHNIQUE (Mise à jour automatique) */}
                    <p className="specs-subtitle">
                        {bike.brand} {bike.model_year} 
                        {bike.size && ` • ${bike.size}`}
                        {bike.weight && ` • ${bike.weight} kg`}
                    </p>
                    
                    <p className="owner-status">{bike.owner} • {bike.type}</p>

                    <div className="stats-grid">
                        <div className="stat-item">
                            <FaRoad className="stat-icon" />
                            <span className="stat-value">{formatNumber(bike.total_km)} <small>km</small></span>
                        </div>
                        <div className="stat-item">
                            <FaMountain className="stat-icon" />
                            <span className="stat-value">{formatNumber(bike.total_elevation)} <small>m</small></span>
                        </div>
                        <div className="stat-item">
                            <FaStopwatch className="stat-icon" />
                            <span className="stat-value">{formatNumber(bike.total_hours)} <small>h</small></span>
                        </div>
                    </div>
                </div>
            </header>

            <nav className="detail-tabs">
                {/* ... (Onglets inchangés) ... */}
                <button className={`tab-item ${activeTab === 'maintenance' ? 'active' : ''}`} onClick={() => setActiveTab('maintenance')}>Entretien</button>
                <button className={`tab-item ${activeTab === 'parts' ? 'active' : ''}`} onClick={() => setActiveTab('parts')}>Pièces</button>
                <button className={`tab-item ${activeTab === 'tires' ? 'active' : ''}`} onClick={() => setActiveTab('tires')}>Pneus</button>
                <button className={`tab-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Historique</button>
            </nav>

            <main className="detail-content">
                {renderContent()}
            </main>
        </div>
    );
};

export default BikeDetailShell;