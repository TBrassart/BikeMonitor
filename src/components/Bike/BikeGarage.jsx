import React, { useState, useEffect } from 'react';
import { bikeService, authService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaPlus } from 'react-icons/fa';
import './BikeGarage.css';

function BikeGarage() {
    const [bikes, setBikes] = useState([]);
    const [filteredBikes, setFilteredBikes] = useState([]);
    const [owners, setOwners] = useState([]);
    const [selectedOwner, setSelectedOwner] = useState('Tous');
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const user = await authService.getCurrentUser();
            setCurrentUser(user);

            const data = await bikeService.getAll();
            setBikes(data);
            setFilteredBikes(data);

            // Extraire les propriétaires uniques pour les filtres
            const uniqueOwners = ['Tous', ...new Set(data.map(b => b.profiles?.name || 'Inconnu'))];
            setOwners(uniqueOwners);

        } catch (e) {
            console.error("Erreur garage:", e);
        } finally {
            setLoading(false);
        }
    };

    // Gestion du filtre
    const handleFilter = (owner) => {
        setSelectedOwner(owner);
        if (owner === 'Tous') {
            setFilteredBikes(bikes);
        } else {
            setFilteredBikes(bikes.filter(b => (b.profiles?.name || 'Inconnu') === owner));
        }
    };

    // Vérifie si le vélo a des problèmes (basé sur le join 'parts' ajouté dans api.js)
    const hasAlerts = (bike) => {
        if (!bike.parts) return false;
        return bike.parts.some(p => p.status === 'critical' || p.status === 'warning');
    };

    if (loading) return <div className="loading-state">Chargement du garage...</div>;

    return (
        <div className="bike-garage">
            <header className="garage-header">
                <h2>Garage</h2>
                <button className="add-btn" onClick={() => navigate('/app/add-bike')}>
                    <FaPlus />
                </button>
            </header>

            {/* FILTRES (CHIPS) */}
            {owners.length > 1 && (
                <div className="filters-scroll">
                    {owners.map(owner => (
                        <button 
                            key={owner} 
                            className={`filter-chip ${selectedOwner === owner ? 'active' : ''}`}
                            onClick={() => handleFilter(owner)}
                        >
                            {owner}
                        </button>
                    ))}
                </div>
            )}

            <div className="bikes-grid">
                {filteredBikes.map(bike => {
                    const isMine = bike.user_id === currentUser?.id;
                    const alert = hasAlerts(bike);

                    return (
                        <div 
                            key={bike.id} 
                            className={`bike-card ${!isMine ? 'friend-bike' : ''}`}
                            onClick={() => navigate(`/app/bike/${bike.id}`)}
                        >
                            <div className="bike-image-placeholder">
                                {bike.photo_url ? (
                                    <img src={bike.photo_url} alt={bike.name} />
                                ) : (
                                    <span style={{fontSize: '3rem'}}>🚲</span>
                                )}
                                
                                {/* Badge Alertes */}
                                {alert && (
                                    <div className="alert-badge" title="Pièces à vérifier !">
                                        <FaExclamationTriangle />
                                    </div>
                                )}
                            </div>

                            <div className="bike-info">
                                <div style={{display:'flex', justifyContent:'space-between'}}>
                                    <h3>{bike.name}</h3>
                                    <span className="bike-km">{bike.total_km} km</span>
                                </div>
                                
                                {/* Propriétaire */}
                                <div className="owner-info">
                                    <span className="owner-name">
                                        {isMine ? 'Moi' : bike.profiles?.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default BikeGarage;