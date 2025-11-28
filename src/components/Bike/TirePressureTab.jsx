import React, { useState, useEffect } from 'react';
import { bikeService, authService } from '../../services/api';
import { FaSave, FaTrash, FaSnowflake, FaSun, FaCloudRain } from 'react-icons/fa';
import './TirePressureTab.css';

function TirePressureTab({ bikeId, bikeWeight }) {
    const [riderWeight, setRiderWeight] = useState(70);
    const [configs, setConfigs] = useState({}); // Objet { "NomProfil": { ...data } }
    const [currentProfileName, setCurrentProfileName] = useState('Défaut');
    
    // Valeurs courantes
    const [tireWidth, setTireWidth] = useState(28);
    const [isTubeless, setIsTubeless] = useState(true);
    const [condition, setCondition] = useState('dry'); 
    const [pressure, setPressure] = useState({ front: 0, rear: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [profile, bike] = await Promise.all([
            authService.getMyProfile(),
            bikeService.getById(bikeId)
        ]);
        if (profile?.weight) setRiderWeight(profile.weight);
        
        // Chargement des configs existantes
        if (bike?.tire_settings && Object.keys(bike.tire_settings).length > 0) {
            // Si c'est l'ancien format (plat), on le migre vers le nouveau format objet
            if (bike.tire_settings.tireWidth) {
                setConfigs({ "Défaut": bike.tire_settings });
            } else {
                setConfigs(bike.tire_settings);
            }
        } else {
            setConfigs({ "Défaut": { tireWidth: 28, isTubeless: true, condition: 'dry' } });
        }
    };

    // Quand on change de profil dans le select
    const switchProfile = (name) => {
        setCurrentProfileName(name);
        const cfg = configs[name];
        if (cfg) {
            setTireWidth(cfg.tireWidth);
            setIsTubeless(cfg.isTubeless);
            setCondition(cfg.condition);
        }
    };

    // Sauvegarder la config actuelle
    const saveCurrentConfig = async () => {
        const name = prompt("Nom de la configuration (ex: Hiver, Course) :", currentProfileName);
        if (!name) return;

        const newConfigs = {
            ...configs,
            [name]: { tireWidth, isTubeless, condition }
        };
        
        setConfigs(newConfigs);
        setCurrentProfileName(name);

        try {
            await bikeService.update(bikeId, { tire_settings: newConfigs });
            alert("Configuration sauvegardée !");
        } catch (e) { alert("Erreur sauvegarde"); }
    };

    const deleteConfig = async () => {
        if (Object.keys(configs).length <= 1) return alert("Il faut garder au moins une config.");
        
        const newConfigs = { ...configs };
        delete newConfigs[currentProfileName];
        
        const firstKey = Object.keys(newConfigs)[0];
        setConfigs(newConfigs);
        switchProfile(firstKey); // Bascule sur le premier dispo

        await bikeService.update(bikeId, { tire_settings: newConfigs });
    };

    // Calcul automatique
    useEffect(() => {
        const totalWeight = parseFloat(riderWeight) + (parseFloat(bikeWeight) || 8);
        let base = 0;
        if (tireWidth <= 25) base = totalWeight * 0.09;
        else if (tireWidth <= 28) base = totalWeight * 0.075;
        else if (tireWidth <= 32) base = totalWeight * 0.06;
        else base = totalWeight * 0.045;

        if (isTubeless) base *= 0.85;
        if (condition === 'wet') base *= 0.90;

        setPressure({
            front: (base * 0.95).toFixed(1),
            rear: (base * 1.05).toFixed(1)
        });
    }, [riderWeight, tireWidth, isTubeless, condition, bikeWeight]);

    return (
        <div className="tire-tab">
            <div className="calculator-card glass-panel">
                <div className="config-header">
                    <h3>Calculateur Pression</h3>
                    <div className="profile-selector">
                        <select 
                            value={currentProfileName} 
                            onChange={(e) => switchProfile(e.target.value)}
                            className="neon-select"
                        >
                            {Object.keys(configs).map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                        <button onClick={saveCurrentConfig} className="icon-btn-small save" title="Sauvegarder / Nouveau"><FaSave /></button>
                        <button onClick={deleteConfig} className="icon-btn-small delete" title="Supprimer"><FaTrash /></button>
                    </div>
                </div>

                <div className="inputs-grid">
                    <div className="input-group">
                        <label>Poids Pilote (kg)</label>
                        <input type="number" value={riderWeight} onChange={e => setRiderWeight(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Largeur (mm)</label>
                        <select value={tireWidth} onChange={e => setTireWidth(Number(e.target.value))}>
                            <option value={23}>23mm</option>
                            <option value={25}>25mm</option>
                            <option value={28}>28mm</option>
                            <option value={30}>30mm</option>
                            <option value={32}>32mm</option>
                            <option value={35}>35mm</option>
                            <option value={40}>40mm +</option>
                        </select>
                    </div>
                    <div className="input-group full">
                        <div className="toggle-container">
                            <button className={`toggle-btn ${!isTubeless ? 'active' : ''}`} onClick={() => setIsTubeless(false)}>Chambre</button>
                            <button className={`toggle-btn ${isTubeless ? 'active' : ''}`} onClick={() => setIsTubeless(true)}>Tubeless</button>
                        </div>
                    </div>
                    <div className="input-group full">
                        <div className="toggle-container">
                            <button className={`toggle-btn ${condition === 'dry' ? 'active' : ''}`} onClick={() => setCondition('dry')}><FaSun /> Sec</button>
                            <button className={`toggle-btn ${condition === 'wet' ? 'active' : ''}`} onClick={() => setCondition('wet')}><FaCloudRain /> Pluie</button>
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
            </div>
        </div>
    );
}

export default TirePressureTab;