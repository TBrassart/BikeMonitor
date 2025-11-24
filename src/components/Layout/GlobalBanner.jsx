import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { FaInfoCircle, FaExclamationTriangle, FaTools, FaBullhorn, FaStar } from 'react-icons/fa';
import './GlobalBanner.css';

function GlobalBanner() {
    const [config, setConfig] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        checkBanner();
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

            if (now >= start && now <= end) {
                setConfig(settings);
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (!isVisible || !config) return null;

    const getVisuals = (type) => {
        switch(type) {
            case 'warning': return { icon: <FaExclamationTriangle />, label: 'ATTENTION', class: 'type-warning' };
            case 'maintenance': return { icon: <FaTools />, label: 'MAINTENANCE', class: 'type-maint' };
            case 'feature': return { icon: <FaStar />, label: 'NOUVEAUTÉ', class: 'type-feature' };
            default: return { icon: <FaBullhorn />, label: 'INFO', class: 'type-info' };
        }
    };

    const visuals = getVisuals(config.type);
    
    // On répète le message plusieurs fois pour être sûr qu'il remplisse un écran large
    const items = [1, 2, 3, 4]; 

    return (
        <div className={`global-banner ${visuals.class}`}>
            <div className="banner-track">
                {items.map((i) => (
                    <div key={i} className="banner-item">
                        <span className="banner-badge">
                            {visuals.icon} {visuals.label}
                        </span>
                        <span className="banner-text">{config.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default GlobalBanner;