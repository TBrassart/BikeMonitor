import React, { useState, useMemo } from 'react';
import { FaBicycle, FaPlus, FaStrava, FaRoad, FaMountain, FaFilter } from 'react-icons/fa'; 
import './BikeGarage.css';

const BikeCard = ({ bike, onOpenDetail }) => {
    const cardStyle = bike.photo_url ? {
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.9)), url(${bike.photo_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    } : {};

    const cardClass = `bike-card ${bike.photo_url ? 'has-photo' : ''}`;

    return (
        <div className={cardClass} style={cardStyle} onClick={() => onOpenDetail(bike)}> 
            <div className="card-header">
                <h3>{bike.name}</h3>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    {bike.strava_gear_id && <span className="badge-strava" title="Sync Strava"><FaStrava /></span>}
                    {bike.alerts > 0 && <span className="badge-alert">⚠ {bike.alerts}</span>}
                </div>
            </div>

            <div className="card-body">
                <div className="bike-stats-row">
                    <span><FaRoad /> {Math.round(bike.total_km || 0)} km</span>
                    {bike.total_elevation > 0 && <span><FaMountain /> {Math.round(bike.total_elevation)} m</span>}
                </div>
                <div className="bike-meta-row">
                    <span className="owner-tag">{bike.owner === "Profil importé" ? "Moi" : bike.owner.split(' ')[0]}</span>
                    <span className="type-info">{bike.type}</span>
                </div>
                {bike.status !== 'OK' && <p className="status-summary">{bike.status}</p>}
            </div>
        </div>
    );
};

const BikeGarage = ({ bikes, onOpenForm, onOpenDetail }) => {
    const [filterOwner, setFilterOwner] = useState('Tous');

    // 1. Extraire la liste unique des propriétaires
    const owners = useMemo(() => {
        const allOwners = bikes.map(b => b.owner === "Profil importé" ? "Moi" : b.owner);
        return ['Tous', ...new Set(allOwners)];
    }, [bikes]);

    // 2. Filtrer les vélos
    const filteredBikes = bikes.filter(bike => {
        if (filterOwner === 'Tous') return true;
        const currentOwner = bike.owner === "Profil importé" ? "Moi" : bike.owner;
        return currentOwner === filterOwner;
    });

    if (bikes.length === 0) {
        return (
            <div className="garage-container empty-state">
                <FaBicycle size={60} color="#ccc" />
                <h1>Bienvenue dans ton garage</h1>
                <p className="empty-message">Ajoute ton premier vélo.</p>
                <button className="cta-add" onClick={onOpenForm}><FaPlus /> Ajouter</button>
            </div>
        );
    }

    return (
        <div className="garage-container">
            <header className="garage-header">
                <h1>Mon Garage ({filteredBikes.length})</h1>
                
                {/* 3. BARRE DE FILTRES */}
                {owners.length > 1 && (
                    <div className="garage-filters">
                        {owners.map(owner => (
                            <button 
                                key={owner}
                                className={`filter-chip ${filterOwner === owner ? 'active' : ''}`}
                                onClick={() => setFilterOwner(owner)}
                            >
                                {owner}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            <div className="bike-list">
                {filteredBikes.map(bike => (
                    <BikeCard key={bike.id} bike={bike} onOpenDetail={onOpenDetail} />
                ))}
            </div>
            
            <button className="cta-float" onClick={onOpenForm}><FaPlus /></button>
        </div>
    );
};

export default BikeGarage;