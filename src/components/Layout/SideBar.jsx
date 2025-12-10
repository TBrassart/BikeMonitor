import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    FaChartPie, FaBicycle, FaUsers, FaTshirt, FaAppleAlt, 
    FaToolbox, FaBook, FaRunning, FaCog, FaSignOutAlt, FaBolt, FaUserShield, FaStore, FaQuestionCircle,
    FaPlay, FaGift
} from 'react-icons/fa';
import { authService, shopService, adminService, activityService, bikeService } from '../../services/api'; // Ajout shopService
import YearWrapped from '../Stats/YearWrapped';
import './SideBar.css';

function SideBar() {
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = (path) => location.pathname.startsWith(path);

    const [profile, setProfile] = useState(null);
    const [equippedBadge, setEquippedBadge] = useState(null);
    const [equippedTitle, setEquippedTitle] = useState(null);

    // ÉTATS WRAPPED
    const [isWrappedActive, setIsWrappedActive] = useState(false);
    const [showWrappedModal, setShowWrappedModal] = useState(false);
    const [wrappedData, setWrappedData] = useState(null); // { activities, bikes }
    const [loadingWrapped, setLoadingWrapped] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Chargement parallèle Profil + Inventaire
            const [profData, invData, wrappedStatusData] = await Promise.all([
                authService.getMyProfile(),
                shopService.getInventory(),
                adminService.getWrappedStatus()
            ]);
            
            setProfile(profData);
            setIsWrappedActive(wrappedStatusData);

            if (invData) {
                const badge = invData.find(i => i.shop_items.type === 'badge' && i.is_equipped);
                const title = invData.find(i => i.shop_items.type === 'title' && i.is_equipped);
                
                if (badge) setEquippedBadge(badge.shop_items.asset_data);
                if (title) setEquippedTitle(title.shop_items);
            }
        } catch (e) {
            console.error("Erreur chargement sidebar", e);
        }
    };

    // LOGIQUE CLIC WRAPPED
    const handleOpenWrapped = async () => {
        // Si on a déjà les données, on ouvre direct
        if (wrappedData) {
            setShowWrappedModal(true);
            return;
        }

        // Sinon on charge
        setLoadingWrapped(true);
        try {
            const [acts, bikes] = await Promise.all([
                activityService.getAll(),
                bikeService.getAll()
            ]);
            setWrappedData({ activities: acts, bikes: bikes });
            setShowWrappedModal(true);
        } catch (e) {
            alert("Erreur lors du chargement de vos données.");
        } finally {
            setLoadingWrapped(false);
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
            <>
                {/* MODALE WRAPPED (Affichée par dessus tout si active) */}
                {showWrappedModal && wrappedData && (
                    <YearWrapped 
                        activities={wrappedData.activities}
                        bikes={wrappedData.bikes}
                        onClose={() => setShowWrappedModal(false)} 
                    />
                )}

            <aside className="sidebar glass-panel">
                
                {/* --- EN-TÊTE PROFIL CUSTOMISÉ --- */}
                <div className="sidebar-header" onClick={() => navigate('/app/settings')}>
                    <div className="mini-avatar">
                        {profile ? profile.avatar : <FaBolt />}
                    </div>
                    <div className="mini-user-info">
                        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                            <span className="user-name">{profile ? profile.name : 'Chargement...'}</span>
                            {/* AFFICHAGE DU BADGE */}
                            {equippedBadge && (
                                <span style={{fontSize:'1.2rem'}} title="Badge équipé">
                                    {equippedBadge.icon}
                                </span>
                            )}
                        </div>
                        
                        {/* AFFICHAGE DU TITRE */}
                        {equippedTitle ? (
                            <span 
                                className={`app-name ${equippedTitle.asset_data?.className || ''}`}
                                style={!equippedTitle.asset_data?.className ? {color: 'var(--neon-purple)'} : {}}
                            >
                                {equippedTitle.name}
                            </span>
                        ) : (
                            <span className="app-name">BikeMonitor</span>
                        )}
                    </div>
                </div>
                
                {/* --- BOUTON WRAPPED GOLD (UNIQUEMENT SI ACTIF) --- */}
                {isWrappedActive && (
                    <div className="wrapped-sidebar-container">
                        <button 
                            className="wrapped-sidebar-btn" 
                            onClick={handleOpenWrapped}
                            disabled={loadingWrapped}
                        >
                            <div className="wrapped-btn-content">
                                <FaPlay className="wrapped-icon" />
                                <div className="wrapped-text">
                                    <span className="wrapped-title">RECAP {new Date().getFullYear()}</span>
                                    <span className="wrapped-sub">Découvrir ma story</span>
                                </div>
                                <FaGift className="wrapped-gift" />
                            </div>
                            {/* Effet de brillance CSS */}
                            <div className="shine-effect"></div>
                        </button>
                    </div>
                )}

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
                        
                        {(profile?.app_role === 'admin' || profile?.app_role === 'moderator') && (
                            <NavLink to="/app/library" icon={FaBook} label="Bibliothèque" />
                        )}
                    </div>

                    <div className="nav-section">
                        <p className="section-title">PRÉPARATION</p>
                        <NavLink to="/app/nutrition" icon={FaAppleAlt} label="Nutrition" />
                        <NavLink to="/app/kits" icon={FaToolbox} label="Kits & Checklists" />
                        <NavLink to="/app/turlag" icon={FaUsers} label="Mon Turlag" />
                    </div>
                        
                    <div className="spacer"></div>

                    <div className="nav-section">
                        {profile?.app_role === 'admin' && (
                            <NavLink to="/app/admin" icon={FaUserShield} label="Administration" />
                        )}
                        
                        <NavLink to="/app/shop" icon={FaStore} label="Boutique" />
                        <NavLink to="/app/settings" icon={FaCog} label="Paramètres" />
                        <NavLink to="/app/help" icon={FaQuestionCircle} label="Aide & Feedback" />
                        <button onClick={handleLogout} className="nav-item logout-btn">
                            <FaSignOutAlt className="icon" />
                            <span className="label">Déconnexion</span>
                        </button>
                    </div>
                </nav>
            </aside>
        </>
    );
}

export default SideBar;