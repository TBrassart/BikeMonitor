import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { 
    FaSearch, FaFilter, FaBicycle, FaRunning, FaHiking, FaSwimmer, 
    FaMountain, FaRoad, FaStopwatch, FaSnowboarding, FaDumbbell, FaSpa 
} from 'react-icons/fa';

import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import './ActivitiesPage.css';

function ActivitiesPage() {
    const [rawActivities, setRawActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // --- ÉTATS FILTRES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('Tous');
    const [selectedType, setSelectedType] = useState('Tous');
    const [selectedTag, setSelectedTag] = useState('Tous'); // Filtre par badge
    
    // Sliders
    const [distRange, setDistRange] = useState([0, 200]);
    const [elevRange, setElevRange] = useState([0, 3000]);
    const [timeRange, setTimeRange] = useState([0, 10]); 

    const [maxValues, setMaxValues] = useState({ dist: 200, elev: 3000, time: 10 });
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const activities = await api.getActivities();
            setRawActivities(activities || []);

            if (activities.length > 0) {
                const maxD = Math.ceil(Math.max(...activities.map(a => a.distance > 1000 ? a.distance/1000 : a.distance)));
                const maxE = Math.ceil(Math.max(...activities.map(a => a.total_elevation_gain)));
                const maxT = Math.ceil(Math.max(...activities.map(a => a.moving_time / 3600)));

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

    // --- SYSTÈME DE TAGS (Restauré) ---
    const getTags = (act) => {
        const tags = [];
        const dist = act.distance > 1000 ? act.distance / 1000 : act.distance;
        const elev = act.total_elevation_gain;
        const type = act.type;

        // Type spécifique
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

    // --- FILTRAGE ---
    const filteredActivities = useMemo(() => {
        return rawActivities.filter(act => {
            const dist = act.distance > 1000 ? act.distance / 1000 : act.distance;
            const hours = act.moving_time / 3600;
            const year = new Date(act.start_date).getFullYear().toString();
            const tags = getTags(act); // On génère les tags pour filtrer dessus

            // Recherche Texte
            if (!act.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            
            // Selects
            if (selectedYear !== 'Tous' && year !== selectedYear) return false;
            if (selectedType !== 'Tous' && act.type !== selectedType) return false;
            
            // Filtre par Badge (ex: "Zwift")
            if (selectedTag !== 'Tous') {
                // On vérifie si un des tags contient le mot sélectionné
                const hasTag = tags.some(t => t.label.includes(selectedTag));
                if (!hasTag) return false;
            }

            // Sliders
            if (dist < distRange[0] || dist > distRange[1]) return false;
            if (act.total_elevation_gain < elevRange[0] || act.total_elevation_gain > elevRange[1]) return false;
            if (hours < timeRange[0] || hours > timeRange[1]) return false;

            return true;
        });
    }, [rawActivities, searchTerm, selectedYear, selectedType, selectedTag, distRange, elevRange, timeRange]);

    // --- VISUELS ---
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

    return (
        <div className="activities-page">
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
                            // APPEL DE LA FONCTION TAGS ICI
                            const tags = getTags(act);

                            return (
                                <div key={act.id} className="activity-card glass-panel">
                                    <div className="act-main">
                                        <div className={`act-icon-box ${visuals.class}`}>
                                            {visuals.icon}
                                        </div>
                                        <div className="act-info">
                                            <div className="act-header">
                                                <h4>{act.name}</h4>
                                                <span className="act-date">{new Date(act.start_date).toLocaleDateString()}</span>
                                            </div>
                                            
                                            {/* AFFICHAGE DES TAGS RESTAURÉ */}
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