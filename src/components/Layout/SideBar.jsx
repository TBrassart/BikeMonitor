import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaChartLine, FaBicycle, FaUsers, FaCog, FaBolt } from 'react-icons/fa'; // Imports
import './SideBar.css';

function SideBar() {
    const location = useLocation();
    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <aside className="sidebar">
            <div className="logo-container" style={{ padding: '25px', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ margin: 0, color: 'var(--neon-blue)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaBolt /> BikeMonitor
                </h2>
            </div>

            <nav className="nav-links" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link to="/app/dashboard" className={`nav-item ${isActive('/app/dashboard') ? 'active' : ''}`}>
                    <FaChartLine className="icon" /> Tableau de bord
                </Link>

                <Link to="/app/garage" className={`nav-item ${isActive('/app/garage') ? 'active' : ''}`}>
                    <FaBicycle className="icon" /> Garage
                </Link>

                <Link to="/app/turlag" className={`nav-item ${isActive('/app/turlag') ? 'active' : ''}`}>
                    <FaUsers className="icon" /> Mon Turlag
                </Link>

                <div className="spacer" style={{ flex: 1 }}></div>

                <Link to="/app/settings" className={`nav-item ${isActive('/app/settings') ? 'active' : ''}`}>
                    <FaCog className="icon" /> Paramètres
                </Link>
            </nav>
        </aside>
    );
}

export default SideBar;