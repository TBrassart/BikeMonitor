import React, { useState, useEffect } from 'react';
import { authService, bikeService } from '../../services/api';
import './TirePressureTab.css';

function TirePressureTab({ bikeId, bikeWeight }) {
    // États pour le calcul
    const [riderWeight, setRiderWeight] = useState(70); // Poids par défaut
    const [tireWidth, setTireWidth] = useState(28);
    const [isTubeless, setIsTubeless] = useState(true);
    const [condition, setCondition] = useState('dry'); // 'dry', 'wet'
    
    // Résultats
    const [pressure, setPressure] = useState({ front: 0, rear: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    // Chargement des préférences utilisateur et vélo
    const loadData = async () => {
        try {
            // 1. Récupérer le poids du cycliste depuis son profil
            const profile = await authService.getMyProfile();
            if (profile && profile.weight) {
                setRiderWeight(profile.weight);
            }

            // 2. Récupérer les réglages sauvegardés du vélo (si existent)
            const bike = await bikeService.getById(bikeId);
            if (bike.tire_settings) {
                const s = bike.tire_settings;
                if (s.tireWidth) setTireWidth(s.tireWidth);
                if (s.isTubeless !== undefined) setIsTubeless(s.isTubeless);
            }
        } catch (e) {
            console.error("Erreur chargement pression:", e);
        } finally {
            setLoading(false);
        }
    };

    // Calcul automatique à chaque changement
    useEffect(() => {
        calculatePressure();
    }, [riderWeight, tireWidth, isTubeless, condition, bikeWeight]);

    const calculatePressure = () => {
        // Formule simplifiée "Silca-like" pour l'exemple
        const totalWeightKg = parseFloat(riderWeight) + (parseFloat(bikeWeight) || 8);
        
        let basePressure = 0;

        // Base très approximative (à affiner selon algo réel)
        if (tireWidth <= 25) basePressure = totalWeightKg * 0.09;
        else if (tireWidth <= 28) basePressure = totalWeightKg * 0.075;
        else if (tireWidth <= 32) basePressure = totalWeightKg * 0.06;
        else basePressure = totalWeightKg * 0.045;

        // Ajustement Tubeless
        if (isTubeless) basePressure *= 0.85; // -15%

        // Ajustement Pluie
        if (condition === 'wet') basePressure *= 0.90; // -10%

        // Répartition AV/AR (45% / 55%)
        setPressure({
            front: (basePressure * 0.95).toFixed(1),
            rear: (basePressure * 1.05).toFixed(1)
        });
    };

    const saveSettings = async () => {
        try {
            await bikeService.update(bikeId, {
                tire_settings: {
                    tireWidth,
                    isTubeless
                }
            });
            alert("Réglages sauvegardés pour ce vélo !");
        } catch (e) {
            console.error("Erreur sauvegarde:", e);
        }
    };

    if (loading) return <div>Chargement du calculateur...</div>;

    return (
        <div className="tire-tab">
            <div className="calculator-card">
                <h3>Calculateur de Pression</h3>
                
                <div className="inputs-grid">
                    <div className="input-group">
                        <label>Poids Cycliste (kg)</label>
                        <input 
                            type="number" 
                            value={riderWeight} 
                            onChange={e => setRiderWeight(e.target.value)} 
                        />
                    </div>
                    
                    <div className="input-group">
                        <label>Largeur Pneu (mm)</label>
                        <select value={tireWidth} onChange={e => setTireWidth(Number(e.target.value))}>
                            <option value={23}>23mm</option>
                            <option value={25}>25mm</option>
                            <option value={28}>28mm</option>
                            <option value={30}>30mm</option>
                            <option value={32}>32mm</option>
                            <option value={35}>35mm</option>
                            <option value={40}>40mm</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Montage</label>
                        <div className="toggle-container">
                            <button 
                                className={`toggle-btn ${!isTubeless ? 'active' : ''}`}
                                onClick={() => setIsTubeless(false)}
                            >
                                Chambre
                            </button>
                            <button 
                                className={`toggle-btn ${isTubeless ? 'active' : ''}`}
                                onClick={() => setIsTubeless(true)}
                            >
                                Tubeless
                            </button>
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Conditions</label>
                        <div className="toggle-container">
                            <button 
                                className={`toggle-btn ${condition === 'dry' ? 'active' : ''}`}
                                onClick={() => setCondition('dry')}
                            >
                                Sec ☀️
                            </button>
                            <button 
                                className={`toggle-btn ${condition === 'wet' ? 'active' : ''}`}
                                onClick={() => setCondition('wet')}
                            >
                                Pluie 🌧️
                            </button>
                        </div>
                    </div>
                </div>

                <div className="results-display">
                    <div className="pressure-box">
                        <span className="label">Avant</span>
                        <span className="value">{pressure.front}</span>
                        <span className="unit">bar</span>
                    </div>
                    <div className="pressure-box">
                        <span className="label">Arrière</span>
                        <span className="value">{pressure.rear}</span>
                        <span className="unit">bar</span>
                    </div>
                </div>

                <button className="save-settings-btn" onClick={saveSettings}>
                    Sauvegarder ces pneus pour ce vélo
                </button>
            </div>
        </div>
    );
}

export default TirePressureTab;