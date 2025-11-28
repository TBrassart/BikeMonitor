import React, { useState, useEffect } from 'react';
import { FaCalculator, FaBolt, FaMountain, FaThermometerHalf, FaStopwatch, FaShoppingBasket, FaTint, FaCookieBite } from 'react-icons/fa';
import { authService } from '../../services/api';
import './NutritionCalculator.css';

const NutritionCalculator = ({ inventory, onConsume }) => {
    // Données Pilote
    const [profile, setProfile] = useState(null);
    
    // Paramètres Sortie
    const [duration, setDuration] = useState(2.5); // Heures
    const [intensity, setIntensity] = useState('Z2'); // Z1..Z5
    const [elevation, setElevation] = useState(500); // m D+
    const [temp, setTemp] = useState(20); // °C

    const [result, setResult] = useState(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const data = await authService.getMyProfile();
        setProfile(data);
    };

    const calculateStrategy = () => {
        // --- 1. CONSTANTES PHYSIOLOGIQUES ---
        const ftp = profile?.ftp || 200; // Valeur par défaut si pas de profil
        const weight = profile?.weight || 70;
        
        // Facteurs d'intensité (% de FTP et % de Glucides requis)
        const zones = {
            'Z1': { pct: 0.55, carbRatio: 0.2, label: 'Récupération' },
            'Z2': { pct: 0.70, carbRatio: 0.4, label: 'Endurance' },
            'Z3': { pct: 0.85, carbRatio: 0.7, label: 'Tempo' },
            'Z4': { pct: 1.00, carbRatio: 1.0, label: 'Seuil' },
            'Z5': { pct: 1.20, carbRatio: 1.0, label: 'VO2 Max' } // Au-delà de Z4, c'est 100% glucides
        };

        const zoneData = zones[intensity];
        
        // --- 2. CALCUL ÉNERGÉTIQUE (MOTEUR) ---
        // Puissance moyenne estimée (Watts)
        const avgPower = ftp * zoneData.pct;
        
        // Énergie Mécanique (kJ) = Power (W) * Time (s) / 1000
        // En vélo, on considère que 1 kJ mécanique ≈ 1 kCal métabolique (Rendement ~24%)
        let totalKcal = (avgPower * (duration * 3600)) / 1000;

        // --- 3. AJUSTEMENTS ENVIRONNEMENTAUX ---
        
        // Facteur Dénivelé : Monter consomme plus (effort non linéaire)
        // Bonus arbitraire : +50 kCal par 500m D+
        totalKcal += (elevation / 500) * 50;

        // Facteur Froid : Le corps brûle pour se chauffer si < 10°C
        if (temp < 10) totalKcal *= 1.10; // +10%

        // --- 4. BESOINS EN GLUCIDES (CARBS) ---
        // Grammes de glucides nécessaires = (Total kCal * Ratio Glucides de la zone) / 4 kcal/g
        let totalCarbsNeeded = (totalKcal * zoneData.carbRatio) / 4;

        // Plafond d'absorption humaine (max 90g/h pour un athlète entraîné, on vise 60-80g pour la sécurité)
        const maxAbsorbable = 90 * duration; 
        const safeTarget = 60 * duration;
        
        // On lisse la recommandation
        let recommendedCarbs = Math.min(totalCarbsNeeded, maxAbsorbable);
        if (recommendedCarbs < safeTarget && intensity !== 'Z1') recommendedCarbs = safeTarget; // Minimum syndical

        // --- 5. HYDRATATION ---
        // Base : 500ml/h
        let watermlPerHour = 500;
        if (temp > 20) watermlPerHour = 750;
        if (temp > 28) watermlPerHour = 1000;
        
        const totalWater = (watermlPerHour * duration) / 1000; // En Litres

        // --- 6. SELECTION INTELLIGENTE DU STOCK ---
        const suggestion = generateLoadout(recommendedCarbs, inventory);

        setResult({
            kCal: Math.round(totalKcal),
            carbs: Math.round(recommendedCarbs),
            water: totalWater.toFixed(1),
            items: suggestion.items,
            coveredCarbs: Math.round(suggestion.covered),
            carbsPerHour: Math.round(recommendedCarbs / duration)
        });
    };

    // Algorithme glouton pour remplir les poches
    const generateLoadout = (targetCarbs, stock) => {
        let remaining = targetCarbs;
        let selection = [];
        
        // On privilégie les produits qui périment ou stock élevé
        // On filtre ce qui a des glucides
        const available = [...stock]
            .filter(i => i.quantity > 0 && i.carbs > 0)
            .sort((a, b) => b.carbs - a.carbs); // On prend les plus gros apports d'abord

        for (const item of available) {
            if (remaining <= 0) break;
            // Combien on peut en prendre (max stock)
            let count = 0;
            while (count < item.quantity && remaining > 0) {
                // Si l'item est trop gros pour le reste (ex: reste 5g, item fait 40g), on le prend quand même si on est loin du compte
                if (remaining < 10 && item.carbs > 20) break; 
                
                remaining -= item.carbs;
                count++;
            }
            if (count > 0) {
                selection.push({ ...item, count });
            }
        }
        return { items: selection, covered: targetCarbs - remaining };
    };

    const handleValidate = async () => {
        if (!result || !onConsume) return;
        // On décrémente le stock pour chaque item
        for (const item of result.items) {
             // Appel à la fonction de mise à jour (stock - item.count)
             // Note: Idéalement on ferait un batch update, ici on boucle
             // On utilise une fonction passée en props ou directement le service
             // Pour simplifier ici, on suppose que le parent gère ou on appelle le service
        }
        // TODO: Connecter à la fonction de décrémentation réelle
        alert("Fonctionnalité 'Manger' à connecter au prochain tour !");
    };

    return (
        <div className="calculator-container glass-panel">
            <div className="calculator-header">
                <h2><FaCalculator /> Stratège Nutrition</h2>
                {profile && <span className="profile-badge">Pilote : {profile.weight}kg • FTP {profile.ftp}w</span>}
            </div>

            <div className="calc-inputs">
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

                <div className="input-group">
                    <label><FaMountain /> D+ (m)</label>
                    <input type="number" step="100" value={elevation} onChange={e => setElevation(parseInt(e.target.value))} />
                </div>

                <div className="input-group">
                    <label><FaThermometerHalf /> Temp. (°C)</label>
                    <input type="number" value={temp} onChange={e => setTemp(parseInt(e.target.value))} />
                </div>
            </div>

            <button className="calc-main-btn" onClick={calculateStrategy}>
                Générer le plan
            </button>

            {result && (
                <div className="calc-results-panel">
                    <div className="kpi-strip">
                        <div className="kpi-mini">
                            <span className="val">{result.kCal}</span>
                            <span className="lbl">kCal</span>
                        </div>
                        <div className="kpi-mini">
                            <span className="val">{result.carbs}g</span>
                            <span className="lbl">Glucides</span>
                        </div>
                        <div className="kpi-mini highlight">
                            <span className="val">{result.carbsPerHour}</span>
                            <span className="lbl">g/h</span>
                        </div>
                        <div className="kpi-mini">
                            <span className="val">{result.water}L</span>
                            <span className="lbl">Eau</span>
                        </div>
                    </div>

                    <div className="loadout-list">
                        <h4>🎒 Dans tes poches :</h4>
                        {result.items.length === 0 ? (
                            <p className="empty-msg">Stock insuffisant ! Il te manque {result.carbs}g de glucides.</p>
                        ) : (
                            result.items.map(item => (
                                <div key={item.id} className="loadout-item">
                                    <div className="loadout-qty">x{item.count}</div>
                                    <div className="loadout-info">
                                        <span>{item.name}</span>
                                        <small>{item.brand}</small>
                                    </div>
                                    <div className="loadout-icon">
                                        {item.category_type === 'gel' || item.category_type === 'drink' ? <FaTint/> : <FaCookieBite/>}
                                    </div>
                                </div>
                            ))
                        )}
                        {result.coveredCarbs < result.carbs && (
                            <div className="warning-msg">⚠️ Stock incomplet. Manque {result.carbs - result.coveredCarbs}g.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NutritionCalculator;