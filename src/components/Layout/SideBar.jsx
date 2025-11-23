import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './SideBar.css';

function SideBar() {
    const location = useLocation();
    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <aside className="sidebar">
            <div className="logo-container" style={{ padding: '20px', fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>
                BikeMonitor 🚲
            </div>

            <nav className="nav-links" style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px' }}>
                <Link to="/app/dashboard" className={`nav-item ${isActive('/app/dashboard') ? 'active' : ''}`}>
                    📊 Tableau de bord
                </Link>

                <Link to="/app/garage" className={`nav-item ${isActive('/app/garage') ? 'active' : ''}`}>
                    🚲 Garage
                </Link>

                <Link to="/app/turlag" className={`nav-item ${isActive('/app/turlag') ? 'active' : ''}`}>
                    🛡️ Mon Turlag
                </Link>

                <div style={{ flex: 1 }}></div>

                <Link to="/app/settings" className={`nav-item ${isActive('/app/settings') ? 'active' : ''}`}>
                    ⚙️ Paramètres
                </Link>
            </nav>
        </aside>
    );
}

export default SideBar;