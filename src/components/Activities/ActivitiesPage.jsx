import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { 
    FaSearch, FaFilter, FaBicycle, FaRunning, FaHiking, FaSwimmer, 
    FaMountain, FaRoad, FaStopwatch, FaSnowboarding, FaDumbbell, FaSpa 
} from 'react-icons/fa';
import './ActivitiesPage.css';

function ActivitiesPage() {
    const [rawActivities, setRawActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // --- ÉTATS DES FILTRES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('Tous');
    const [selectedType, setSelectedType] = useState('Tous');
    const [selectedTag, setSelectedTag] = useState('Tous');
    
    // Sliders (Tableaux [Min, Max])
    const [distRange, setDistRange] = useState([0, 200]);
    const [elevRange, setElevRange] = useState([0, 3000]);
    const [timeRange, setTimeRange] = useState([0, 10]); 

    // Bornes Max dynamiques
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
                // Calcul des max réels
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

    // --- CATÉGORISATION & TAGS ---
    const getTags = (act) => {
        const tags = [];
        const dist = act.distance > 1000 ? act.distance / 1000 : act.distance;
        const elev = act.total_elevation_gain;
        const type = act.type;

        // Type
        if (type === 'VirtualRide') tags.push({ label: 'Zwift 🏠', color: 'purple' });
        if (type === 'WeightTraining' || type === 'Workout') tags.push({ label: 'Muscu 💪', color: 'red' });
        if (type === 'Yoga' || type === 'Pilates') tags.push({ label: 'Zen 🧘', color: 'green' });

        // Perf
        if (dist > 100) tags.push({ label: 'Century 💯', color: 'gold' });
        else if (dist > 50) tags.push({ label: 'Longue 🛣️', color: 'blue' });
        
        if (elev > 1000) tags.push({ label: 'Grimpeur 🐐', color: 'red' });
        
        // Horaire
        if (act.start_date && new Date(act.start_date).getHours() < 7) {
            tags.push({ label: 'Morning ☕', color: 'cyan' });
        }

        return tags;
    };

    // --- ICONE & COULEUR PAR SPORT ---
    const getVisuals = (type) => {
        switch(type) {
            case 'Run': return { icon: <FaRunning />, class: 'run' };
            case 'Hike': case 'Walk': return { icon: <FaHiking />, class: 'hike' };
            case 'Swim': return { icon: <FaSwimmer />, class: 'swim' };
            case 'AlpineSki': case 'Snowboard': return { icon: <FaSnowboarding />, class: 'winter' };
            case 'WeightTraining': case 'Workout': return { icon: <FaDumbbell />, class: 'workout' };
            case 'Yoga': case 'Pilates': return { icon: <FaSpa />, class: 'hike' }; // Vert pour le zen
            default: return { icon: <FaBicycle />, class: 'ride' }; // Vélo par défaut (Bleu)
        }
    };

    // --- FILTRAGE ---
    const filteredActivities = useMemo(() => {
        return rawActivities.filter(act => {
            const dist = act.distance > 1000 ? act.distance / 1000 : act.distance;
            const hours = act.moving_time / 3600;
            const year = new Date(act.start_date).getFullYear().toString();
            const tags = getTags(act);

            // Recherche
            if (!act.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            
            // Selects
            if (selectedYear !== 'Tous' && year !== selectedYear) return false;
            if (selectedType !== 'Tous' && act.type !== selectedType) return false;
            if (selectedTag !== 'Tous' && !tags.some(t => t.label.includes(selectedTag))) return false;

            // Sliders (Min <= Val <= Max)
            if (dist < distRange[0] || dist > distRange[1]) return false;
            if (act.total_elevation_gain < elevRange[0] || act.total_elevation_gain > elevRange[1]) return false;
            if (hours < timeRange[0] || hours > timeRange[1]) return false;

            return true;
        });
    }, [rawActivities, searchTerm, selectedYear, selectedType, selectedTag, distRange, elevRange, timeRange]);

    // Listes pour les selects
    const years = [...new Set(rawActivities.map(a => new Date(a.start_date).getFullYear()))].sort().reverse();
    const types = [...new Set(rawActivities.map(a => a.type))].sort();
    // Pour les tags, on hardcode les principaux pour simplifier
    const filterTags = ['Zwift', 'Muscu', 'Century', 'Longue', 'Grimpeur', 'Morning'];

    // Composant Slider Double
    const DualSlider = ({ label, icon: Icon, min, max, range, setRange, unit }) => (
        <div className="slider-group">
            <div className="slider-label">
                <span style={{display:'flex', alignItems:'center', gap:'5px', color:'var(--neon-blue)'}}><Icon /> {label}</span>
                <span>{range[0]} - {range[1]} {unit}</span>
            </div>
            <div className="dual-slider">
                <div className="slider-track"></div>
                <input 
                    type="range" min={min} max={max} value={range[0]} 
                    onChange={(e) => {
                        const val = Math.min(parseInt(e.target.value), range[1] - 1);
                        setRange([val, range[1]]);
                    }} 
                />
                <input 
                    type="range" min={min} max={max} value={range[1]} 
                    onChange={(e) => {
                        const val = Math.max(parseInt(e.target.value), range[0] + 1);
                        setRange([range[0], val]);
                    }} 
                />
            </div>
        </div>
    );

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

            <div className="search-container">
                <input 
                    type="text" 
                    className="search-input"
                    placeholder="Rechercher une sortie..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <FaSearch className="search-icon-overlay" />
            </div>

            <div className={`filters-panel glass-panel ${showFilters ? 'open' : ''}`}>
                <div className="filters-row">
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="neon-select">
                        <option value="Tous">Année</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="neon-select">
                        <option value="Tous">Sport</option>
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className="neon-select">
                        <option value="Tous">Badge</option>
                        {filterTags.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="filters-row">
                    <DualSlider label="Distance" icon={FaRoad} min={0} max={maxValues.dist} range={distRange} setRange={setDistRange} unit="km" />
                    <DualSlider label="Dénivelé" icon={FaMountain} min={0} max={maxValues.elev} range={elevRange} setRange={setElevRange} unit="m" />
                    <DualSlider label="Durée" icon={FaStopwatch} min={0} max={maxValues.time} range={timeRange} setRange={setTimeRange} unit="h" />
                </div>
            </div>

            {loading ? <div className="loading">Chargement...</div> : (
                <div className="activities-grid">
                    {filteredActivities.map(act => {
                        const tags = getTags(act);
                        const visuals = getVisuals(act.type);
                        const distKm = act.distance > 1000 ? act.distance / 1000 : act.distance;

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
                    })}
                </div>
            )}
        </div>
    );
}

export default ActivitiesPage;