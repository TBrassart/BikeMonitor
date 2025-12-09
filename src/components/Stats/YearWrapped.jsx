import React, { useState, useEffect, useMemo } from 'react';
import { 
    FaTimes, FaRoad, FaMountain, FaStopwatch, FaTrophy, FaChevronRight, FaChevronLeft, 
    FaCalendarAlt, FaFire, FaBicycle, FaRunning, FaHeartbeat, FaBolt, FaPlane, FaFilm
} from 'react-icons/fa';
import './YearWrapped.css';

const YearWrapped = ({ activities, bikes, onClose }) => {
    
    // --- ETATS ---
    const [stats, setStats] = useState(null);
    const [slideIndex, setSlideIndex] = useState(0);
    const [selectedYear, setSelectedYear] = useState(new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear());

    // --- CONSTANTES ---
    const TOTAL_SLIDES = 15;
    const PRO_STATS = { dist: 30000, time: 900, elev: 350000 }; // Stats d'un pro (ex: Van der Poel)

    // --- CALCULS ---
    useEffect(() => {
        if (activities && bikes) processData();
    }, [activities, bikes, selectedYear]);

    const processData = () => {
        const yearActs = activities.filter(a => new Date(a.start_date).getFullYear() === selectedYear);
        const prevYearActs = activities.filter(a => new Date(a.start_date).getFullYear() === selectedYear - 1);

        if (yearActs.length === 0) {
            setStats({ empty: true, year: selectedYear });
            return;
        }

        // 1. TOTAUX
        const totals = {
            dist: Math.round(yearActs.reduce((acc, a) => acc + (a.distance > 1000 ? a.distance/1000 : a.distance), 0)),
            elev: Math.round(yearActs.reduce((acc, a) => acc + (a.total_elevation_gain || 0), 0)),
            time: Math.floor(yearActs.reduce((acc, a) => acc + (a.moving_time || 0), 0) / 3600),
            count: yearActs.length
        };

        // 2. COMPARAISON N-1
        const prevTotals = {
            dist: Math.round(prevYearActs.reduce((acc, a) => acc + (a.distance > 1000 ? a.distance/1000 : a.distance), 0)),
            elev: Math.round(prevYearActs.reduce((acc, a) => acc + (a.total_elevation_gain || 0), 0)),
            time: Math.floor(prevYearActs.reduce((acc, a) => acc + (a.moving_time || 0), 0) / 3600),
            count: prevYearActs.length
        };

        // 3. STREAKS (Série max)
        const dates = [...new Set(yearActs.map(a => a.start_date.split('T')[0]))].sort();
        let maxStreak = 0, currentStreak = 0, lastDate = null;
        dates.forEach(date => {
            const d = new Date(date);
            if (!lastDate) { currentStreak = 1; } 
            else {
                const diff = (d - lastDate) / (1000 * 60 * 60 * 24);
                if (diff === 1) currentStreak++;
                else if (diff > 1) currentStreak = 1;
            }
            if (currentStreak > maxStreak) maxStreak = currentStreak;
            lastDate = d;
        });

        // 4. MOIS & JOURS
        const monthsDist = new Array(12).fill(0);
        const daysActivePerMonth = new Array(12).fill(0); // Set pour compter les jours uniques
        const dayOfWeekCount = new Array(7).fill(0);
        const uniqueDaysPerMonth = Array.from({ length: 12 }, () => new Set());

        yearActs.forEach(a => {
            const date = new Date(a.start_date);
            const m = date.getMonth();
            const d = date.getDay(); // 0 = Dimanche
            
            monthsDist[m] += (a.distance > 1000 ? a.distance/1000 : a.distance);
            dayOfWeekCount[d]++;
            uniqueDaysPerMonth[m].add(date.getDate());
        });

        // Conversion des Sets en nombre
        uniqueDaysPerMonth.forEach((set, i) => daysActivePerMonth[i] = set.size);

        const mostActiveMonthIdx = monthsDist.indexOf(Math.max(...monthsDist));
        const leastActiveMonthIdx = monthsDist.indexOf(Math.min(...monthsDist.filter(v => v > 0))); // Ignore 0 si possible

        // 5. MAX & TOPS
        const sortedDist = [...yearActs].sort((a,b) => b.distance - a.distance).slice(0,3);
        const sortedTime = [...yearActs].sort((a,b) => b.moving_time - a.moving_time).slice(0,3);
        const sortedElev = [...yearActs].sort((a,b) => b.total_elevation_gain - a.total_elevation_gain).slice(0,3);

        const maxs = {
            speed: Math.max(...yearActs.map(a => (a.external_data?.max_speed || 0) * 3.6)).toFixed(1),
            hr: Math.max(...yearActs.map(a => a.external_data?.max_heartrate || 0)),
            watts: Math.max(...yearActs.map(a => a.external_data?.max_watts || 0)),
            elev: Math.max(...yearActs.map(a => a.total_elevation_gain || 0)).toFixed(0),
            altitude: Math.max(...yearActs.map(a => a.external_data?.elev_high || 0)).toFixed(0)
        };

        // 6. EQUIPEMENT
        const bikeStats = {};
        yearActs.forEach(a => {
            if(a.bike_id) {
                bikeStats[a.bike_id] = (bikeStats[a.bike_id] || 0) + (a.distance > 1000 ? a.distance/1000 : a.distance);
            }
        });
        const bikeUsage = Object.keys(bikeStats).map(bid => {
            const bike = bikes.find(b => b.id === bid);
            return { name: bike ? bike.name : 'Inconnu', dist: Math.round(bikeStats[bid]) };
        }).sort((a,b) => b.dist - a.dist);

        // 7. FUN STATS (Aléatoire stable basé sur l'année)
        const funComparisons = {
            time: [
                { label: "Visionnages de Titanic", val: (totals.time / 3.25).toFixed(1), icon: <FaFilm /> },
                { label: "Vols Paris-Tokyo", val: (totals.time / 12).toFixed(1), icon: <FaPlane /> },
                { label: "Jours de travail (8h)", val: (totals.time / 8).toFixed(1), icon: <FaStopwatch /> }
            ],
            dist: [
                { label: "Traversées de la France", val: (totals.dist / 1000).toFixed(1), icon: <FaRoad /> },
                { label: "Tours de France", val: (totals.dist / 3500).toFixed(2), icon: <FaBicycle /> },
                { label: "Marathons", val: (totals.dist / 42.195).toFixed(0), icon: <FaRunning /> }
            ],
            elev: [
                { label: "Ascensions de l'Everest", val: (totals.elev / 8848).toFixed(1), icon: <FaMountain /> },
                { label: "Tours Eiffel", val: (totals.elev / 300).toFixed(0), icon: <FaArrowUpIcon /> }, // Créer un composant simple pour la flèche si besoin
                { label: "Sorties dans l'espace (ISS)", val: (totals.elev / 400000).toFixed(4), icon: <FaRocketIcon /> } // 400km
            ]
        };

        // Sélection semi-aléatoire (basée sur l'index de l'année pour que ça change pas à chaque render)
        const randIdx = selectedYear % 3; 

        setStats({
            year: selectedYear,
            totals,
            prevTotals,
            streak: maxStreak,
            daysActivePerMonth,
            fun: {
                time: funComparisons.time[randIdx],
                dist: funComparisons.dist[randIdx],
                elev: funComparisons.elev[randIdx],
                percentYear: ((totals.time / (24*365)) * 100).toFixed(2)
            },
            tops: { dist: sortedDist, time: sortedTime, elev: sortedElev },
            dayOfWeek: dayOfWeekCount, // [dim, lun, mar...]
            monthlyDist: monthsDist,
            mostActiveMonth: mostActiveMonthIdx,
            leastActiveMonth: leastActiveMonthIdx,
            equipment: bikeUsage,
            maxs
        });
    };

    // --- NAVIGATION ---
    const nextSlide = (e) => { e?.stopPropagation(); if (slideIndex < TOTAL_SLIDES - 1) setSlideIndex(slideIndex + 1); else onClose(); };
    const prevSlide = (e) => { e?.stopPropagation(); if (slideIndex > 0) setSlideIndex(slideIndex - 1); };

    // --- RENDU DES SLIDES ---
    const renderSlide = () => {
        if (!stats) return null;
        const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
        const fullMonths = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

        switch (slideIndex) {
            case 0: // INTRO
                return (
                    <div className="slide-content intro">
                        <div className="year-selector" onClick={e=>e.stopPropagation()}>
                            <select value={selectedYear} onChange={e=>setSelectedYear(parseInt(e.target.value))}>
                                <option value={2023}>2023</option>
                                <option value={2024}>2024</option>
                                <option value={2025}>2025</option>
                            </select>
                        </div>
                        <h1>TON ANNÉE {stats.year}</h1>
                        <p className="sub-text">Prêt pour le bilan ? 🎬</p>
                    </div>
                );
            case 1: // OVERVIEW
                return (
                    <div className="slide-content overview">
                        <h2>Vue d'ensemble</h2>
                        <div className="stat-grid">
                            <div className="stat-box"><span>📏</span><strong>{stats.totals.dist} km</strong></div>
                            <div className="stat-box"><span>⏱️</span><strong>{stats.totals.time} h</strong></div>
                            <div className="stat-box"><span>🏔️</span><strong>{stats.totals.elev} m</strong></div>
                            <div className="stat-box"><span>🔥</span><strong>{stats.totals.count} sorties</strong></div>
                        </div>
                        <div className="highlight-box">
                            Meilleure série : <strong className="neon-text">{stats.streak} jours</strong> consécutifs !
                        </div>
                    </div>
                );
            case 2: // COMPARAISON N-1
                const diffDist = stats.totals.dist - stats.prevTotals.dist;
                return (
                    <div className="slide-content comparison">
                        <h2>Vs {stats.year - 1}</h2>
                        <div className="vs-row">
                            <div className="vs-item">
                                <span className="label">Distance</span>
                                <div className="val">{stats.totals.dist} km</div>
                                <div className={`diff ${diffDist >= 0 ? 'pos' : 'neg'}`}>
                                    {diffDist > 0 ? '+' : ''}{diffDist} km
                                </div>
                            </div>
                            {/* Idem pour temps et D+ si besoin */}
                        </div>
                        <p className="sub-text">{diffDist > 0 ? "Tu as progressé ! 🚀" : "Année plus calme..."}</p>
                    </div>
                );
            case 3: // VS PRO
                const pctPro = Math.round((stats.totals.dist / PRO_STATS.dist) * 100);
                return (
                    <div className="slide-content pro-vs">
                        <h2>Niveau Pro ?</h2>
                        <div className="pro-bar-container">
                            <div className="pro-bar-label">Toi vs Un Pro ({PRO_STATS.dist}km)</div>
                            <div className="pro-bar-track">
                                <div className="pro-bar-fill" style={{width: `${Math.min(100, pctPro)}%`}}></div>
                            </div>
                            <div className="pro-val">{pctPro}% d'un pro</div>
                        </div>
                        <p className="sub-text">Encore quelques tours de roue ! 😉</p>
                    </div>
                );
            case 4: // JOURS PAR MOIS (GRAPHE)
                return (
                    <div className="slide-content graph-slide">
                        <h2>Jours actifs / mois</h2>
                        <div className="simple-bar-chart">
                            {stats.daysActivePerMonth.map((val, i) => (
                                <div key={i} className="bar-col">
                                    <div className="bar-val" style={{height: `${(val/31)*150}px`}}></div>
                                    <div className="bar-lbl">{months[i]}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 5: // FUN TIME
                return (
                    <div className="slide-content fun-stat">
                        <div className="icon-big">{stats.fun.time.icon}</div>
                        <h2>{stats.totals.time} Heures</h2>
                        <p>C'est l'équivalent de</p>
                        <div className="big-stat neon-blue">{stats.fun.time.val}</div>
                        <p>{stats.fun.time.label}</p>
                        <small className="mt-20">Soit {stats.fun.percentYear}% de ton année sur la selle.</small>
                    </div>
                );
            case 6: // FUN DISTANCE
                return (
                    <div className="slide-content fun-stat">
                        <div className="icon-big">{stats.fun.dist.icon}</div>
                        <h2>{stats.totals.dist} Km</h2>
                        <p>Tu as fait</p>
                        <div className="big-stat neon-green">{stats.fun.dist.val}</div>
                        <p>{stats.fun.dist.label}</p>
                    </div>
                );
            case 7: // FUN ELEV
                return (
                    <div className="slide-content fun-stat">
                        <div className="icon-big">{stats.fun.elev.icon}</div>
                        <h2>{stats.totals.elev} m D+</h2>
                        <p>Tu as grimpé</p>
                        <div className="big-stat neon-purple">{stats.fun.elev.val}</div>
                        <p>{stats.fun.elev.label}</p>
                    </div>
                );
            case 8: // TOP 3
                return (
                    <div className="slide-content top-list">
                        <h2>🏆 Tes Monuments</h2>
                        <div className="top-category">
                            <h3>Distance</h3>
                            {stats.tops.dist.map((a, i) => (
                                <div key={i} className="top-item">
                                    <span>{i+1}. {a.name}</span>
                                    <strong>{(a.distance/1000).toFixed(0)} km</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 9: // JOURS SEMAINE
                const maxDay = Math.max(...stats.dayOfWeek);
                return (
                    <div className="slide-content graph-slide">
                        <h2>Ton rythme hebdo</h2>
                        <div className="simple-bar-chart">
                            {stats.dayOfWeek.map((val, i) => (
                                <div key={i} className="bar-col">
                                    <div className={`bar-val ${val === maxDay ? 'highlight' : ''}`} style={{height: `${(val/maxDay)*150}px`}}></div>
                                    <div className="bar-lbl">{days[i]}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 10: // STREAK
                return (
                    <div className="slide-content streak-slide">
                        <FaFire className="slide-icon orange pulse" />
                        <h2>Record de Série</h2>
                        <div className="big-stat neon-orange">{stats.streak}</div>
                        <p>Jours d'affilée</p>
                        <p className="sub-text">Rien ne t'arrête !</p>
                    </div>
                );
            case 11: // DISTANCE MOIS
                const maxM = Math.max(...stats.monthlyDist);
                return (
                    <div className="slide-content graph-slide">
                        <h2>Distance par mois</h2>
                        <div className="simple-bar-chart">
                            {stats.monthlyDist.map((val, i) => (
                                <div key={i} className="bar-col">
                                    <div className="bar-val" style={{height: `${(val/maxM)*150}px`, background: 'var(--neon-blue)'}}></div>
                                    <div className="bar-lbl">{months[i]}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 12: // MOIS +/- ACTIF
                return (
                    <div className="slide-content split-slide">
                        <div className="half top">
                            <h3>🔥 En feu</h3>
                            <div className="big-text">{fullMonths[stats.mostActiveMonth]}</div>
                            <span>{Math.round(stats.monthlyDist[stats.mostActiveMonth])} km</span>
                        </div>
                        <div className="half bottom">
                            <h3>💤 En repos</h3>
                            <div className="big-text">{fullMonths[stats.leastActiveMonth]}</div>
                            <span>{Math.round(stats.monthlyDist[stats.leastActiveMonth])} km</span>
                        </div>
                    </div>
                );
            case 13: // EQUIPMENT
                return (
                    <div className="slide-content equipment">
                        <h2>Ton Garage</h2>
                        <div className="equip-list">
                            {stats.equipment.map((bike, i) => (
                                <div key={i} className="equip-row">
                                    <span className="bike-name"><FaBicycle/> {bike.name}</span>
                                    <div className="bike-bar-container">
                                        <div className="bike-bar" style={{width: `${(bike.dist / stats.totals.dist)*100}%`}}></div>
                                    </div>
                                    <span className="bike-dist">{bike.dist} km</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 14: // MAXS & OUTRO
                return (
                    <div className="slide-content maxs">
                        <h2>Records {stats.year}</h2>
                        <div className="max-grid">
                            <div className="max-item"><small>Vitesse Max</small><strong>{stats.maxs.speed} km/h</strong></div>
                            <div className="max-item"><small>Cardio Max</small><strong>{stats.maxs.hr} bpm</strong></div>
                            <div className="max-item"><small>Puissance Max</small><strong>{stats.maxs.watts} W</strong></div>
                            <div className="max-item"><small>Altitude Max</small><strong>{stats.maxs.altitude} m</strong></div>
                        </div>
                        <button className="primary-btn mt-20" onClick={onClose}>Fermer</button>
                    </div>
                );
            default: return null;
        }
    };

    if (stats?.empty) return <div className="wrapped-overlay">Pas de données {stats.year} <button onClick={onClose}>Fermer</button></div>;
    if (!stats) return null;

    return (
        <div className="wrapped-overlay" onClick={nextSlide}>
            <div className="progress-container">
                {[...Array(TOTAL_SLIDES)].map((_, i) => (
                    <div key={i} className={`progress-bar ${i <= slideIndex ? 'active' : ''}`} />
                ))}
            </div>
            <button className="close-btn" onClick={(e) => { e.stopPropagation(); onClose(); }}><FaTimes /></button>
            
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

// Icons helpers
const FaArrowUpIcon = () => <div style={{transform:'rotate(-45deg)', display:'inline-block'}}>🚀</div>;
const FaRocketIcon = () => <span>🛸</span>;

export default YearWrapped;