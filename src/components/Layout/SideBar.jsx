import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './SideBar.css';

function SideBar() {
    const location = useLocation();
    
    // Fonction sécurisée pour vérifier si un lien est actif
    const isActive = (path) => {
        if (!location || !location.pathname) return false;
        return location.pathname.startsWith(path);
    };

    return (
        <aside className="sidebar">
            <div className="logo-container">
                <h2>BikeMonitor</h2>
            </div>

            <nav className="nav-links">
                <Link 
                    to="/app/dashboard" 
                    className={`nav-item ${isActive('/app/dashboard') ? 'active' : ''}`}
                >
                    <span className="icon">📊</span>
                    <span className="label">Tableau de bord</span>
                </Link>

                <Link 
                    to="/app/garage" 
                    className={`nav-item ${isActive('/app/garage') ? 'active' : ''}`}
                >
                    <span className="icon">🚲</span>
                    <span className="label">Garage</span>
                </Link>

                {/* Tu pourras ajouter Nutrition / Activités ici plus tard */}
                
                <div className="spacer"></div>

                <Link 
                    to="/app/settings" 
                    className={`nav-item ${isActive('/app/settings') ? 'active' : ''}`}
                >
                    <span className="icon">⚙️</span>
                    <span className="label">Paramètres</span>
                </Link>
            </nav>
        </aside>
    );
}

export default SideBar;