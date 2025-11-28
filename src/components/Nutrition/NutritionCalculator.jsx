import React, { useState, useEffect } from 'react';
import { 
    FaCalculator, FaBolt, FaMountain, FaThermometerHalf, FaStopwatch, 
    FaTint, FaCookieBite, FaChevronDown, FaChevronUp, FaLayerGroup, FaHamburger 
} from 'react-icons/fa';
import { authService } from '../../services/api';
import './NutritionCalculator.css';

const NutritionCalculator = ({ inventory, onConsume }) => {
    // Données Pilote
    const [profile, setProfile] = useState(null);
    
    // Paramètres Sortie
    const [duration, setDuration] = useState(2.5);
    const [intensity, setIntensity] = useState('Z2');
    const [elevation, setElevation] = useState(500);
    const [temp, setTemp] = useState(20);

    // Préférences Nutrition (NOUVEAU)
    const [wantDiversity, setWantDiversity] = useState(true);
    const [texturePref, setTexturePref] = useState(50); // 0 = Tout Solide, 100 = Tout Gel/Liquide

    // Résultats
    const [result, setResult] = useState(null);
    const [showTimeline, setShowTimeline] = useState(false); // Accordéon Timeline

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const data = await authService.getMyProfile();
        setProfile(data);
    };

    const calculateStrategy = () => {
        // 1. Calcul des besoins (inchangé)
        const ftp = profile?.ftp || 200;
        
        const zones = {
            'Z1': { pct: 0.55, carbRatio: 0.2 },
            'Z2': { pct: 0.70, carbRatio: 0.4 },
            'Z3': { pct: 0.85, carbRatio: 0.7 },
            'Z4': { pct: 1.00, carbRatio: 1.0 },
            'Z5': { pct: 1.20, carbRatio: 1.0 }
        };
        const zoneData = zones[intensity];
        const avgPower = ftp * zoneData.pct;
        let totalKcal = (avgPower * (duration * 3600)) / 1000;
        totalKcal += (elevation / 500) * 50;
        if (temp < 10) totalKcal *= 1.10;

        let totalCarbsNeeded = (totalKcal * zoneData.carbRatio) / 4;
        const maxAbsorbable = 90 * duration; 
        let recommendedCarbs = Math.min(totalCarbsNeeded, maxAbsorbable);
        if (recommendedCarbs < (60 * duration) && intensity !== 'Z1') recommendedCarbs = 60 * duration;

        let watermlPerHour = 500;
        if (temp > 20) watermlPerHour = 750;
        if (temp > 28) watermlPerHour = 1000;
        const totalWater = (watermlPerHour * duration) / 1000;

        // 2. Sélection Intelligente (NOUVEAU ALGO)
        const selection = generateLoadout(recommendedCarbs, inventory);
        
        // 3. Génération Timeline (NOUVEAU)
        const timeline = generateTimeline(selection.items, duration);

        setResult({
            kCal: Math.round(totalKcal),
            carbs: Math.round(recommendedCarbs),
            water: totalWater.toFixed(1),
            items: selection.items,
            coveredCarbs: Math.round(selection.covered),
            carbsPerHour: Math.round(recommendedCarbs / duration),
            timeline: timeline
        });
        setShowTimeline(true); // Ouvrir la timeline auto
    };

    // ALGO DE SÉLECTION AVANCÉ
    const generateLoadout = (targetCarbs, stock) => {
        let remaining = targetCarbs;
        let selection = [];
        
        // On score chaque item selon la préférence utilisateur
        // texturePref : 0 (Barres) <-> 100 (Gels)
        const scoredItems = stock.filter(i => i.quantity > 0 && i.carbs > 0).map(item => {
            let score = item.carbs; // Base score = apport énergétique
            
            const isLiquid = ['gel', 'drink', 'compote'].includes(item.category_type);
            
            // Bonus selon préférence
            if (isLiquid) {
                score += (texturePref - 50); // Si pref=100 (Gel), bonus +50. Si pref=0, malus -50
            } else {
                score += (50 - texturePref); // Si pref=0 (Barre), bonus +50
            }
            
            return { ...item, score };
        });

        // On trie par score décroissant
        scoredItems.sort((a, b) => b.score - a.score);

        // On remplit les poches
        const pickedCounts = {}; // Pour gérer la diversité

        while (remaining > 10) {
            // On cherche le meilleur item candidat
            // Si diversité activée, on pénalise les items déjà pris
            let bestCandidate = null;
            let bestScore = -Infinity;

            for (const item of scoredItems) {
                // Si plus de stock pour cet item, on passe
                const alreadyPicked = pickedCounts[item.id] || 0;
                if (alreadyPicked >= item.quantity) continue;

                let currentScore = item.score;
                // Malus diversité : chaque exemplaire pris réduit le score du prochain
                if (wantDiversity) {
                    currentScore -= (alreadyPicked * 20); 
                }

                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    bestCandidate = item;
                }
            }

            if (!bestCandidate) break; // Plus rien en stock intéressant

            // On ajoute l'item
            const existingEntry = selection.find(s => s.id === bestCandidate.id);
            if (existingEntry) {
                existingEntry.count++;
            } else {
                selection.push({ ...bestCandidate, count: 1 });
            }

            pickedCounts[bestCandidate.id] = (pickedCounts[bestCandidate.id] || 0) + 1;
            remaining -= bestCandidate.carbs;
        }

        return { items: selection, covered: targetCarbs - remaining };
    };

    // ALGO TIMELINE
    const generateTimeline = (items, durationHours) => {
        // On "déplie" la liste (x2 barres devient [Barre, Barre])
        let flatList = [];
        items.forEach(i => {
            for(let n=0; n<i.count; n++) flatList.push(i);
        });

        // Tri intelligent : Solides d'abord (digestion lente), Liquides/Gels à la fin (coup de fouet)
        flatList.sort((a, b) => {
            const isLiquidA = ['gel', 'drink', 'compote'].includes(a.category_type) ? 1 : 0;
            const isLiquidB = ['gel', 'drink', 'compote'].includes(b.category_type) ? 1 : 0;
            return isLiquidA - isLiquidB; // 0 (Solide) avant 1 (Liquide)
        });

        // Répartition temporelle
        const steps = flatList.length;
        const timeline = [];
        if (steps === 0) return [];

        // On étale les prises alimentaires
        // Ex: 3 items sur 3h -> T+45min, T+90min, T+135min
        const interval = (durationHours * 60) / (steps + 1);

        flatList.forEach((item, index) => {
            const minutes = Math.round((index + 1) * interval);
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            timeline.push({
                time: `${h}h${m < 10 ? '0' : ''}${m}`,
                item: item
            });
        });

        return timeline;
    };

    return (
        <div className="calculator-container glass-panel">
            <div className="calculator-header">
                <h2><FaCalculator /> Stratège Nutrition</h2>
                {profile && <span className="profile-badge">FTP {profile.ftp}w</span>}
            </div>

            <div className="calc-inputs">
                {/* Inputs existants (Durée, Intensité...) */}
                <div className="input-group">
                    <label><FaStopwatch /> Durée (h)</label>
                    <input type="number" step="0.5" value={duration} onChange={e => setDuration(parseFloat(e.target.value))} />
                </div>
                <div className="input-group">
                    <label><FaBolt /> Intensité</label>
                    <select value={intensity} onChange={e => setIntensity(e.target.value)} className="neon-select">
                        <option value="Z1">Z1 - Récup</option>
                        <option value="Z2">Z2 - Endurance</option>
                        <option value="Z3">Z3 - Tempo</option>
                        <option value="Z4">Z4 - Seuil</option>
                        <option value="Z5">Z5 - Course</option>
                    </select>
                </div>
                <div className="input-group"><label><FaMountain /> D+ (m)</label><input type="number" step="100" value={elevation} onChange={e => setElevation(parseInt(e.target.value))} /></div>
                <div className="input-group"><label><FaThermometerHalf /> Temp. (°C)</label><input type="number" value={temp} onChange={e => setTemp(parseInt(e.target.value))} /></div>
            </div>

            {/* --- NOUVELLES OPTIONS DE PRÉFÉRENCE --- */}
            <div className="pref-row">
                <div className="input-group slider-pref">
                    <label style={{justifyContent:'space-between'}}>
                        <span><FaHamburger/> Solide</span>
                        <span><FaTint/> Liquide</span>
                    </label>
                    <input 
                        type="range" min="0" max="100" 
                        value={texturePref} onChange={e => setTexturePref(parseInt(e.target.value))} 
                        className="pref-slider"
                    />
                </div>
                <div className="input-group toggle-pref">
                    <label>Diversité</label>
                    <button 
                        className={`toggle-btn ${wantDiversity ? 'active' : ''}`}
                        onClick={() => setWantDiversity(!wantDiversity)}
                    >
                        <FaLayerGroup /> {wantDiversity ? 'Varié' : 'Simple'}
                    </button>
                </div>
            </div>

            <button className="calc-main-btn" onClick={calculateStrategy}>Générer le plan</button>

            {result && (
                <div className="calc-results-panel">
                    <div className="kpi-strip">
                        <div className="kpi-mini"><span className="val">{result.kCal}</span><span className="lbl">kCal</span></div>
                        <div className="kpi-mini"><span className="val">{result.carbs}g</span><span className="lbl">Glucides</span></div>
                        <div className="kpi-mini highlight"><span className="val">{result.carbsPerHour}</span><span className="lbl">g/h</span></div>
                        <div className="kpi-mini"><span className="val">{result.water}L</span><span className="lbl">Eau</span></div>
                    </div>

                    <div className="loadout-list">
                        <h4>🎒 Dans tes poches :</h4>
                        {result.items.map(item => (
                            <div key={item.id} className="loadout-item">
                                <div className="loadout-qty">x{item.count}</div>
                                <div className="loadout-info"><span>{item.name}</span><small>{item.brand}</small></div>
                                <div className="loadout-icon">{item.category_type === 'gel' || item.category_type === 'drink' ? <FaTint/> : <FaCookieBite/>}</div>
                            </div>
                        ))}
                        {result.items.length === 0 && <p className="empty-msg">Stock insuffisant.</p>}
                    </div>

                    {/* --- TIMELINE DÉPLIABLE --- */}
                    {result.timeline.length > 0 && (
                        <div className="timeline-section">
                            <button className="timeline-toggle" onClick={() => setShowTimeline(!showTimeline)}>
                                {showTimeline ? <FaChevronUp /> : <FaChevronDown />} Planning Nutrition
                            </button>
                            
                            {showTimeline && (
                                <div className="timeline-container">
                                    {result.timeline.map((step, i) => (
                                        <div key={i} className="timeline-step">
                                            <div className="step-time">{step.time}</div>
                                            <div className="step-marker"></div>
                                            <div className="step-content glass-panel">
                                                <strong>Manger : </strong> {step.item.name}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="timeline-step end">
                                        <div className="step-time">FIN</div>
                                        <div className="step-marker"></div>
                                        <div className="step-content glass-panel">Boisson Récup + Repas</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NutritionCalculator;