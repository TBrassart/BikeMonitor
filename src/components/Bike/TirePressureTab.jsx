import React, { useState, useEffect } from 'react';
import { FaTachometerAlt, FaWeight, FaTint, FaSave, FaCheckCircle, FaBicycle, FaUser } from 'react-icons/fa';
import { bikeService, authService } from '../../services/api';
import { supabase } from '../../supabaseClient';
import './TirePressureTab.css';

const conditions = [
    { key: 'dry', label: 'Sec ☀️' },
    { key: 'mixed', label: 'Mixte ⛅' },
    { key: 'wet', label: 'Pluie 🌧️' },
];

const TirePressureTab = ({ bikeId }) => {
    const [isLoading, setIsLoading] = useState(true);
    
    // Données contextuelles
    const [bikeWeight, setBikeWeight] = useState(8); // Défaut 8kg
    const [riderWeight, setRiderWeight] = useState(75); // Défaut 75kg
    
    const [settings, setSettings] = useState({
        tireWidth: 25, 
        tireType: 'tubeless', 
        condition: 'dry'
    });

    const [pressure, setPressure] = useState(null);

    // 1. CHARGEMENT DES DONNÉES (Vélo + Profil)
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // A. Récupérer le vélo (Poids + Réglages mémorisés)
                const { data: bike } = await supabase
                    .from('bikes')
                    .select('weight, tire_settings')
                    .eq('id', bikeId)
                    .single();
                
                if (bike) {
                    setBikeWeight(bike.weight || 9); // Fallback 9kg
                    // Si des réglages existent, on les applique
                    if (bike.tire_settings) {
                        setSettings(prev => ({
                            ...prev,
                            tireWidth: bike.tire_settings.width || 25,
                            tireType: bike.tire_settings.type || 'tubeless'
                        }));
                    }
                }

                // B. Récupérer le profil utilisateur (Poids du cycliste)
                // Note: Idéalement on récupère le profil courant via props, ici on simule ou on fetch
                const { data: { user } } = await supabase.auth.getUser();
                // Pour l'instant, on utilise une valeur par défaut ou stockée dans le profil
                // (À améliorer si tu as stocké le poids dans family_members)
                
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [bikeId]);

    // 2. CALCULATEUR (Logique Frank Berto simplifiée)
    useEffect(() => {
        if (!riderWeight || !bikeWeight || !settings.tireWidth) return;

        const totalWeightKg = Number(riderWeight) + Number(bikeWeight) + 2; // +2kg équipement (chaussures/casque/bidons)
        
        // Répartition théorique (45% AV / 55% AR)
        const weightFront = totalWeightKg * 0.45;
        const weightRear = totalWeightKg * 0.55;

        // Formule approximative "Drop 15%" convertie
        // Pression (PSI) = (PoidsRoue (lbs) / (Largeur (mm)^1.5)) * Facteur
        // Simplification linéaire pour l'app :
        let baseFrontPSI = (weightFront * 2.2) / Math.pow(settings.tireWidth/25, 1.2);
        let baseRearPSI = (weightRear * 2.2) / Math.pow(settings.tireWidth/25, 1.2);

        // Ajustement Tubeless (-10%)
        if (settings.tireType === 'tubeless') {
            baseFrontPSI *= 0.9;
            baseRearPSI *= 0.9;
        }

        // Ajustement Météo
        if (settings.condition === 'wet') {
            baseFrontPSI -= 5; 
            baseRearPSI -= 5;
        } else if (settings.condition === 'mixed') {
            baseFrontPSI -= 3;
            baseRearPSI -= 3;
        }

        setPressure({
            frontBAR: (baseFrontPSI / 14.5).toFixed(2),
            rearBAR: (baseRearPSI / 14.5).toFixed(2),
            frontPSI: Math.round(baseFrontPSI),
            rearPSI: Math.round(baseRearPSI)
        });

    }, [settings, bikeWeight, riderWeight]);

    // 3. SAUVEGARDE DES PRÉFÉRENCES
    const handleSaveSettings = async () => {
        try {
            await supabase
                .from('bikes')
                .update({
                    tire_settings: {
                        width: settings.tireWidth,
                        type: settings.tireType
                    }
                })
                .eq('id', bikeId);
            alert("Réglages pneus sauvegardés pour ce vélo !");
        } catch (e) {
            alert("Erreur sauvegarde");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    if (isLoading) return <div className="pressure-tab-container">Chargement...</div>;

    return (
        <div className="pressure-tab-container">
            {/* SECTION 1 : POIDS TOTAL (Info cruciale) */}
            <div className="weight-summary-card">
                <h3><FaWeight /> Poids Total Système</h3>
                <div className="weight-inputs">
                    <div className="weight-group">
                        <label><FaUser /> Cycliste (kg)</label>
                        <input 
                            type="number" 
                            value={riderWeight} 
                            onChange={(e) => setRiderWeight(e.target.value)} 
                        />
                    </div>
                    <span className="plus-sign">+</span>
                    <div className="weight-group">
                        <label><FaBicycle /> Vélo (kg)</label>
                        <input 
                            type="number" 
                            value={bikeWeight} 
                            onChange={(e) => setBikeWeight(e.target.value)} 
                        />
                    </div>
                    <span className="equal-sign">=</span>
                    <div className="total-weight">
                        <strong>{Number(riderWeight) + Number(bikeWeight) + 2}</strong> kg
                        <small>(avec équipement)</small>
                    </div>
                </div>
            </div>

            {/* SECTION 2 : PARAMÈTRES PNEUS */}
            <section className="form-section">
                <h3>Configuration Pneus</h3>
                <div className="input-group">
                    <label>Largeur (mm)</label>
                    <input 
                        type="number" 
                        name="tireWidth"
                        value={settings.tireWidth} 
                        onChange={handleChange} 
                    />
                </div>
                <div className="input-group">
                    <label>Montage</label>
                    <select name="tireType" value={settings.tireType} onChange={handleChange}>
                        <option value="tubeless">Tubeless</option>
                        <option value="tube">Chambre à air</option>
                        <option value="tubular">Boyau</option>
                    </select>
                </div>
            </section>

            {/* SECTION 3 : CONDITIONS */}
            <section className="condition-section">
                <h3><FaTint /> Météo du jour</h3>
                <div className="condition-chips">
                    {conditions.map(c => (
                        <button
                            key={c.key}
                            className={`chip ${settings.condition === c.key ? 'active' : ''}`}
                            onClick={() => setSettings({...settings, condition: c.key})}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* RÉSULTAT */}
            {pressure && (
                <section className="result-section">
                    <h3><FaTachometerAlt /> Pression Conseillée</h3>
                    <div className="pressure-display">
                        <div className="pressure-box">
                            <span className="wheel-label">AVANT</span>
                            <span className="value-bar">{pressure.frontBAR} <small>bar</small></span>
                            <span className="value-psi">{pressure.frontPSI} psi</span>
                        </div>
                        <div className="pressure-box">
                            <span className="wheel-label">ARRIÈRE</span>
                            <span className="value-bar">{pressure.rearBAR} <small>bar</small></span>
                            <span className="value-psi">{pressure.rearPSI} psi</span>
                        </div>
                    </div>
                </section>
            )}

            <div className="actions-row">
                <button className="cta-secondary" onClick={handleSaveSettings}>
                    <FaSave /> Mémoriser réglages
                </button>
                <button className="cta-apply">
                    <FaCheckCircle /> Valider pour la sortie
                </button>
            </div>
        </div>
    );
};

export default TirePressureTab;