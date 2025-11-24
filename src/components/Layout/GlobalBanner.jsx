import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { FaInfoCircle, FaExclamationTriangle, FaTools, FaBullhorn, FaStar } from 'react-icons/fa';
import './GlobalBanner.css';

function GlobalBanner() {
    const [config, setConfig] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        checkBanner();
        // On revérifie chaque minute au cas où l'heure de début arrive pendant la navigation
        const interval = setInterval(checkBanner, 60000);
        return () => clearInterval(interval);
    }, []);

    const checkBanner = async () => {
        try {
            const settings = await adminService.getBanner();
            if (!settings || !settings.message) {
                setIsVisible(false);
                return;
            }

            const now = new Date();
            const start = new Date(settings.startAt);
            const end = new Date(settings.endAt);

            // Est-ce qu'on est dans le créneau ?
            if (now >= start && now <= end) {
                setConfig(settings);
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        } catch (e) {
            console.error("Erreur bannière", e);
        }
    };

    if (!isVisible || !config) return null;

    // Choix de l'icône et du style selon le type
    const getVisuals = (type) => {
        switch(type) {
            case 'warning': return { icon: <FaExclamationTriangle />, label: 'ATTENTION', class: 'type-warning' };
            case 'maintenance': return { icon: <FaTools />, label: 'MAINTENANCE', class: 'type-maint' };
            case 'feature': return { icon: <FaStar />, label: 'NOUVEAUTÉ', class: 'type-feature' };
            default: return { icon: <FaBullhorn />, label: 'INFO', class: 'type-info' };
        }
    };

    const visuals = getVisuals(config.type);

    return (
        <div className={`global-banner glass-panel ${visuals.class}`}>
            <div className="banner-track">
                <div className="banner-content">
                    <span className="banner-badge">
                        {visuals.icon} {visuals.label}
                    </span>
                    <span className="banner-text">{config.message}</span>
                </div>
                {/* Dupliqué pour l'effet de boucle infinie fluide si le texte est court */}
                <div className="banner-content">
                    <span className="banner-badge">
                        {visuals.icon} {visuals.label}
                    </span>
                    <span className="banner-text">{config.message}</span>
                </div>
            </div>
        </div>
    );
}

export default GlobalBanner;