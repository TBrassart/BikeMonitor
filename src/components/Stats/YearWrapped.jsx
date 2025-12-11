import React, { useState, useEffect } from 'react';
import { 
    FaTimes, FaRoad, FaMountain, FaStopwatch, FaTrophy, FaChevronRight, FaChevronLeft, 
    FaBicycle, FaRunning, FaHeartbeat, FaBolt, FaPlane, FaFilm, FaUserAstronaut, FaFire,
    FaShareAlt, FaCopy, FaDownload
} from 'react-icons/fa';
import './YearWrapped.css';
import Logo from '../Layout/Logo';
import html2canvas from 'html2canvas';
import cyclistImg from '../../assets/cyclist.svg';


const YearWrapped = ({ activities, bikes, onClose }) => {
    
    const [stats, setStats] = useState(null);
    const [slideIndex, setSlideIndex] = useState(0);
    const [selectedYear, setSelectedYear] = useState(new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear());
    const [isSharing, setIsSharing] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [transitionDir, setTransitionDir] = useState('right');

    const TOTAL_SLIDES = 16;
    
    // --- FONCTION DE PARTAGE IMAGE ---
    const handleShare = async () => {
        setIsSharing(true);
        // ON CIBLE LE NOUVEAU CONTENEUR CACHÉ
        const element = document.getElementById('export-container');
        
        if (!element) {
            console.error("Élément d'export introuvable");
            setIsSharing(false);
            return;
        }

        try {
            // On rend le conteneur temporairement visible pour la capture
            element.style.display = 'flex';

            const canvas = await html2canvas(element, {
                backgroundColor: '#0a0a10', // Fond noir profond
                scale: 2, // Haute résolution
                logging: false,
                useCORS: true,
                // On force une taille fixe pour éviter le "shrink"
                width: 1080, 
                height: 1350 // Format portrait (type post/story)
            });

            // On recache le conteneur
            element.style.display = 'none';

            canvas.toBlob(async (blob) => {
                const file = new File([blob], `bilan-bikemonitor-${stats.year}.png`, { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                             // ... textes de partage ...
                            files: [file]
                        });
                    } catch (err) { console.log("Partage annulé", err); }
                } else {
                    const link = document.createElement('a');
                    link.download = `bilan-bikemonitor-${stats.year}.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                    // alert("Image téléchargée !"); // Optionnel, peut être gênant sur mobile
                }
                setIsSharing(false);
            }, 'image/png');

        } catch (e) {
            console.error("Erreur génération image", e);
            if (element) element.style.display = 'none'; // Sécurité
            setIsSharing(false);
        }
    };

    // STATS PRO (Moyenne World Tour / Tadej P.)
    const PRO_STATS = { 
        name: "Un Pro World Tour",
        dist: 32000, 
        time: 1100, 
        elev: 450000 
    }; 

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

        // --- 1. TOTAUX (Correction Distance: On somme les mètres puis on convertit) ---
        const totalDistMeters = yearActs.reduce((acc, a) => acc + (a.distance || 0), 0);
        const prevDistMeters = prevYearActs.reduce((acc, a) => acc + (a.distance || 0), 0);

        const totals = {
            dist: Math.round(totalDistMeters / 1000), // Conversion mètres -> km
            elev: Math.round(yearActs.reduce((acc, a) => acc + (a.total_elevation_gain || 0), 0)),
            time: Math.floor(yearActs.reduce((acc, a) => acc + (a.moving_time || 0), 0) / 3600),
            count: yearActs.length
        };

        const prevTotals = {
            dist: Math.round(prevDistMeters / 1000),
            elev: Math.round(prevYearActs.reduce((acc, a) => acc + (a.total_elevation_gain || 0), 0)),
            time: Math.floor(prevYearActs.reduce((acc, a) => acc + (a.moving_time || 0), 0) / 3600),
            count: prevYearActs.length
        };

        // --- 2. LOGIQUE MONUMENTS (TOPS) ---
        const formatKm = (meters) => (meters / 1000).toFixed(1) + ' km';
        
        const topDist = [...yearActs]
            .sort((a,b) => b.distance - a.distance)
            .slice(0, 3)
            .map(a => ({ name: a.name, val: formatKm(a.distance), date: new Date(a.start_date).toLocaleDateString() }));

        const topTime = [...yearActs]
            .sort((a,b) => b.moving_time - a.moving_time)
            .slice(0, 3)
            .map(a => ({ name: a.name, val: (a.moving_time / 3600).toFixed(1) + ' h', date: new Date(a.start_date).toLocaleDateString() }));

        const topElev = [...yearActs]
            .sort((a,b) => b.total_elevation_gain - a.total_elevation_gain)
            .slice(0, 3)
            .map(a => ({ name: a.name, val: Math.round(a.total_elevation_gain) + ' m', date: new Date(a.start_date).toLocaleDateString() }));

        // --- 3. STREAKS ---
        const dates = [...new Set(yearActs.map(a => a.start_date.split('T')[0]))].sort();
        let maxStreak = 0, currentStreak = 0, lastDate = null;
        dates.forEach(date => {
            const d = new Date(date);
            if (!lastDate) currentStreak = 1;
            else {
                const diff = (d - lastDate) / (1000 * 60 * 60 * 24);
                if (diff === 1) currentStreak++; else if (diff > 1) currentStreak = 1;
            }
            if (currentStreak > maxStreak) maxStreak = currentStreak;
            lastDate = d;
        });

        // --- 4. DATA GRAPHIQUES ---
        const monthsDist = new Array(12).fill(0);
        const uniqueDaysPerMonth = Array.from({ length: 12 }, () => new Set());
        const dayOfWeekCount = new Array(7).fill(0);
        
        yearActs.forEach(a => {
            const d = new Date(a.start_date);
            // On ajoute les km (mètres / 1000)
            monthsDist[d.getMonth()] += (a.distance || 0) / 1000; 
            dayOfWeekCount[d.getDay()]++;
            uniqueDaysPerMonth[d.getMonth()].add(d.getDate());
        });
        
        const daysActivePerMonth = uniqueDaysPerMonth.map(s => s.size);
        const mostActiveMonthIdx = monthsDist.indexOf(Math.max(...monthsDist));
        // On cherche le min mais > 0 pour ne pas dire "Janvier" si pas commencé
        const activeMonthsValues = monthsDist.map((v, i) => ({v, i})).filter(o => o.v > 0);
        const leastActiveMonthIdx = activeMonthsValues.length > 0 
            ? activeMonthsValues.sort((a,b) => a.v - b.v)[0].i 
            : 0;

        // --- 5. MAXS ---
        const maxs = {
            speed: Math.max(...yearActs.map(a => (a.external_data?.max_speed || 0) * 3.6)).toFixed(1),
            hr: Math.max(...yearActs.map(a => a.external_data?.max_heartrate || 0)),
            watts: Math.max(...yearActs.map(a => a.external_data?.max_watts || 0)),
            altitude: Math.max(...yearActs.map(a => a.external_data?.elev_high || 0)).toFixed(0)
        };

        // --- 6. EQUIPEMENT ---
        const bikeStats = {};
        yearActs.forEach(a => { 
            if(a.bike_id) bikeStats[a.bike_id] = (bikeStats[a.bike_id] || 0) + ((a.distance || 0) / 1000); 
        });
        const bikeUsage = Object.keys(bikeStats).map(bid => {
            const bike = bikes.find(b => b.id === bid);
            return { name: bike ? bike.name : 'Inconnu', dist: Math.round(bikeStats[bid]) };
        }).sort((a,b) => b.dist - a.dist);

        // FUN STATS
        const randIdx = selectedYear % 3;
        const funComparisons = {
            time: [{ label: "Visionnages de Titanic", val: (totals.time / 3.25).toFixed(1), icon: <FaFilm /> }, { label: "Vols Paris-Tokyo", val: (totals.time / 12).toFixed(1), icon: <FaPlane /> }, { label: "Jours de travail (8h)", val: (totals.time / 8).toFixed(1), icon: <FaStopwatch /> }],
            dist: [{ label: "Traversées de la France", val: (totals.dist / 1000).toFixed(1), icon: <FaRoad /> }, { label: "Tours de France", val: (totals.dist / 3500).toFixed(2), icon: <FaBicycle /> }, { label: "Marathons", val: (totals.dist / 42.195).toFixed(0), icon: <FaRunning /> }],
            elev: [{ label: "Ascensions de l'Everest", val: (totals.elev / 8848).toFixed(1), icon: <FaMountain /> }, { label: "Tours Eiffel", val: (totals.elev / 300).toFixed(0), icon: <span>🗼</span> }, { label: "Sorties dans l'espace (ISS)", val: (totals.elev / 400000).toFixed(4), icon: <span>🛸</span> }]
        };

        setStats({
            year: selectedYear, totals, prevTotals, streak: maxStreak, daysActivePerMonth,
            fun: { time: funComparisons.time[randIdx], dist: funComparisons.dist[randIdx], elev: funComparisons.elev[randIdx], percentYear: ((totals.time / (24*365)) * 100).toFixed(2) },
            tops: { dist: topDist, time: topTime, elev: topElev },
            dayOfWeek: dayOfWeekCount, monthlyDist: monthsDist, mostActiveMonth: mostActiveMonthIdx, leastActiveMonth: leastActiveMonthIdx, equipment: bikeUsage, maxs
        });
    };

    // --- NAVIGATION AVEC TRANSITION ---
    const changeSlideWithTransition = (newIndex, direction) => {
        if (isTransitioning) return; // Anti-spam clic
        
        setTransitionDir(direction); // On définit la direction AVANT de lancer l'anim
        // 1. On lance l'animation
        setIsTransitioning(true);

        // 2. On change la data au milieu de l'animation (quand le cycliste cache l'écran ou passe au milieu)
        setTimeout(() => {
            setSlideIndex(newIndex);
        }, 500); // 400ms = moitié de l'animation de 800ms

        // 3. On reset l'état à la fin
        setTimeout(() => {
            setIsTransitioning(false);
        }, 1000);
    };

    const nextSlide = (e) => {
        e?.stopPropagation();
        if (slideIndex < TOTAL_SLIDES - 1) changeSlideWithTransition(slideIndex + 1, 'right');
        else onClose(); 
    };

    const prevSlide = (e) => {
        e.stopPropagation();
        if (slideIndex > 0) changeSlideWithTransition(slideIndex - 1, 'left');
    };

    // --- VISUELS DE FOND DYNAMIQUES (MIS A JOUR) ---
    const renderBackground = () => {
        let animType = 'default';

        // 0=Intro -> Intro Tunnel
        if (slideIndex === 0) animType = 'intro';

        // 2=Comparaison, 3=Pro, 6=Dist Fun, 11=Dist Mois, 14=Maxs -> Vitesse (Hyperspace)
        if ([2, 3, 6, 11, 14].includes(slideIndex)) animType = 'speed';
        
        // 7=Elev Fun, 8=Monuments -> Ascension (Climb - On garde celui que tu aimes)
        if ([7, 8].includes(slideIndex)) animType = 'climb';

        // 4=Jours, 5=Time Fun, 9=Hebdo, 12=Actif/Chill, 13=Equip -> Tech (Digital Rain)
        if ([4, 5, 9, 12, 13].includes(slideIndex)) animType = 'tech';

        // 10=Streak -> Feu (On garde celui que tu aimes)
        if (slideIndex === 10) animType = 'fire';

        // 1=Overview, 15=Share -> Default (Calme)
        if ([1, 15].includes(slideIndex)) animType = 'default';

        return (
            <div className={`wrapped-bg ${animType}`}>
                <div className="bg-gradient-overlay"></div>
                
                {/* 1. INTRO : TUNNEL */}
                {animType === 'intro' && <div className="intro-tunnel"></div>}

                {/* 2. VITESSE : HYPERSPACE */}
                {animType === 'speed' && (
                    <div className="hyperspace">
                        {/* On génère 8 lignes d'étoiles avec des rotations différentes via CSS */}
                        {[...Array(8)].map((_, i) => <div key={i} className="star-line" style={{'--r': `${i * 45}deg`}}></div>)}
                    </div>
                )}

                {/* 3. CLIMB (Gardé) */}
                {animType === 'climb' && (
                    <div className="climb-particles">
                        {[...Array(20)].map((_, i) => <div key={i} className="tri-particle"></div>)}
                    </div>
                )}

                {/* 4. TECH : DIGITAL RAIN */}
                {animType === 'tech' && (
                    <>
                        <div className="digital-rain"></div>
                        <div className="digital-glitch"></div>
                    </>
                )}

                {/* 5. FIRE (Gardé) */}
                {animType === 'fire' && (
                    <div className="fire-embers">
                        {[...Array(30)].map((_, i) => <div key={i} className="ember"></div>)}
                    </div>
                )}

                {/* DEFAUT */}
                {animType === 'default' && (
                    <>
                        <div className="bg-grid-plane"></div>
                        <div className="bg-particles"></div>
                    </>
                )}
            </div>
        );
    };

    if (stats?.empty) return

    const renderSlide = () => {
        if (!stats) return null;
        const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
        const fullMonths = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
        const animClass = "stagger-entry";
        
        switch (slideIndex) {
            case 0: // INTRO
                return (
                    <div className={`slide-content intro ${animClass}`}>
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
                    <div className={`slide-content overview ${animClass}`}>
                        <h2>Vue d'ensemble</h2>
                        <div className="stat-grid">
                            <div className="stat-box"><span>📏</span><strong>{stats.totals.dist.toLocaleString()} km</strong></div>
                            <div className="stat-box"><span>⏱️</span><strong>{stats.totals.time} h</strong></div>
                            <div className="stat-box"><span>🏔️</span><strong>{stats.totals.elev.toLocaleString()} m</strong></div>
                            <div className="stat-box"><span>🔥</span><strong>{stats.totals.count} sorties</strong></div>
                        </div>
                    </div>
                );
            case 2: // COMPARAISON N-1
                const diffDist = stats.totals.dist - stats.prevTotals.dist;
                return (
                    <div className={`slide-content comparison ${animClass}`}>
                        <h2>Vs {stats.year - 1}</h2>
                        <div className="vs-row">
                            <div className="vs-item">
                                <span className="label">Distance</span>
                                <div className="val">{stats.totals.dist} km</div>
                                <div className={`diff ${diffDist >= 0 ? 'pos' : 'neg'}`}>
                                    {diffDist > 0 ? '+' : ''}{diffDist} km
                                </div>
                            </div>
                        </div>
                        <p className="sub-text">{diffDist > 0 ? "Progression confirmée ! 🚀" : "Moins de bornes, plus de qualité ? 😉"}</p>
                    </div>
                );
            case 3: // VS PRO (CORRIGÉ)
                const pctDist = Math.min(100, (stats.totals.dist / PRO_STATS.dist) * 100);
                const pctElev = Math.min(100, (stats.totals.elev / PRO_STATS.elev) * 100);
                const pctTime = Math.min(100, (stats.totals.time / PRO_STATS.time) * 100);
                
                return (
                    <div className={`slide-content pro-vs ${animClass}`}>
                        <h2>Toi vs {PRO_STATS.name}</h2>
                        <div className="pro-chart-container">
                            {/* Ligne Distance */}
                            <div className="pro-row">
                                <div className="pro-labels">
                                    <span>Toi ({stats.totals.dist}km)</span>
                                    <span>Pro ({PRO_STATS.dist}km)</span>
                                </div>
                                <div className="pro-bar-track">
                                    <div className="pro-bar-fill blue" style={{width: `${pctDist}%`}}></div>
                                </div>
                            </div>
                            
                            {/* Ligne Elevation */}
                            <div className="pro-row">
                                <div className="pro-labels">
                                    <span>Toi ({stats.totals.elev}m)</span>
                                    <span>Pro ({PRO_STATS.elev}m)</span>
                                </div>
                                <div className="pro-bar-track">
                                    <div className="pro-bar-fill purple" style={{width: `${pctElev}%`}}></div>
                                </div>
                            </div>

                            {/* Ligne Temps */}
                            <div className="pro-row">
                                <div className="pro-labels">
                                    <span>Toi ({stats.totals.time}h)</span>
                                    <span>Pro ({PRO_STATS.time}h)</span>
                                </div>
                                <div className="pro-bar-track">
                                    <div className="pro-bar-fill green" style={{width: `${pctTime}%`}}></div>
                                </div>
                            </div>
                        </div>
                        <p className="sub-text" style={{marginTop:'30px'}}>
                            {pctDist > 20 ? "Pas mal du tout ! Tu te défends." : "Ils sont surhumains..."}
                        </p>
                    </div>
                );
            case 4: // JOURS PAR MOIS
                return (
                    <div className={`slide-content graph-slide ${animClass}`}>
                        <h2>Jours actifs / mois</h2>
                        <div className="simple-bar-chart">
                            {stats.daysActivePerMonth.map((val, i) => (
                                <div key={i} className="bar-col">
                                    {/* AJOUT DE LA VALEUR */}
                                    <span className="bar-data-val">{val > 0 ? val : ''}</span>
                                    <div className="bar-val" style={{height: `${(val/31)*100}%`}}></div>
                                    <div className="bar-lbl">{months[i]}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 5: // FUN TIME
                return (
                    <div className={`slide-content ${animClass}`}>
                        <div className="icon-big">{stats.fun.time.icon}</div>
                        <h2>{stats.totals.time} Heures</h2>
                        <p>C'est l'équivalent de</p>
                        <div className="big-stat neon-blue">{stats.fun.time.val}</div>
                        <p>{stats.fun.time.label}</p>
                    </div>
                );
            case 6: // FUN DISTANCE
                return (
                    <div className={`slide-content fun-stat ${animClass}`}>
                        <div className="icon-big">{stats.fun.dist.icon}</div>
                        <h2>{stats.totals.dist.toLocaleString()} Km</h2>
                        <p>Tu as fait</p>
                        <div className="big-stat neon-green">{stats.fun.dist.val}</div>
                        <p>{stats.fun.dist.label}</p>
                    </div>
                );
            case 7: // FUN ELEV
                return (
                    <div className={`slide-content fun-stat ${animClass}`}>
                        <div className="icon-big">{stats.fun.elev.icon}</div>
                        <h2>{stats.totals.elev.toLocaleString()} m D+</h2>
                        <p>Tu as grimpé</p>
                        <div className="big-stat neon-purple">{stats.fun.elev.val}</div>
                        <p>{stats.fun.elev.label}</p>
                    </div>
                );
            case 8: // MONUMENTS (CORRIGÉ 3 COLONNES)
                return (
                    <div className={`slide-content top-list ${animClass}`}>
                        <h2>🏆 Tes Monuments</h2>
                        
                        <div className="monuments-grid">
                            <div className="monument-col">
                                <h3 className="neon-blue"><FaRoad /> Distance</h3>
                                {stats.tops.dist.map((a, i) => (
                                    <div key={i} className="top-item">
                                        <div className="top-val">{a.val}</div>
                                        <div className="top-name">{a.name}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="monument-col">
                                <h3 className="neon-purple"><FaMountain /> Dénivelé</h3>
                                {stats.tops.elev.map((a, i) => (
                                    <div key={i} className="top-item">
                                        <div className="top-val">{a.val}</div>
                                        <div className="top-name">{a.name}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="monument-col">
                                <h3 className="neon-green"><FaStopwatch /> Durée</h3>
                                {stats.tops.time.map((a, i) => (
                                    <div key={i} className="top-item">
                                        <div className="top-val">{a.val}</div>
                                        <div className="top-name">{a.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 9: // REPARTITION HEBDO
                const maxDay = Math.max(...stats.dayOfWeek) || 1; // Eviter division par 0
                return (
                    <div className={`slide-content graph-slide ${animClass}`}>
                        <h2>Rythme Hebdo</h2>
                        <div className="simple-bar-chart">
                            {stats.dayOfWeek.map((val, i) => (
                                <div key={i} className="bar-col">
                                    {/* AJOUT DE LA VALEUR */}
                                    <span className="bar-data-val">{val > 0 ? val : ''}</span>
                                    <div className={`bar-val ${val === maxDay ? 'highlight' : ''}`} style={{height: `${(val/maxDay)*100}%`}}></div>
                                    <div className="bar-lbl">{days[i]}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 10: // STREAK
                return (
                    <div className={`slide-content streak-slide" ${animClass}`}>
                        <FaFire className="slide-icon orange pulse" />
                        <h2>Record de Série</h2>
                        <div className="big-stat neon-orange">{stats.streak}</div>
                        <p>Jours d'affilée</p>
                    </div>
                );
            case 11: // DISTANCE MOIS
                const maxM = Math.max(...stats.monthlyDist) || 1;
                return (
                    <div className={`slide-content graph-slide ${animClass}`}>
                        <h2>Distance / mois</h2>
                        <div className="simple-bar-chart">
                            {stats.monthlyDist.map((val, i) => (
                                <div key={i} className="bar-col">
                                    {/* AJOUT DE LA VALEUR (Arrondie) */}
                                    <span className="bar-data-val">{val > 5 ? Math.round(val) : ''}</span>
                                    <div className="bar-val blue" style={{height: `${(val/maxM)*100}%`}}></div>
                                    <div className="bar-lbl">{months[i]}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 12: // MOIS +/- ACTIF
                return (
                    <div className={`slide-content split-slide ${animClass}`}>
                        <div className="half top">
                            <h3>🔥 Top Mois</h3>
                            <div className="big-text">{fullMonths[stats.mostActiveMonth]}</div>
                            <span>{Math.round(stats.monthlyDist[stats.mostActiveMonth])} km</span>
                        </div>
                        <div className="half bottom">
                            <h3>💤 Mode Chill</h3>
                            <div className="big-text">{fullMonths[stats.leastActiveMonth]}</div>
                            <span>{Math.round(stats.monthlyDist[stats.leastActiveMonth])} km</span>
                        </div>
                    </div>
                );
            case 13: // EQUIPMENT
                return (
                    <div className={`slide-content equipment ${animClass}`}>
                        <h2>Ton Garage</h2>
                        <div className="equip-list">
                            {stats.equipment.map((bike, i) => (
                                <div key={i} className="equip-row">
                                    <div className="bike-info-row">
                                        <span className="bike-name"><FaBicycle/> {bike.name}</span>
                                        <span className="bike-dist">{bike.dist} km</span>
                                    </div>
                                    <div className="bike-bar-container">
                                        <div className="bike-bar" style={{width: `${(bike.dist / stats.totals.dist)*100}%`}}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 14: // MAXS & OUTRO
                return (
                    <div className={`slide-content maxs ${animClass}`}>
                        <h2>Records {stats.year}</h2>
                        <div className="max-grid">
                            <div className="max-item"><small>Vitesse Max</small><strong>{stats.maxs.speed} km/h</strong></div>
                            <div className="max-item"><small>Cardio Max</small><strong>{stats.maxs.hr} bpm</strong></div>
                            <div className="max-item"><small>Puissance Max</small><strong>{stats.maxs.watts} W</strong></div>
                            <div className="max-item"><small>Altitude Max</small><strong>{stats.maxs.altitude} m</strong></div>
                        </div>
                    </div>
                );
            case 15: // RECAP SCREEN (VISUEL ÉCRAN)
                return (
                    <div className={`slide-content share-slide ${animClass}`}>
                        <h2>Ton Bilan {stats.year}</h2>
                        <p className="sub-text" style={{marginBottom:'20px'}}>C'est dans la boîte ! 🎁</p>
                        
                        {/* VISUEL À L'ÉCRAN (Plus petit, juste pour montrer) */}
                        <div className="on-screen-card glass-panel neon-border-pulse">
                            <div style={{transform: 'scale(0.8)', transformOrigin: 'top center'}}>
                                <Logo />
                            </div>
                            <h3>RECAP {stats.year}</h3>
                            <div className="mini-stats-row">
                                <span>{stats.totals.dist.toLocaleString()} km</span> • 
                                <span>{stats.totals.elev.toLocaleString()} m D+</span>
                            </div>
                        </div>

                        <div className="share-actions" style={{marginTop:'30px'}}>
                            <button className="primary-btn wrapped-share-btn" onClick={handleShare} disabled={isSharing}>
                                {isSharing ? 'Création de l\'image...' : <><FaShareAlt /> Partager le visuel HD</>}
                            </button>
                            <button className="secondary-btn" onClick={onClose} style={{marginTop:'10px'}}>Fermer</button>
                        </div>
                         <p className="sub-text" style={{fontSize:'0.8rem', marginTop:'15px', opacity:0.6}}>
                            Génère une image haute qualité au format portrait.
                        </p>
                    </div>
                );
            default: return null;
        }
    };

    if (stats?.empty) return (
        <div className="wrapped-overlay">
            {renderBackground()}
            <div className="wrapped-card glass-panel" style={{textAlign:'center', padding:'40px', zIndex:10}}>
                <h2>Saison {stats.year}</h2>
                <p style={{margin:'20px 0', color:'#ccc'}}>Pas encore de données.</p>
                <button className="primary-btn" onClick={onClose}>Fermer</button>
            </div>
        </div>
    );

    return (
        <div className="wrapped-overlay" onClick={nextSlide}>
            {renderBackground()}
            
            {/* --- TRANSITION CYCLISTE --- */}
            <div className="transition-overlay">
                {/* On applique la classe riding-right ou riding-left selon la direction */}
                <img 
                    src={cyclistImg} 
                    className={`cyclist-sprite ${isTransitioning ? (transitionDir === 'right' ? 'riding-right' : 'riding-left') : ''}`} 
                    alt="cyclist"
                    style={{filter: 'brightness(0)'}} 
                />
            </div>

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

            {/* ================================================================== */}
            {/* --- CONTENEUR CACHÉ POUR L'EXPORT HD (OFF-SCREEN RENDER) --- */}
            {/* ================================================================== */}
            {stats && (
                <div id="export-container" style={{display: 'none'}}> 
                    <div className="export-bg-overlay"></div>
                    
                    <div className="export-header">
                        <div style={{transform:'scale(2)', transformOrigin:'left center'}}>
                            <Logo />
                        </div>
                        <span className="export-year">{stats.year}</span>
                    </div>

                    <div className="export-main-stats">
                        <div className="e-row">
                            <div className="e-stat">
                                <span className="e-lbl">DISTANCE</span>
                                <div>
                                    <span className="e-val neon-blue">{stats.totals.dist.toLocaleString()}</span>
                                    <span className="e-unit neon-blue">km</span>
                                </div>
                            </div>
                        </div>
                        <div className="e-row">
                            <div className="e-stat">
                                <span className="e-lbl">DÉNIVELÉ</span>
                                <div>
                                    <span className="e-val neon-purple">{stats.totals.elev.toLocaleString()}</span>
                                    <span className="e-unit neon-purple">m</span>
                                </div>
                            </div>
                        </div>
                        <div className="e-row">
                            <div className="e-stat">
                                <span className="e-lbl">HEURES</span>
                                <div>
                                    <span className="e-val neon-green">{stats.totals.time}</span>
                                    <span className="e-unit neon-green">h</span>
                                </div>
                            </div>
                            <div className="e-stat">
                                <span className="e-lbl">SORTIES</span>
                                <span className="e-val neon-orange">{stats.totals.count}</span>
                            </div>
                        </div>
                    </div>

                    <div className="export-fun-stats">
                        <div className="e-fun-line">
                            <span>{stats.fun.dist.val} x</span>
                            <span>{stats.fun.dist.label}</span>
                            <span style={{fontSize:'3rem'}}>{stats.fun.dist.icon}</span>
                        </div>
                        <div className="e-fun-line streak">
                            <FaFire style={{color:'#f97316', fontSize:'3rem'}} />
                            <span>{stats.streak} jours de suite !</span>
                        </div>
                    </div>

                    <div className="export-footer">
                        BIKEMONITOR // WRAPPED
                    </div>
                </div>
            )}
            {/* ================================================================== */}

        </div>
    );
};

export default YearWrapped;