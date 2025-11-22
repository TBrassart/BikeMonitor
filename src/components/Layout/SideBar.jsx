import React, { useState } from 'react';
// Ajout de FaUser et FaExchangeAlt pour le menu popup
import { FaHome, FaBicycle, FaTshirt, FaAppleAlt, FaListAlt, FaBook, FaTools, FaCog, FaSignOutAlt, FaUser, FaExchangeAlt, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import './SideBar.css';
import Logo from './Logo';

const Sidebar = ({ activeRoute, onNavigate, onLogout, userProfile, onSwitchProfile }) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    const menuItems = [
        { label: 'Tableau de bord', icon: <FaHome />, path: '/' },
        { label: 'Garage', icon: <FaBicycle />, path: '/garage' },
        { label: 'Équipements', icon: <FaTshirt />, path: '/equipment' },
        { label: 'Nutrition', icon: <FaAppleAlt />, path: '/nutrition' },
        { label: 'Kits & Checklists', icon: <FaListAlt />, path: '/kits' },
        { label: 'Bibliothèque', icon: <FaBook />, path: '/library' },
        { label: 'Activités', icon: <FaTools />, path: '/activities' },
        // Note : J'ai retiré "Mon Profil" d'ici
        { label: 'Paramètres', icon: <FaCog />, path: '/settings/' },
    ];

    const isActive = (itemPath) => {
        if (itemPath === '/') return activeRoute === '/';
        if (itemPath === '/garage' && activeRoute.startsWith('/bike/')) return true;
        return activeRoute.startsWith(itemPath);
    };

    const handleProfileNavigation = () => {
        onNavigate('/profile');
        setIsProfileMenuOpen(false); // Fermer le menu après clic
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'}}>
                    <Logo width={60} height={60} />
                    <h2 style={{fontSize: '1.4rem', margin: 0, letterSpacing: '1px'}}>
                        <span style={{color: 'white', fontWeight: '600'}}>Bike</span>
                        <span style={{color: '#00e5ff', fontWeight: '800'}}>Monitor</span>
                    </h2>
                </div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item, index) => (
                    <button
                        key={`${item.path}-${index}`}
                        className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => onNavigate(item.path)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                
                {/* CONTENEUR DU MENU UTILISATEUR (Relatif pour le popup) */}
                <div className="user-menu-wrapper" style={{ position: 'relative' }}>
                    
                    {/* LE POPUP (S'affiche seulement si ouvert) */}
                    {isProfileMenuOpen && (
                        <div className="user-popup-menu">
                            <button onClick={handleProfileNavigation}>
                                <FaUser /> Voir mon profil
                            </button>
                            <button onClick={onSwitchProfile}>
                                <FaExchangeAlt /> Changer de profil
                            </button>
                        </div>
                    )}

                    {/* LE BADGE (Déclencheur) */}
                    <div 
                        className={`current-profile-badge ${isProfileMenuOpen ? 'active' : ''}`} 
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        title="Gérer le profil"
                    >
                        <span style={{fontSize: '1.5rem'}}>{userProfile?.avatar}</span>
                        <div style={{display:'flex', flexDirection:'column', lineHeight:'1.2'}}>
                            <span style={{fontWeight: 'bold', color: 'white'}}>{userProfile?.name}</span>
                            <span style={{fontSize:'0.7rem', color:'#888'}}>Gérer le compte</span>
                        </div>
                        
                        {/* Petite flèche qui change de sens */}
                        <span style={{marginLeft: 'auto', fontSize: '0.7rem', color: '#666'}}>
                            {isProfileMenuOpen ? <FaChevronDown /> : <FaChevronUp />}
                        </span>
                    </div>
                </div>

                <button onClick={onLogout} className="logout-btn">
                    <FaSignOutAlt /> Déconnexion
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
