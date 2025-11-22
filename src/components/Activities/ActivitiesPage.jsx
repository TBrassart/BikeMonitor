import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { FaBicycle, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaSearch, FaFilter, FaMountain, FaRoad, FaTimes } from 'react-icons/fa';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css'; // Import du style par défaut du slider
import './ActivitiesPage.css';

const ActivitiesPage = ({ currentProfile }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // --- ÉTATS DES FILTRES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('all');
    const [selectedBikeId, setSelectedBikeId] = useState('all');
    
    // Ranges (Min/Max) - Initialisés large, ajustés au chargement
    const [distRange, setDistRange] = useState([0, 200]);
    const [elevRange, setElevRange] = useState([0, 3000]);
    const [timeRange, setTimeRange] = useState([0, 10]); // En heures

    // --- 1. CHARGEMENT DES DONNÉES ---
    useEffect(() => {
        if (!currentProfile) return;

        const fetchActivities = async () => {
            setLoading(true);
            // On récupère les activités ET le nom du vélo associé
            const { data, error } = await supabase
                .from('activities')
                .select(`
                    *,
                    bikes ( id, name )
                `)
                .eq('profile_id', currentProfile.id)
                .order('start_date', { ascending: false });
            
            if (!error && data) {
                setActivities(data);
                
                // Calcul des bornes max pour les sliders dynamiquement
                const maxDist = Math.ceil(Math.max(...data.map(a => a.distance || 0)) / 1000);
                const maxElev = Math.ceil(Math.max(...data.map(a => a.total_elevation_gain || 0)));
                const maxTime = Math.ceil(Math.max(...data.map(a => a.moving_time || 0)) / 3600);

                // On met à jour les sliders seulement si on a des données
                if (data.length > 0) {
                    setDistRange([0, maxDist + 10]);
                    setElevRange([0, maxElev + 100]);
                    setTimeRange([0, maxTime + 1]);
                }
            }
            setLoading(false);
        };

        fetchActivities();
    }, [currentProfile]);

    // --- 2. LISTES DÉROULANTES DYNAMIQUES ---
    // Années disponibles
    const availableYears = useMemo(() => {
        const years = new Set(activities.map(a => new Date(a.start_date).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [activities]);

    // Vélos disponibles (ceux utilisés dans les activités)
    const availableBikes = useMemo(() => {
        const bikesMap = new Map();
        activities.forEach(a => {
            if (a.bikes) {
                bikesMap.set(a.bikes.id, a.bikes.name);
            }
        });
        return Array.from(bikesMap.entries());
    }, [activities]);

    // --- 3. LOGIQUE DE FILTRAGE ---
    const filteredActivities = activities.filter(act => {
        // A. Recherche textuelle
        const matchesSearch = act.name.toLowerCase().includes(searchTerm.toLowerCase());

        // B. Filtre Année
        const actYear = new Date(act.start_date).getFullYear();
        const matchesYear = selectedYear === 'all' || actYear === parseInt(selectedYear);

        // C. Filtre Vélo
        // Si selectedBikeId est 'all', c'est bon.
        // Sinon, on vérifie si l'activité a un vélo ET si l'ID correspond.
        const matchesBike = selectedBikeId === 'all' || (act.bikes && act.bikes.id === selectedBikeId);

        // D. Filtre Sliders
        const actDistKm = (act.distance || 0) / 1000;
        const matchesDist = actDistKm >= distRange[0] && actDistKm <= distRange[1];

        const actElev = act.total_elevation_gain || 0;
        const matchesElev = actElev >= elevRange[0] && actElev <= elevRange[1];

        const actTimeH = (act.moving_time || 0) / 3600;
        const matchesTime = actTimeH >= timeRange[0] && actTimeH <= timeRange[1];

        return matchesSearch && matchesYear && matchesBike && matchesDist && matchesElev && matchesTime;
    });

    // Formatage helpers
    const formatDuration = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    return (
        <div className="activities-container">
            <header className="page-header">
                <div className="header-content">
                    <div>
                        <h1>Mes Sorties</h1>
                        <p>Historique Strava ({filteredActivities.length} affichées)</p>
                    </div>
                    <button 
                        className={`filter-toggle-btn ${showFilters ? 'active' : ''}`} 
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <FaFilter /> Filtres
                    </button>
                </div>

                {/* BARRE DE RECHERCHE */}
                <div className="search-row">
                    <FaSearch className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Rechercher une sortie (ex: Sortie du dimanche)..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="clear-search" onClick={() => setSearchTerm('')}>
                            <FaTimes />
                        </button>
                    )}
                </div>
            </header>

            {/* PANNEAU DE FILTRES */}
            {showFilters && (
                <div className="filters-panel">
                    {/* Ligne 1 : Selects */}
                    <div className="filters-row">
                        <div className="filter-group">
                            <label><FaCalendarAlt /> Année</label>
                            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                                <option value="all">Toutes</option>
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label><FaBicycle /> Vélo</label>
                            <select value={selectedBikeId} onChange={e => setSelectedBikeId(e.target.value)}>
                                <option value="all">Tous les vélos</option>
                                {availableBikes.map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Ligne 2 : Sliders */}
                    <div className="sliders-row">
                        <div className="slider-group">
                            <label><FaRoad /> Distance: {distRange[0]} - {distRange[1]} km</label>
                            <Slider 
                                range 
                                min={0} max={2500} // Tu peux augmenter le max global si besoin
                                value={distRange} 
                                onChange={setDistRange} 
                                trackStyle={[{ backgroundColor: '#00e5ff' }]}
                                handleStyle={[{ borderColor: '#00e5ff' }, { borderColor: '#00e5ff' }]}
                                railStyle={{ backgroundColor: '#444' }}
                            />
                        </div>
                        
                        <div className="slider-group">
                            <label><FaMountain /> Dénivelé: {elevRange[0]} - {elevRange[1]} m</label>
                            <Slider 
                                range 
                                min={0} max={10000} 
                                value={elevRange} 
                                onChange={setElevRange}
                                trackStyle={[{ backgroundColor: '#e74c3c' }]}
                                handleStyle={[{ borderColor: '#e74c3c' }, { borderColor: '#e74c3c' }]}
                                railStyle={{ backgroundColor: '#444' }}
                            />
                        </div>

                        <div className="slider-group">
                            <label><FaClock /> Durée: {timeRange[0]}h - {timeRange[1]}h</label>
                            <Slider 
                                range 
                                min={0} max={40} 
                                value={timeRange} 
                                onChange={setTimeRange}
                                trackStyle={[{ backgroundColor: '#f39c12' }]}
                                handleStyle={[{ borderColor: '#f39c12' }, { borderColor: '#f39c12' }]}
                                railStyle={{ backgroundColor: '#444' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* LISTE DES RÉSULTATS */}
            {loading ? <p className="loading-text">Chargement...</p> : (
                <div className="activities-list">
                    {filteredActivities.length === 0 ? (
                        <div className="empty-state">Aucune sortie ne correspond à tes filtres.</div>
                    ) : (
                        filteredActivities.map(act => (
                            <div key={act.id} className="activity-card">
                                <div className="act-header">
                                    <h3>{act.name}</h3>
                                    <span className="act-date">{new Date(act.start_date).toLocaleDateString()}</span>
                                </div>
                                <div className="act-stats">
                                    <span title="Distance"><FaRoad /> {(act.distance / 1000).toFixed(1)} km</span>
                                    <span title="Dénivelé"><FaMountain /> {Math.round(act.total_elevation_gain)} m</span>
                                    <span title="Durée"><FaClock /> {formatDuration(act.moving_time)}</span>
                                </div>
                                <div className="act-footer">
                                    <span className="act-bike">
                                        <FaBicycle /> {act.bikes?.name || <em style={{opacity:0.5}}>Non assigné</em>}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ActivitiesPage;