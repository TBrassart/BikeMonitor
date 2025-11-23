import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaChartLine, FaBicycle, FaUsers, FaCog, FaBolt, FaSignOutAlt } from 'react-icons/fa';
import { authService } from '../../services/api';
import './SideBar.css';

function SideBar() {
    const location = useLocation();
    const isActive = (path) => location.pathname.startsWith(path);

    const handleLogout = async () => {
        if (window.confirm("Voulez-vous vraiment vous déconnecter ?")) {
            await authService.signOut();
            // Redirection forcée pour recharger l'état de l'app
            window.location.href = '/';
        }
    };

    return (
        <aside className="sidebar">
            <div className="logo-container" style={{ padding: '25px', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ margin: 0, color: 'var(--neon-blue)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
                    <FaBolt /> BikeMonitor
                </h2>
            </div>

            <nav className="nav-links" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <Link to="/app/dashboard" className={`nav-item ${isActive('/app/dashboard') ? 'active' : ''}`}>
                    <FaChartLine className="icon" /> Tableau de bord
                </Link>

                <Link to="/app/garage" className={`nav-item ${isActive('/app/garage') ? 'active' : ''}`}>
                    <FaBicycle className="icon" /> Garage
                </Link>

                <Link to="/app/turlag" className={`nav-item ${isActive('/app/turlag') ? 'active' : ''}`}>
                    <FaUsers className="icon" /> Mon Turlag
                </Link>

                <Link to="/app/settings" className={`nav-item ${isActive('/app/settings') ? 'active' : ''}`}>
                    <FaCog className="icon" /> Paramètres
                </Link>

                <div className="spacer" style={{ flex: 1 }}></div>

                {/* BOUTON DÉCONNEXION DANS LA SIDEBAR */}
                <button 
                    onClick={handleLogout} 
                    className="nav-item logout-btn" 
                    style={{ 
                        marginTop: 'auto', 
                        background: 'transparent', 
                        border: 'none', 
                        color: '#ef4444', // Rouge
                        cursor: 'pointer',
                        width: '100%',
                        justifyContent: 'flex-start',
                        borderTop: '1px solid var(--border-color)',
                        borderRadius: 0,
                        paddingTop: '20px'
                    }}
                >
                    <FaSignOutAlt className="icon" /> Déconnexion
                </button>
            </nav>
        </aside>
    );
}

export default SideBar;