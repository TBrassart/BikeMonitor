import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bikeService } from '../../services/api';
import { FaArrowLeft, FaCamera, FaPen, FaTrash, FaMountain, FaClock, FaRoad } from 'react-icons/fa';
import './BikeDetailShell.css';

// Import des onglets
import MaintenanceTab from './MaintenanceTab';
import PartsTab from './PartsTab';
import TirePressureTab from './TirePressureTab';
import HistoryTab from './HistoryTab';

function BikeDetailShell() {
    const { bikeId } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    
    const [bike, setBike] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('parts'); // On commence par les pièces par défaut

    useEffect(() => {
        loadBikeDetails();
    }, [bikeId]);

    const loadBikeDetails = async () => {
        try {
            setLoading(true);
            const data = await bikeService.getById(bikeId);
            setBike(data);
        } catch (e) {
            console.error("Erreur", e);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const url = await bikeService.uploadPhoto(file);
            await bikeService.update(bikeId, { photo_url: url });
            loadBikeDetails(); // Refresh
        } catch (error) {
            alert("Erreur upload photo");
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Supprimer définitivement ce vélo ?")) {
            await bikeService.delete(bikeId);
            navigate('/app/garage');
        }
    };

    if (loading) return <div className="loading-state">Chargement du cockpit...</div>;
    if (!bike) return <div className="error-state">Vélo introuvable</div>;

    return (
        <div className="bike-detail-shell">
            {/* HEADER AVEC PHOTO EN FOND */}
            <div className="bike-hero" style={{ backgroundImage: `url(${bike.photo_url || ''})` }}>
                <div className="hero-overlay"></div>
                
                <div className="hero-top-bar">
                    <button onClick={() => navigate('/app/garage')} className="icon-btn back-btn">
                        <FaArrowLeft />
                    </button>
                    <div className="hero-actions">
                        <button onClick={() => fileInputRef.current.click()} className="icon-btn action-glass">
                            <FaCamera />
                        </button>
                        <button onClick={() => navigate(`/app/edit-bike/${bikeId}`)} className="icon-btn action-glass">
                            <FaPen />
                        </button>
                        <button onClick={handleDelete} className="icon-btn action-glass delete">
                            <FaTrash />
                        </button>
                    </div>
                </div>

                <div className="hero-content">
                    <h1>{bike.name}</h1>
                    <span className="owner-badge-hero">
                        {bike.profiles ? `Pilote : ${bike.profiles.name}` : 'Mon vélo'}
                    </span>
                </div>

                <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{display:'none'}} 
                    onChange={handlePhotoUpload} 
                    accept="image/*"
                />
            </div>

            {/* STATS RAPIDES (Barre Néon) */}
            <div className="stats-bar glass-panel">
                <div className="stat-item">
                    <FaRoad className="stat-icon" />
                    <div>
                        <span className="stat-val">{Math.round(bike.total_km).toLocaleString()}</span>
                        <span className="stat-label">km</span>
                    </div>
                </div>
                <div className="stat-item">
                    <FaMountain className="stat-icon" />
                    <div>
                        <span className="stat-val">{Math.round(bike.total_elevation || 0).toLocaleString()}</span>
                        <span className="stat-label">m D+</span>
                    </div>
                </div>
                <div className="stat-item">
                    <FaClock className="stat-icon" />
                    <div>
                        <span className="stat-val">{Math.round(bike.total_hours || 0)}</span>
                        <span className="stat-label">h</span>
                    </div>
                </div>
            </div>

            {/* NAVIGATION ONGLETS */}
            <nav className="detail-tabs">
                {['parts', 'maintenance', 'tires', 'history'].map(tab => (
                    <button 
                        key={tab}
                        className={`tab-btn ${activeTab === tab ? 'active' : ''}`} 
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'parts' && 'Pièces'}
                        {tab === 'maintenance' && 'Entretien'}
                        {tab === 'tires' && 'Pneus'}
                        {tab === 'history' && 'Historique'}
                    </button>
                ))}
            </nav>

            <div className="tab-content">
                {activeTab === 'parts' && <PartsTab bikeId={bikeId} />}
                {activeTab === 'maintenance' && <MaintenanceTab bikeId={bikeId} bikeKm={bike.total_km} />}
                {activeTab === 'tires' && <TirePressureTab bikeId={bikeId} bikeWeight={bike.weight} />}
                {activeTab === 'history' && <HistoryTab bikeId={bikeId} />}
            </div>
        </div>
    );
}

export default BikeDetailShell;