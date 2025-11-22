import React from 'react';
import { FaHome, FaBicycle, FaTshirt, FaAppleAlt, FaEllipsisH } from 'react-icons/fa';
import './BottomNav.css';

const BottomNav = ({ activeRoute, onNavigate }) => {
    
    // Liste des onglets pour le mobile (limité à 5 pour la place)
    const navItems = [
        { label: 'Accueil', icon: <FaHome />, path: '/' },
        { label: 'Garage', icon: <FaBicycle />, path: '/garage' },
        { label: 'Matos', icon: <FaTshirt />, path: '/equipment' },
        { label: 'Nutri', icon: <FaAppleAlt />, path: '/nutrition' },
        { label: 'Plus', icon: <FaEllipsisH />, path: '/settings/' },
    ];

    const isActive = (itemPath) => {
        if (itemPath === '/') return activeRoute === '/';
        // Le garage reste allumé si on est dans le détail d'un vélo
        if (itemPath === '/garage' && activeRoute.startsWith('/bike/')) return true;
        return activeRoute.startsWith(itemPath);
    };

    return (
        <div className="bottom-nav">
            {navItems.map((item) => (
                <button 
                    key={item.path} /* <--- LA CLÉ UNIQUE INDISPENSABLE */
                    className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => onNavigate(item.path)}
                >
                    {item.icon}
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
    );
};

export default BottomNav;