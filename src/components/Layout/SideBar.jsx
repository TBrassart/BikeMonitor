import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    FaChartPie, FaBicycle, FaUsers, FaTshirt, FaAppleAlt, 
    FaToolbox, FaBook, FaRunning, FaCog, FaSignOutAlt, FaBolt 
} from 'react-icons/fa';
import { authService } from '../../services/api';
import './SideBar.css';

function SideBar() {
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = (path) => location.pathname.startsWith(path);

    // --- ÉTATS POUR LE PROFIL ---
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const data = await authService.getMyProfile();
            setProfile(data);
        } catch (e) {
            console.error("Erreur chargement sidebar", e);
        }
    };

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
            
            {/* --- EN-TÊTE PROFIL (NOUVEAU) --- */}
            <div className="sidebar-header" onClick={() => navigate('/app/settings')}>
                <div className="mini-avatar">
                    {profile ? profile.avatar : <FaBolt />}
                </div>
                <div className="mini-user-info">
                    <span className="user-name">{profile ? profile.name : 'Chargement...'}</span>
                    <span className="app-name">BikeMonitor</span>
                </div>
            </div>
            {/* -------------------------------- */}

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