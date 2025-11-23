import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    FaChartPie, FaBicycle, FaUsers, FaTshirt, FaAppleAlt, 
    FaToolbox, FaBook, FaRunning, FaCog, FaSignOutAlt 
} from 'react-icons/fa';
import { authService } from '../../services/api';
import './SideBar.css';

function SideBar() {
    const location = useLocation();
    const isActive = (path) => location.pathname.startsWith(path);

    const handleLogout = async () => {
        if (window.confirm("Se déconnecter ?")) {
            await authService.signOut();
            window.location.href = '/';
        }
    };

    const NavLink = ({ to, icon: Icon, label }) => (
        <Link to={to} className={`nav-item ${isActive(to) ? 'active' : ''}`}>
            <Icon className="icon" />
            <span className="label">{label}</span>
        </Link>
    );

    return (
        <aside className="sidebar glass-panel">
            {/* LOGO AVEC DÉGRADÉ */}
            <div className="logo-container">
                <h2 className="gradient-text">BikeMonitor</h2>
            </div>

            <nav className="nav-scroll">
                <div className="nav-section">
                    <p className="section-title">PRINCIPAL</p>
                    <NavLink to="/app/dashboard" icon={FaChartPie} label="Tableau de bord" />
                    <NavLink to="/app/activities" icon={FaRunning} label="Activités" />
                </div>

                <div className="nav-section">
                    <p className="section-title">GARAGE & ÉQUIPEMENT</p>
                    <NavLink to="/app/garage" icon={FaBicycle} label="Mes Vélos" />
                    <NavLink to="/app/equipment" icon={FaTshirt} label="Équipements" />
                    <NavLink to="/app/library" icon={FaBook} label="Bibliothèque" />
                </div>

                <div className="nav-section">
                    <p className="section-title">PRÉPARATION</p>
                    <NavLink to="/app/nutrition" icon={FaAppleAlt} label="Nutrition" />
                    <NavLink to="/app/kits" icon={FaToolbox} label="Kits & Checklists" />
                    <NavLink to="/app/turlag" icon={FaUsers} label="Mon Turlag" />
                </div>

                <div className="spacer"></div>

                <div className="nav-section">
                    <NavLink to="/app/settings" icon={FaCog} label="Paramètres" />
                    <button onClick={handleLogout} className="nav-item logout-btn">
                        <FaSignOutAlt className="icon" />
                        <span className="label">Déconnexion</span>
                    </button>
                </div>
            </nav>
        </aside>
    );
}

export default SideBar;