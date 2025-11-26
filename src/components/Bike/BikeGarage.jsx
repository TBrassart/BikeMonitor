import React, { useState, useEffect } from 'react';
import { bikeService, authService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaPlus, FaUsers } from 'react-icons/fa';
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

            const uniqueOwners = ['Tous', 'Moi', ...new Set(
                data.filter(b => b.user_id !== user.id).map(b => b.profiles?.name || 'Inconnu')
            )];
            setOwners(uniqueOwners);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    const handleFilter = (filter) => {
        setSelectedOwner(filter);
        if (filter === 'Tous') setFilteredBikes(bikes);
        else if (filter === 'Moi') setFilteredBikes(bikes.filter(b => b.user_id === currentUser.id));
        else setFilteredBikes(bikes.filter(b => (b.profiles?.name || 'Inconnu') === filter));
    };

    const hasAlerts = (bike) => {
        if (!bike.parts) return false;
        return bike.parts.some(p => p.status === 'critical' || p.status === 'warning');
    };

    // --- FONCTION DE RÉCUPÉRATION SÉCURISÉE DU STYLE CADRE ---
    const getFrameStyle = (bike) => {
        // Supabase peut renvoyer shop_items sous forme d'objet ou de tableau selon la relation
        let frameData = bike.shop_items;
        
        // Si c'est un tableau, on prend le premier
        if (Array.isArray(frameData)) {
            frameData = frameData[0];
        }

        if (frameData && frameData.asset_data) {
            return {
                border: `4px solid ${frameData.asset_data.border}`, // Bordure épaisse
                boxShadow: `0 0 25px ${frameData.asset_data.border}, inset 0 0 10px ${frameData.asset_data.border}`, // Effet Glow interne/externe
                transform: 'scale(1.02)',
                transition: 'all 0.3s ease'
            };
        }
        // Style par défaut (si pas de cadre)
        return { border: '1px solid rgba(255,255,255,0.1)' };
    };

    if (loading) return <div className="loading-state">Ouverture du garage...</div>;

    return (
        <div className="bike-garage">
            <header className="garage-header">
                <div>
                    <h2 className="gradient-text">Garage</h2>
                    <p style={{color:'#94a3b8', margin:0}}>Gère ton écurie et celle de ton Turlag</p>
                </div>
                <button className="add-btn" onClick={() => navigate('/app/add-bike')}><FaPlus /></button>
            </header>

            <div className="filters-section">
                <span className="filters-label">Filtrer par cycliste</span>
                <div className="filters-scroll">
                    {owners.map(owner => (
                        <button key={owner} className={`chip ${selectedOwner === owner ? 'active' : ''}`} onClick={() => handleFilter(owner)}>
                            {owner === 'Tous' && <FaUsers style={{marginRight:5}} />} {owner}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bikes-grid">
                {filteredBikes.map(bike => {
                    const isMine = bike.user_id === currentUser?.id;
                    const alert = hasAlerts(bike);
                    const ownerName = isMine ? 'Moi' : (bike.profiles?.name || 'Inconnu');
                    
                    // On calcule le style ICI
                    const frameStyle = getFrameStyle(bike);

                    return (
                        <div 
                            key={bike.id} 
                            className={`bike-card glass-panel ${!isMine ? 'friend-bike' : ''}`}
                            onClick={() => isMine && navigate(`/app/bike/${bike.id}`)}
                            style={{ 
                                cursor: isMine ? 'pointer' : 'default',
                                opacity: isMine ? 1 : 0.85,
                                ...frameStyle // On applique les styles dynamiques (Bordure + Ombre)
                            }}
                        >
                            <div className="bike-image-placeholder">
                                {bike.photo_url ? <img src={bike.photo_url} alt={bike.name} loading="lazy" /> : <span style={{fontSize: '4rem', opacity:0.5}}>🚲</span>}
                                {alert && <div className="alert-badge"><FaExclamationTriangle /></div>}
                            </div>
                            <div className="bike-info">
                                <div className="bike-header-row">
                                    <h3>{bike.name}</h3>
                                    <span className="bike-km">{bike.total_km.toLocaleString()} km</span>
                                </div>
                                <div className="owner-row">
                                    <div className="owner-avatar">{ownerName.charAt(0).toUpperCase()}</div>
                                    <span className="owner-name">{isMine ? 'Mon vélo' : `Vélo de ${ownerName}`}</span>
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