import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './BottomNav.css';

function BottomNav() {
    const location = useLocation();

    const isActive = (path) => {
        if (!location || !location.pathname) return false;
        return location.pathname.startsWith(path);
    };

    return (
        <nav className="bottom-nav">
            <Link 
                to="/app/dashboard" 
                className={`nav-item ${isActive('/app/dashboard') ? 'active' : ''}`}
            >
                <span className="icon">📊</span>
                <span className="label">Accueil</span>
            </Link>

            <Link 
                to="/app/garage" 
                className={`nav-item ${isActive('/app/garage') ? 'active' : ''}`}
            >
                <span className="icon">🚲</span>
                <span className="label">Garage</span>
            </Link>

            <Link 
                to="/app/settings" 
                className={`nav-item ${isActive('/app/settings') ? 'active' : ''}`}
            >
                <span className="icon">⚙️</span>
                <span className="label">Réglages</span>
            </Link>
        </nav>
    );
}

export default BottomNav;