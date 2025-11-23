import React, { useState, useEffect } from 'react';
import { bikeService } from '../../services/api';
import './ChartsSection.css';

function ChartsSection() {
    const [bikes, setBikes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await bikeService.getAll();
            // On trie par kilométrage décroissant
            const sortedBikes = (data || []).sort((a, b) => (b.total_km || 0) - (a.total_km || 0));
            setBikes(sortedBikes);
        } catch (e) {
            console.error("Erreur chargement charts:", e);
        } finally {
            setLoading(false);
        }
    };

    // Pour éviter la division par zéro
    const maxKm = bikes.length > 0 && bikes[0].total_km > 0 ? bikes[0].total_km : 1;

    if (loading) return <div className="charts-loading">Chargement des stats...</div>;
    if (bikes.length === 0) return null;

    return (
        <div className="charts-section">
            <h3>Performances de l'écurie 📊</h3>
            
            <div className="charts-grid">
                
                {/* GRAPHIQUE 1 : Barres de progression (HTML/CSS) */}
                <div className="chart-card">
                    <h4>Kilométrage total</h4>
                    <div className="bars-container">
                        {bikes.map(bike => {
                            const km = bike.total_km || 0;
                            // Calcul du pourcentage relatif au premier (le max)
                            const percentage = Math.round((km / maxKm) * 100);
                            
                            return (
                                <div key={bike.id} className="bar-row">
                                    <div className="bar-header">
                                        <span className="bar-label">{bike.name}</span>
                                        <span className="bar-value">{km} km</span>
                                    </div>
                                    <div className="progress-track">
                                        <div 
                                            className="progress-fill" 
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* GRAPHIQUE 2 : Le Leader (Mise en avant visuelle) */}
                <div className="chart-card highlight-card">
                    <h4>Le Leader 🏆</h4>
                    <div className="highlight-content">
                        <div className="highlight-circle">
                            {/* On affiche l'avatar du propriétaire s'il existe, sinon une icône */}
                            <span className="emoji">🚴</span>
                        </div>
                        <div className="highlight-text">
                            <h5>{bikes[0].name}</h5>
                            <p>Vélo le plus utilisé avec</p>
                            <span className="highlight-metric">{bikes[0].total_km} km</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default ChartsSection;