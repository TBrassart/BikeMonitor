import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { 
    FaSearch, FaFilter, FaBicycle, FaRunning, FaHiking, FaSwimmer, 
    FaMountain, FaRoad, FaStopwatch, FaSnowboarding 
} from 'react-icons/fa';
import './ActivitiesPage.css';

function ActivitiesPage() {
    const [rawActivities, setRawActivities] = useState([]);
    const [bikesList, setBikesList] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // --- ÉTATS DES FILTRES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('Tous');
    const [selectedBike, setSelectedBike] = useState('Tous');
    
    // Sliders (Min, Max)
    const [distRange, setDistRange] = useState([0, 200]);
    const [elevRange, setElevRange] = useState([0, 3000]);
    const [timeRange, setTimeRange] = useState([0, 10]); // En heures

    // Bornes Max automatiques (basées sur les données)
    const [maxValues, setMaxValues] = useState({ dist: 200, elev: 3000, time: 10 });

    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const activities = await api.getActivities();
            const bikes = await api.getBikes(); // Pour le filtre vélo
            
            setRawActivities(activities || []);
            setBikesList(bikes || []);

            // Calcul des max automatiques pour les sliders
            if (activities.length > 0) {
                const maxD = Math.ceil(Math.max(...activities.map(a => a.distance > 1000 ? a.distance/1000 : a.distance)));
                const maxE = Math.ceil(Math.max(...activities.map(a => a.total_elevation_gain)));
                const maxT = Math.ceil(Math.max(...activities.map(a => a.moving_time / 3600)));

                setMaxValues({ dist: maxD, elev: maxE, time: maxT });
                // On initialise les sliders au max
                setDistRange([0, maxD]);
                setElevRange([0, maxE]);
                setTimeRange([0, maxT]);
            }
        } catch (e) {
            console.error("Erreur chargement:", e);
        } finally {
            setLoading(false);
        }
    };

    // --- SYSTÈME DE TAGS AMUSANTS ---
    const getTags = (act) => {
        const tags = [];
        const dist = act.distance > 1000 ? act.distance / 1000 : act.distance;
        const elev = act.total_elevation_gain;
        const type = act.type;

        // Tags de Type
        if (type === 'VirtualRide') tags.push({ label: 'Home Trainer 🏠', color: 'purple' });
        if (type === 'Run') tags.push({ label: 'Running 🏃', color: 'orange' });
        
        // Tags de Performance
        if (dist > 100) tags.push({ label: 'Century 💯', color: 'gold' });
        else if (dist > 50) tags.push({ label: 'Sortie Longue 🛣️', color: 'blue' });
        else if (dist < 15 && type === 'Ride') tags.push({ label: 'Décrassage ☕', color: 'green' });

        if (elev > 1500) tags.push({ label: 'Haute Montagne 🏔️', color: 'red' });
        else if (elev > 500) tags.push({ label: 'Vallonné ⛰️', color: 'orange' });

        // Tags Spéciaux
        if (act.start_date_local && new Date(act.start_date_local).getHours() < 7) {
            tags.push({ label: 'Morning Ride 🌅', color: 'cyan' });
        }

        return tags;
    };

    // --- FILTRAGE EN TEMPS RÉEL ---
    const filteredActivities = useMemo(() => {
        return rawActivities.filter(act => {
            const dist = act.distance > 1000 ? act.distance / 1000 : act.distance;
            const hours = act.moving_time / 3600;
            const year = new Date(act.start_date).getFullYear().toString();
            
            // 1. Recherche Texte
            const matchesSearch = act.name.toLowerCase().includes(searchTerm.toLowerCase());
            
            // 2. Filtres Selects
            const matchesYear = selectedYear === 'Tous' || year === selectedYear;
            // Pour le vélo, on suppose que l'API renvoie bike_id ou un objet vélo lié
            const matchesBike = selectedBike === 'Tous' || (act.bike_id === selectedBike);

            // 3. Sliders
            const matchesDist = dist >= distRange[0] && dist <= distRange[1];
            const matchesElev = act.total_elevation_gain >= elevRange[0] && act.total_elevation_gain <= elevRange[1];
            const matchesTime = hours >= timeRange[0] && hours <= timeRange[1];

            return matchesSearch && matchesYear && matchesBike && matchesDist && matchesElev && matchesTime;
        });
    }, [rawActivities, searchTerm, selectedYear, selectedBike, distRange, elevRange, timeRange]);

    // --- UTILITAIRES ---
    const getIcon = (type) => {
        switch(type) {
            case 'Run': return <FaRunning />;
            case 'Hike': case 'Walk': return <FaHiking />;
            case 'Swim': return <FaSwimmer />;
            case 'VirtualRide': return <FaStopwatch />; // Ou icône Zwift si on avait
            case 'AlpineSki': case 'Snowboard': return <FaSnowboarding />;
            default: return <FaBicycle />;
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h${m < 10 ? '0' : ''}${m}`;
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Extraction des années uniques pour le filtre
    const years = [...new Set(rawActivities.map(a => new Date(a.start_date).getFullYear()))].sort().reverse();

    return (
        <div className="activities-page">
            <header className="activities-header">
                <div>
                    <h2 className="gradient-text">Journal d'activités</h2>
                    <p className="subtitle">{filteredActivities.length} sorties trouvées</p>
                </div>
                <button 
                    className={`filter-toggle-btn ${showFilters ? 'active' : ''}`} 
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <FaFilter /> Filtres
                </button>
            </header>

            {/* BARRE DE RECHERCHE & FILTRES */}
            <div className={`filters-panel glass-panel ${showFilters ? 'open' : ''}`}>
                <div className="search-row">
                    <div className="search-input-wrapper">
                        <FaSearch className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Rechercher une sortie..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="neon-select">
                        <option value="Tous">Toutes les années</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <select value={selectedBike} onChange={(e) => setSelectedBike(e.target.value)} className="neon-select">
                        <option value="Tous">Tous les vélos</option>
                        {bikesList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>

                <div className="sliders-row">
                    <div className="range-control">
                        <label><FaRoad /> Distance: {distRange[0]} - {distRange[1]} km</label>
                        <input 
                            type="range" min="0" max={maxValues.dist} 
                            value={distRange[1]} 
                            onChange={(e) => setDistRange([distRange[0], parseInt(e.target.value)])} 
                        />
                    </div>
                    <div className="range-control">
                        <label><FaMountain /> Dénivelé: {elevRange[0]} - {elevRange[1]} m</label>
                        <input 
                            type="range" min="0" max={maxValues.elev} 
                            value={elevRange[1]} 
                            onChange={(e) => setElevRange([elevRange[0], parseInt(e.target.value)])} 
                        />
                    </div>
                    <div className="range-control">
                        <label><FaStopwatch /> Durée: {timeRange[0]} - {timeRange[1]} h</label>
                        <input 
                            type="range" min="0" max={maxValues.time} 
                            value={timeRange[1]} 
                            onChange={(e) => setTimeRange([timeRange[0], parseInt(e.target.value)])} 
                        />
                    </div>
                </div>
            </div>

            {/* LISTE DES ACTIVITÉS */}
            {loading ? (
                <div className="loading-state">Chargement de l'historique...</div>
            ) : (
                <div className="activities-grid">
                    {filteredActivities.length === 0 ? (
                        <div className="empty-search">Aucune activité ne correspond à tes critères 🕵️‍♂️</div>
                    ) : (
                        filteredActivities.map(act => {
                            const tags = getTags(act);
                            const distKm = act.distance > 1000 ? act.distance / 1000 : act.distance;

                            return (
                                <div key={act.id} className="activity-card glass-panel">
                                    <div className="act-main">
                                        <div className={`act-icon-box ${act.type.toLowerCase()}`}>
                                            {getIcon(act.type)}
                                        </div>
                                        <div className="act-info">
                                            <div className="act-header">
                                                <h4>{act.name}</h4>
                                                <span className="act-date">{formatDate(act.start_date)}</span>
                                            </div>
                                            
                                            {/* TAGS */}
                                            {tags.length > 0 && (
                                                <div className="tags-row">
                                                    {tags.map((t, i) => (
                                                        <span key={i} className={`tag-pill ${t.color}`}>{t.label}</span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="act-metrics">
                                                <div className="metric">
                                                    <span className="label">Distance</span>
                                                    <span className="value">{Number(distKm).toFixed(1)} <small>km</small></span>
                                                </div>
                                                <div className="metric">
                                                    <span className="label">Dénivelé</span>
                                                    <span className="value">{Math.round(act.total_elevation_gain)} <small>m</small></span>
                                                </div>
                                                <div className="metric">
                                                    <span className="label">Temps</span>
                                                    <span className="value">{formatTime(act.moving_time)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

export default ActivitiesPage;