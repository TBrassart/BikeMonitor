import React, { useState, useEffect } from 'react';
import { FaTimes, FaRoad, FaMountain, FaStopwatch, FaTrophy, FaChevronRight, FaChevronLeft, FaBicycle } from 'react-icons/fa';
import './YearWrapped.css';

const YearWrapped = ({ activities, onClose }) => {
    const [stats, setStats] = useState(null);
    const [slideIndex, setSlideIndex] = useState(0);
    const totalSlides = 5; 

    useEffect(() => {
        if (activities) calculateStats();
    }, [activities]);

    const calculateStats = () => {
        const currentYear = new Date().getFullYear();
        
        // On filtre sur l'année en cours
        const yearActs = activities.filter(a => new Date(a.start_date).getFullYear() === currentYear);

        if (yearActs.length === 0) {
            setStats({ empty: true, year: currentYear });
            return;
        }

        // Calculs
        const totalDist = yearActs.reduce((acc, a) => acc + (a.distance > 1000 ? a.distance/1000 : a.distance), 0);
        const totalElev = yearActs.reduce((acc, a) => acc + (a.total_elevation_gain || 0), 0);
        const totalTime = yearActs.reduce((acc, a) => acc + (a.moving_time || 0), 0);
        
        // La sortie la plus longue
        const biggestRide = yearActs.reduce((max, a) => {
            const distA = a.distance > 1000 ? a.distance/1000 : a.distance;
            const distMax = max.distance > 1000 ? max.distance/1000 : max.distance;
            return (distA > distMax ? a : max);
        }, yearActs[0]);

        setStats({
            year: currentYear,
            count: yearActs.length,
            distanceKm: Math.round(totalDist),
            elevation: Math.round(totalElev),
            hours: Math.floor(totalTime / 3600),
            biggestRide: {
                name: biggestRide.name,
                dist: Math.round(biggestRide.distance > 1000 ? biggestRide.distance/1000 : biggestRide.distance),
                elev: Math.round(biggestRide.total_elevation_gain)
            }
        });
    };

    const nextSlide = (e) => {
        e?.stopPropagation();
        if (slideIndex < totalSlides - 1) setSlideIndex(slideIndex + 1);
        else onClose(); 
    };

    const prevSlide = (e) => {
        e.stopPropagation();
        if (slideIndex > 0) setSlideIndex(slideIndex - 1);
    };

    if (!stats) return null;

    if (stats.empty) return (
        <div className="wrapped-overlay">
            <div className="wrapped-card glass-panel" style={{textAlign:'center', padding:'40px'}}>
                <h2>Année {stats.year}</h2>
                <p style={{margin:'20px 0', color:'#ccc'}}>Pas encore d'activités cette année.<br/>Roule un peu pour débloquer ton récap !</p>
                <button className="primary-btn" onClick={onClose}>Fermer</button>
            </div>
        </div>
    );

    const renderSlide = () => {
        switch (slideIndex) {
            case 0: // INTRO
                return (
                    <div className="slide-content intro">
                        <h1>Ton année {stats.year}</h1>
                        <div className="big-stat">{stats.count}</div>
                        <div className="label">Sorties enregistrées</div>
                        <p className="sub-text">Prêt pour le bilan ? 🎬</p>
                    </div>
                );
            case 1: // DISTANCE
                return (
                    <div className="slide-content distance">
                        <FaRoad className="slide-icon blue" />
                        <h2>Distance Totale</h2>
                        <div className="big-stat neon-blue">{stats.distanceKm} <span className="unit">km</span></div>
                        <p className="sub-text">C'est beau tout ce chemin parcouru.</p>
                    </div>
                );
            case 2: // ELEVATION
                return (
                    <div className="slide-content elevation">
                        <FaMountain className="slide-icon purple" />
                        <h2>Dénivelé Positif</h2>
                        <div className="big-stat neon-purple">{stats.elevation} <span className="unit">m</span></div>
                        <p className="sub-text">Tu as grimpé {Math.max(1, (stats.elevation / 8848).toFixed(1))} fois l'Everest 🏔️</p>
                    </div>
                );
            case 3: // BIGGEST RIDE
                return (
                    <div className="slide-content best">
                        <FaTrophy className="slide-icon gold" />
                        <h2>Ta sortie Épique</h2>
                        <div className="card-highlight glass-panel">
                            <h3>{stats.biggestRide.name}</h3>
                            <div className="dual-stat">
                                <span>{stats.biggestRide.dist} km</span>
                                <span>{stats.biggestRide.elev} m D+</span>
                            </div>
                        </div>
                    </div>
                );
            case 4: // OUTRO
                return (
                    <div className="slide-content time">
                        <FaStopwatch className="slide-icon green" />
                        <h2>Temps en selle</h2>
                        <div className="big-stat neon-green">{stats.hours} <span className="unit">heures</span></div>
                        <p className="sub-text">Une belle année de vélo ! 🚴</p>
                        <button className="primary-btn mt-20" style={{marginTop:'30px'}} onClick={onClose}>
                            Retour au Dashboard
                        </button>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="wrapped-overlay" onClick={nextSlide}>
            {/* Progress Bar */}
            <div className="progress-container">
                {[...Array(totalSlides)].map((_, i) => (
                    <div key={i} className={`progress-bar ${i <= slideIndex ? 'active' : ''}`} />
                ))}
            </div>

            <button className="close-btn" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                <FaTimes />
            </button>

            <div className="slide-container animate-pop" onClick={e => e.stopPropagation()}>
                {renderSlide()}
            </div>

            <div className="nav-controls">
                <button className="nav-btn" onClick={prevSlide} disabled={slideIndex === 0}><FaChevronLeft /></button>
                <div className="tap-hint" onClick={nextSlide}>Tap pour continuer</div>
                <button className="nav-btn" onClick={nextSlide}><FaChevronRight /></button>
            </div>
        </div>
    );
};

export default YearWrapped;