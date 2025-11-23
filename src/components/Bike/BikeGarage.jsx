import React, { useState, useEffect } from 'react';
import { api, authService } from '../../services/api'; // On ajoute authService
import { useNavigate } from 'react-router-dom';
import './BikeGarage.css';

function BikeGarage() {
    const [bikes, setBikes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null); // Pour savoir "qui je suis"
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // 1. Qui suis-je ?
            const user = await authService.getCurrentUser();
            setCurrentUserId(user ? user.id : null);

            // 2. Je charge les vélos (Les miens + ceux des Turlags)
            const data = await api.getBikes();
            setBikes(data);
        } catch (e) {
            console.error("Erreur chargement garage:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleBikeClick = (bikeId) => {
        navigate(`/app/bike/${bikeId}`);
    };

    if (loading) return <div className="loading-state">Chargement du garage...</div>;

    // Séparation visuelle (optionnel mais sympa) : Mes vélos vs Les autres
    // Pour l'instant on affiche tout en vrac, mais on ajoute un badge visuel

    return (
        <div className="bike-garage">
            <header className="garage-header">
                <h2>Mon Garage</h2>
                <button className="add-btn" onClick={() => navigate('/app/add-bike')}>
                    +
                </button>
            </header>

            {bikes.length === 0 ? (
                <div className="empty-state">
                    <p>Aucun vélo pour le moment.</p>
                    <button onClick={() => navigate('/app/add-bike')}>Ajouter mon premier vélo</button>
                </div>
            ) : (
                <div className="bikes-grid">
                    {bikes.map(bike => {
                        // Est-ce mon vélo ?
                        const isMine = bike.user_id === currentUserId;
                        
                        return (
                            <div 
                                key={bike.id} 
                                className={`bike-card ${!isMine ? 'friend-bike' : ''}`}
                                onClick={() => handleBikeClick(bike.id)}
                            >
                                <div className="bike-image-placeholder">
                                    {bike.photo_url ? (
                                        <img src={bike.photo_url} alt={bike.name} />
                                    ) : (
                                        <span>🚲</span>
                                    )}
                                    
                                    {/* Badge Propriétaire si ce n'est pas mon vélo */}
                                    {!isMine && bike.profiles && (
                                        <div className="owner-badge" title={`Appartient à ${bike.profiles.name}`}>
                                            {bike.profiles.avatar || '👤'}
                                        </div>
                                    )}
                                </div>
                                <div className="bike-info">
                                    <h3>{bike.name}</h3>
                                    <div className="bike-stats">
                                        <span>{bike.total_km} km</span>
                                        {/* On peut ajouter une info 'Maintenance' ici plus tard */}
                                    </div>
                                    {!isMine && <span className="owner-name">de {bike.profiles?.name}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default BikeGarage;