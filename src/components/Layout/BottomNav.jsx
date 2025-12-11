import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaChartPie, FaBicycle, FaCog, FaGift, FaPlay } from 'react-icons/fa';
import { adminService, activityService, bikeService } from '../../services/api';
import YearWrapped from '../Stats/YearWrapped';
import './BottomNav.css';

function BottomNav() {
    const location = useLocation();
    
    // --- ÉTATS WRAPPED ---
    const [isWrappedActive, setIsWrappedActive] = useState(false);
    const [showWrappedModal, setShowWrappedModal] = useState(false);
    const [wrappedData, setWrappedData] = useState(null);
    const [loadingWrapped, setLoadingWrapped] = useState(false);

    useEffect(() => {
        checkWrappedStatus();
    }, []);

    const checkWrappedStatus = async () => {
        try {
            const isActive = await adminService.getWrappedStatus();
            setIsWrappedActive(isActive);
        } catch (e) {
            console.error(e);
        }
    };

    const handleOpenWrapped = async () => {
        if (wrappedData) {
            setShowWrappedModal(true);
            return;
        }

        setLoadingWrapped(true);
        try {
            const [acts, bikes] = await Promise.all([
                activityService.getAll(),
                bikeService.getAll()
            ]);
            setWrappedData({ activities: acts, bikes: bikes });
            setShowWrappedModal(true);
        } catch (e) {
            alert("Erreur chargement données.");
        } finally {
            setLoadingWrapped(false);
        }
    };

    const isActive = (path) => {
        if (!location || !location.pathname) return false;
        return location.pathname.startsWith(path);
    };

    return (
        <>
            {/* MODALE (Affichée par dessus tout sur mobile aussi) */}
            {showWrappedModal && wrappedData && (
                <YearWrapped 
                    activities={wrappedData.activities}
                    bikes={wrappedData.bikes}
                    onClose={() => setShowWrappedModal(false)} 
                />
            )}

            <nav className="bottom-nav">
                <Link 
                    to="/app/dashboard" 
                    className={`nav-item ${isActive('/app/dashboard') ? 'active' : ''}`}
                >
                    <FaChartPie className="icon" />
                    <span className="label">Accueil</span>
                </Link>

                <Link 
                    to="/app/garage" 
                    className={`nav-item ${isActive('/app/garage') ? 'active' : ''}`}
                >
                    <FaBicycle className="icon" />
                    <span className="label">Garage</span>
                </Link>

                {/* --- BOUTON SPECIAL WRAPPED (SI ACTIF) --- */}
                {isWrappedActive && (
                    <button 
                        className="nav-item wrapped-mobile-btn" 
                        onClick={handleOpenWrapped}
                        disabled={loadingWrapped}
                    >
                        <div className="icon-wrapper">
                            {loadingWrapped ? (
                                <span className="loader-dot"></span>
                            ) : (
                                <FaPlay className="icon" />
                            )}
                        </div>
                        <span className="label">Recap</span>
                    </button>
                )}

                <Link 
                    to="/app/settings" 
                    className={`nav-item ${isActive('/app/settings') ? 'active' : ''}`}
                >
                    <FaCog className="icon" />
                    <span className="label">Réglages</span>
                </Link>
            </nav>
        </>
    );
}

export default BottomNav;