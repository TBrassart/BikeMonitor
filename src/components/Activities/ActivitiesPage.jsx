import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { 
    FaSearch, FaFilter, FaBicycle, FaRunning, FaHiking, FaSwimmer, 
    FaMountain, FaRoad, FaStopwatch, FaSnowboarding, FaDumbbell, FaSpa,
    FaTimes, FaFire, FaHeartbeat, FaBolt, FaExternalLinkAlt 
} from 'react-icons/fa';

import ActivityMap from './ActivityMap';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import './ActivitiesPage.css';

function ActivitiesPage() {
    const [rawActivities, setRawActivities] = useState([]);
    const [bikesList, setBikesList] = useState([]); // Pour retrouver le nom du vélo
    const [loading, setLoading] = useState(true);
    
    // --- ÉTATS FILTRES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('Tous');
    const [selectedType, setSelectedType] = useState('Tous');
    const [selectedTag, setSelectedTag] = useState('Tous');
    
    const [distRange, setDistRange] = useState([0, 200]);
    const [elevRange, setElevRange] = useState([0, 3000]);
    const [timeRange, setTimeRange] = useState([0, 10]); 
    const [maxValues, setMaxValues] = useState({ dist: 200, elev: 3000, time: 10 });
    
    const [showFilters, setShowFilters] = useState(false);

    // --- ÉTAT MODALE DÉTAIL ---
    const [selectedActivity, setSelectedActivity] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [acts, bikes] = await Promise.all([
                api.getActivities(),
                api.getBikes()
            ]);

            setRawActivities(acts || []);
            setBikesList(bikes || []);

            if (acts.length > 0) {
                const maxD = Math.ceil(Math.max(...acts.map(a => a.distance > 1000 ? a.distance/1000 : a.distance)));
                const maxE = Math.ceil(Math.max(...acts.map(a => a.total_elevation_gain)));
                const maxT = Math.ceil(Math.max(...acts.map(a => a.moving_time / 3600)));

                setMaxValues({ dist: maxD, elev: maxE, time: maxT });
                setDistRange([0, maxD]);
                setElevRange([0, maxE]);
                setTimeRange([0, maxT]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIQUE TAGS ---
    const getTags = (act) => {
        const tags = [];
        const dist = act.distance > 1000 ? act.distance / 1000 : act.distance;
        const elev = act.total_elevation_gain;
        const type = act.type;

        if (type === 'VirtualRide') tags.push({ label: 'Zwift 🏠', color: 'purple' });
        if (type === 'WeightTraining' || type === 'Workout') tags.push({ label: 'Muscu 💪', color: 'red' });
        if (type === 'Yoga' || type === 'Pilates') tags.push({ label: 'Zen 🧘', color: 'green' });
        
         // Performance
        if (dist >= 4800) tags.push({ label: 'RAAM 🦅', color: 'gold' });
        else if (dist >= 2500) tags.push({ label: 'RAF 🗺️', color: 'gold' });
        else if (dist >= 500) tags.push({ label: 'Ultra 🌟', color: 'red' });
        else if (dist >= 200) tags.push({ label: '2️⃣0️⃣0️⃣', color: 'purple' });
        else if (dist >= 100) tags.push({ label: 'Century 💯', color: 'blue' });
        else if (dist >= 70) tags.push({ label: 'Longue 🛣️', color: 'green' });
        
        if (elev >= 8848) tags.push({ label: 'Everesting 🗻', color: 'gold' });
        else if (elev >= 6000) tags.push({ label: 'Haute Montagne 🏔️', color: 'purple' });
        else if (elev >= 3000) tags.push({ label: 'Montagne 🐐', color: 'blue' });
        else if (elev >= 1000) tags.push({ label: 'Valloné 🧗', color: 'green' });

        // Horaire
        if (act.start_date && new Date(act.start_date).getHours() < 7) {
            tags.push({ label: 'Morning ☕', color: 'cyan' });
        }

        return tags;
    };

    const filteredActivities = useMemo(() => {
        return rawActivities.filter(act => {
            const dist = act.distance > 1000 ? act.distance / 1000 : act.distance;
            const hours = act.moving_time / 3600;
            const year = new Date(act.start_date).getFullYear().toString();
            const tags = getTags(act);

            if (!act.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (selectedYear !== 'Tous' && year !== selectedYear) return false;
            if (selectedType !== 'Tous' && act.type !== selectedType) return false;
            if (selectedTag !== 'Tous' && !tags.some(t => t.label.includes(selectedTag))) return false;
            if (dist < distRange[0] || dist > distRange[1]) return false;
            if (act.total_elevation_gain < elevRange[0] || act.total_elevation_gain > elevRange[1]) return false;
            if (hours < timeRange[0] || hours > timeRange[1]) return false;

            return true;
        });
    }, [rawActivities, searchTerm, selectedYear, selectedType, selectedTag, distRange, elevRange, timeRange]);

    const getVisuals = (type) => {
        switch(type) {
            case 'Run': return { icon: <FaRunning />, class: 'run' };
            case 'Hike': case 'Walk': return { icon: <FaHiking />, class: 'hike' };
            case 'Swim': return { icon: <FaSwimmer />, class: 'swim' };
            case 'WeightTraining': case 'Workout': return { icon: <FaDumbbell />, class: 'workout' };
            case 'Yoga': case 'Pilates': return { icon: <FaSpa />, class: 'hike' };
            case 'AlpineSki': case 'Snowboard': return { icon: <FaSnowboarding />, class: 'winter' };
            default: return { icon: <FaBicycle />, class: 'ride' };
        }
    };

    const years = [...new Set(rawActivities.map(a => new Date(a.start_date).getFullYear()))].sort().reverse();
    const types = [...new Set(rawActivities.map(a => a.type))].sort();
    const filterTags = ['Zwift', 'Muscu', 'Century', 'Longue', 'Grimpeur', 'Morning'];

    const getBikeName = (id) => {
        const bike = bikesList.find(b => b.id === id);
        return bike ? bike.name : 'Vélo inconnu';
    };

    return (
        <div className="activities-page">
            {/* --- MODALE DÉTAIL --- */}
            {selectedActivity && (
                <div className="modal-overlay" onClick={() => setSelectedActivity(null)}>
                    <div className="modal-content activity-modal" onClick={e => e.stopPropagation()}>
                        
                        {/* HEADER CARTE */}
                        <div className="act-modal-map-container" style={{height: '250px', position: 'relative'}}>
                            {/* Si on a une polyline, on affiche la carte, sinon un fond dégradé */}
                            {selectedActivity.map_polyline ? (
                                <ActivityMap polyline={selectedActivity.map_polyline} />
                            ) : (
                                <div className="map-placeholder-gradient"></div>
                            )}

                            {/* BOUTON FERMER FLOTTANT */}
                            <button className="close-modal-btn floating" onClick={() => setSelectedActivity(null)}>
                                <FaTimes />
                            </button>
                            
                            {/* TITRE SUPERPOSÉ EN BAS DE CARTE */}
                            <div className="map-overlay-title">
                                <div className="act-modal-date">
                                    {new Date(selectedActivity.start_date).toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
                                </div>
                                <h2>{selectedActivity.name}</h2>
                            </div>
                        </div>
                        
                        <div className="act-modal-body">
                            <div className="stats-grid-modal">
                                <div className="stat-box">
                                    <span className="label">Distance</span>
                                    <span className="value">{(selectedActivity.distance / (selectedActivity.distance > 1000 ? 1000 : 1)).toFixed(1)}</span>
                                    <span className="unit">km</span>
                                </div>
                                <div className="stat-box">
                                    <span className="label">Dénivelé</span>
                                    <span className="value">{Math.round(selectedActivity.total_elevation_gain)}</span>
                                    <span className="unit">m</span>
                                </div>
                                <div className="stat-box">
                                    <span className="label">Durée</span>
                                    <span className="value">{Math.floor(selectedActivity.moving_time / 3600)}h{Math.floor((selectedActivity.moving_time % 3600) / 60)}</span>
                                    <span className="unit">min</span>
                                </div>
                                {/* Stats Avancées si dispos dans external_data */}
                                {selectedActivity.external_data?.average_speed && (
                                    <div className="stat-box">
                                        <span className="label">Vitesse Moy.</span>
                                        <span className="value">{(selectedActivity.external_data.average_speed * 3.6).toFixed(1)}</span>
                                        <span className="unit">km/h</span>
                                    </div>
                                )}
                                {selectedActivity.external_data?.average_watts && (
                                    <div className="stat-box">
                                        <span className="label"><FaBolt /> Puissance</span>
                                        <span className="value">{Math.round(selectedActivity.external_data.average_watts)}</span>
                                        <span className="unit">W</span>
                                    </div>
                                )}
                                {selectedActivity.external_data?.kilojoules && (
                                    <div className="stat-box">
                                        <span className="label"><FaFire /> Énergie</span>
                                        <span className="value">{Math.round(selectedActivity.external_data.kilojoules)}</span>
                                        <span className="unit">kJ</span>
                                    </div>
                                )}
                            </div>

                            {selectedActivity.bike_id && (
                                <div className="bike-used">
                                    <div className="bike-thumb"><FaBicycle style={{fontSize:'1.5rem', color:'#666', margin:'12px'}}/></div>
                                    <div>
                                        <div style={{fontSize:'0.8rem', color:'#888'}}>Matériel utilisé</div>
                                        <div style={{fontWeight:'bold', color:'white'}}>{getBikeName(selectedActivity.bike_id)}</div>
                                    </div>
                                </div>
                            )}

                            <button className="strava-link-btn" onClick={() => window.open(`https://www.strava.com/activities/${selectedActivity.id}`, '_blank')}>
                                <FaExternalLinkAlt /> Voir l'analyse sur Strava
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="activities-header">
                <div>
                    <h2 className="gradient-text">Journal d'activités</h2>
                    <p className="subtitle">{filteredActivities.length} sorties trouvées</p>
                </div>
                <button className={`filter-toggle-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
                    <FaFilter /> Filtres
                </button>
            </header>

            <div className="search-container">
                <input type="text" className="search-input" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <FaSearch className="search-icon-overlay" />
            </div>

            {/* ... (FILTRES INCHANGÉS) ... */}
            <div className={`filters-panel glass-panel ${showFilters ? 'open' : ''}`}>
                <div className="filters-row">
                    <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="neon-select">
                        <option value="Tous">Toutes les années</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="neon-select">
                        <option value="Tous">Tous les sports</option>
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)} className="neon-select">
                        <option value="Tous">Tous les badges</option>
                        {filterTags.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="sliders-row">
                    <div className="slider-group">
                        <div className="slider-label">
                            <span><FaRoad style={{color:'var(--neon-blue)'}}/> Distance</span>
                            <span>{distRange[0]} - {distRange[1]} km</span>
                        </div>
                        <Slider range min={0} max={maxValues.dist} value={distRange} onChange={setDistRange} 
                            trackStyle={{ backgroundColor: 'var(--neon-blue)' }}
                            handleStyle={{ borderColor: 'var(--neon-blue)', backgroundColor: '#1e1e2d', opacity: 1 }}
                            railStyle={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                        />
                    </div>
                    <div className="slider-group">
                        <div className="slider-label">
                            <span><FaMountain style={{color:'var(--neon-purple)'}}/> Dénivelé</span>
                            <span>{elevRange[0]} - {elevRange[1]} m</span>
                        </div>
                        <Slider range min={0} max={maxValues.elev} value={elevRange} onChange={setElevRange}
                            trackStyle={{ backgroundColor: 'var(--neon-purple)' }}
                            handleStyle={{ borderColor: 'var(--neon-purple)', backgroundColor: '#1e1e2d', opacity: 1 }}
                            railStyle={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                        />
                    </div>
                    <div className="slider-group">
                        <div className="slider-label">
                            <span><FaStopwatch style={{color:'var(--neon-green)'}}/> Durée</span>
                            <span>{timeRange[0]} - {timeRange[1]} h</span>
                        </div>
                        <Slider range min={0} max={maxValues.time} value={timeRange} onChange={setTimeRange}
                            trackStyle={{ backgroundColor: 'var(--neon-green)' }}
                            handleStyle={{ borderColor: 'var(--neon-green)', backgroundColor: '#1e1e2d', opacity: 1 }}
                            railStyle={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                        />
                    </div>
                </div>
            </div>

            {loading ? <div className="loading">Chargement...</div> : (
                <div className="activities-grid">
                    {filteredActivities.length === 0 ? (
                        <div className="empty-search">Aucune activité ne correspond à tes critères.</div>
                    ) : (
                        filteredActivities.map(act => {
                            const visuals = getVisuals(act.type);
                            const distKm = act.distance > 1000 ? act.distance / 1000 : act.distance;
                            const tags = getTags(act);

                            return (
                                <div 
                                    key={act.id} 
                                    className="activity-card glass-panel" 
                                    onClick={() => setSelectedActivity(act)} // OUVERTURE DE LA POPUP
                                    style={{cursor: 'pointer'}} // Feedback visuel
                                >
                                    <div className="act-main">
                                        <div className={`act-icon-box ${visuals.class}`}>
                                            {visuals.icon}
                                        </div>
                                        <div className="act-info">
                                            <div className="act-header">
                                                <h4>{act.name}</h4>
                                                <span className="act-date">{new Date(act.start_date).toLocaleDateString()}</span>
                                            </div>
                                            
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
                                                    <span className="label">D+</span>
                                                    <span className="value">{Math.round(act.total_elevation_gain)} <small>m</small></span>
                                                </div>
                                                <div className="metric">
                                                    <span className="label">Temps</span>
                                                    <span className="value">{Math.floor(act.moving_time / 3600)}h {Math.floor((act.moving_time % 3600) / 60)}</span>
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