import React, { useState, useEffect } from 'react';
import { bikeService, authService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaPlus, FaUsers } from 'react-icons/fa';
import './BikeGarage.css';

function BikeGarage() {
    const [bikes, setBikes] = useState([]);
    const [filteredBikes, setFilteredBikes] = useState([]);
    
    // Filtres
    const [owners, setOwners] = useState([]); // Liste des propriétaires (membres de tes Turlags)
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

            const data = await bikeService.getAll(); // Récupère mes vélos + ceux des turlags
            setBikes(data);
            setFilteredBikes(data);

            // On extrait la liste unique des propriétaires pour faire les filtres
            // C'est plus simple que de gérer les Turlags complexes : 
            // "Qui sont les gens dont je vois les vélos ?"
            const uniqueOwners = ['Tous', 'Moi', ...new Set(
                data
                .filter(b => b.user_id !== user.id) // Exclure moi de la liste générique
                .map(b => b.profiles?.name || 'Inconnu')
            )];
            setOwners(uniqueOwners);

        } catch (e) {
            console.error("Erreur garage:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = (filter) => {
        setSelectedOwner(filter);
        
        if (filter === 'Tous') {
            setFilteredBikes(bikes);
        } else if (filter === 'Moi') {
            setFilteredBikes(bikes.filter(b => b.user_id === currentUser.id));
        } else {
            setFilteredBikes(bikes.filter(b => (b.profiles?.name || 'Inconnu') === filter));
        }
    };

    const hasAlerts = (bike) => {
        if (!bike.parts) return false;
        // Vérifie s'il y a des pièces en statut critical/warning
        return bike.parts.some(p => p.status === 'critical' || p.status === 'warning');
    };

    if (loading) return <div className="loading-state">Chargement du garage...</div>;

    return (
        <div className="bike-garage">
            <header className="garage-header">
                <div>
                    <h2>Garage</h2>
                    <p style={{color:'#94a3b8', margin:0}}>Gère ton écurie et celle de ton Turlag</p>
                </div>
                <button className="add-btn primary-btn" onClick={() => navigate('/app/add-bike')} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <FaPlus />
                </button>
            </header>

            {/* FILTRES (CHIPS) */}
            <div className="filters-section">
                <span className="filters-label">Filtrer par cycliste</span>
                <div className="filters-scroll">
                    {owners.map(owner => (
                        <button 
                            key={owner} 
                            className={`chip ${selectedOwner === owner ? 'active' : ''}`}
                            onClick={() => handleFilter(owner)}
                        >
                            {owner === 'Tous' && <FaUsers style={{marginRight:5}} />}
                            {owner}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bikes-grid">
                {filteredBikes.length === 0 && (
                    <div className="empty-state glass-panel" style={{gridColumn: '1/-1'}}>
                        <p>Aucun vélo trouvé pour ce filtre.</p>
                    </div>
                )}

                {filteredBikes.map(bike => {
                    const isMine = bike.user_id === currentUser?.id;
                    const alert = hasAlerts(bike);
                    const ownerName = isMine ? 'Moi' : (bike.profiles?.name || 'Inconnu');

                    return (
                        <div 
                            key={bike.id} 
                            className={`bike-card glass-panel ${!isMine ? 'friend-bike' : ''}`}
                            onClick={() => isMine && navigate(`/app/bike/${bike.id}`)}
                            style={{ 
                                cursor: isMine ? 'pointer' : 'default',
                                opacity: isMine ? 1 : 0.85
                            }}
                        >
                            <div className="bike-image-placeholder">
                                {bike.photo_url ? (
                                    <img src={bike.photo_url} alt={bike.name} loading="lazy" />
                                ) : (
                                    <span style={{fontSize: '4rem', opacity:0.5}}>🚲</span>
                                )}
                                
                                {alert && (
                                    <div className="alert-badge" title="Maintenance requise !">
                                        <FaExclamationTriangle />
                                    </div>
                                )}
                            </div>

                            <div className="bike-info">
                                <div className="bike-header-row">
                                    <h3>{bike.name}</h3>
                                    <span className="bike-km">{bike.total_km.toLocaleString()} km</span>
                                </div>
                                
                                <div className="owner-row">
                                    <div className="owner-avatar">
                                        {ownerName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="owner-name">
                                        {isMine ? 'Mon vélo' : `Vélo de ${ownerName}`}
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