import React, { useState, useEffect } from 'react';
import { bikeService, authService, shopService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaPlus, FaUsers, FaEraser, FaThLarge, FaList } from 'react-icons/fa';
import './BikeGarage.css';

function BikeGarage() {
    const [bikes, setBikes] = useState([]);
    const [filteredBikes, setFilteredBikes] = useState([]);
    const [owners, setOwners] = useState([]);
    const [selectedOwner, setSelectedOwner] = useState('Tous');
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    
    // NOUVEAU : Mode d'affichage (Grid ou List)
    const [viewMode, setViewMode] = useState('grid'); 
    
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

    const handleRemoveFrame = async (e, bike) => {
        e.stopPropagation();
        if(window.confirm(`Retirer le cadre spécial ?`)) {
            try { await shopService.unequipBike(bike.id); loadData(); } 
            catch (err) { alert("Erreur"); }
        }
    };

    const hasAlerts = (bike) => {
        if (!bike.parts) return false;
        return bike.parts.some(p => p.status === 'critical' || p.status === 'warning');
    };

    // Renommé pour être plus précis : récupère les détails du cadre
    const getFrameDetails = (bike) => {
        const frame = Array.isArray(bike.frame_details) ? bike.frame_details[0] : bike.frame_details;
        
        if (frame && frame.asset_data) {
            return {
                className: frame.asset_data.className || '', // On récupère la classe CSS spécifique
                style: {
                    // On ne renvoie que le zIndex (pour la superposition), on laisse le CSS gérer le border/shadow
                    zIndex: 10 
                }
            };
        }
        // Retourne un objet vide si aucun cadre cosmétique n'est équipé
        return { className: '', style: {} };
    };

    if (loading) return <div className="loading-state">Ouverture du garage...</div>;

    return (
        <div className="bike-garage">
            <header className="garage-header">
                <div>
                    <h2 className="gradient-text">Garage</h2>
                    <p style={{color:'#94a3b8', margin:0}}>Gère ton écurie</p>
                </div>
                
                <div style={{display:'flex', gap:'10px'}}>
                    {/* TOGGLE VIEW */}
                    <div className="view-toggle glass-panel">
                        <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><FaThLarge /></button>
                        <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><FaList /></button>
                    </div>

                    <button 
                        className="add-btn primary-btn" 
                        onClick={() => navigate('/app/add-bike')}
                        style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px'}}
                    >
                        <FaPlus /> <span className="desktop-only">Ajouter un vélo</span>
                    </button>
                </div>
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

            {/* GRILLE MODIFIABLE */}
            <div className={`bikes-container ${viewMode}`}>
                {filteredBikes.map(bike => {
                    const isMine = bike.user_id === currentUser?.id;
                    const alert = hasAlerts(bike);
                    const ownerName = isMine ? 'Moi' : (bike.profiles?.name || 'Inconnu');
                    const frameDetails = getFrameDetails(bike);
                    const frameClass = frameDetails.className;
                    const frameStyle = frameDetails.style;
                    const hasFrame = Object.keys(frameStyle).length > 0;

                    return (
                        <div 
                            key={bike.id} 
                            className={`garage-bike-card glass-panel ${!isMine ? 'friend-bike' : ''} ${frameClass}`}
                            onClick={() => isMine && navigate(`/app/bike/${bike.id}`)}
                            style={{ 
                                cursor: isMine ? 'pointer' : 'default',
                                opacity: isMine ? 1 : 0.85,
                                ...frameStyle
                            }}
                        >
                            <div className="bike-image-placeholder">
                                {bike.photo_url ? <img src={bike.photo_url} alt={bike.name} loading="lazy" /> : <span style={{fontSize: '4rem', opacity:0.5}}>🚲</span>}
                                {alert && <div className="alert-badge" title="Maintenance !"><FaExclamationTriangle /></div>}
                                {isMine && hasFrame && (
                                    <button className="remove-frame-btn" onClick={(e) => handleRemoveFrame(e, bike)}><FaEraser /></button>
                                )}
                            </div>

                            <div className="bike-info">
                                <div className="bike-header-row">
                                    <h3>{bike.name}</h3>
                                    <span className="bike-km">{bike.total_km.toLocaleString()} km</span>
                                </div>
                                
                                {/* Affichage supplémentaire en mode liste */}
                                {viewMode === 'list' && (
                                    <div className="list-details">
                                        <span>{bike.brand} {bike.model}</span>
                                        {bike.serial_number && <span className="serial">S/N: {bike.serial_number}</span>}
                                    </div>
                                )}

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