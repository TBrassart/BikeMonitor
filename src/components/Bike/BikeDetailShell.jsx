import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bikeService } from '../../services/api'; // Utilise l'adaptateur
import './BikeDetailShell.css';

// Import des onglets (Assurez-vous que ces chemins sont corrects)
import MaintenanceTab from './MaintenanceTab';
import PartsTab from './PartsTab';
import TirePressureTab from './TirePressureTab';
import HistoryTab from './HistoryTab';

function BikeDetailShell() {
    const { bikeId } = useParams();
    const navigate = useNavigate();
    
    const [bike, setBike] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('maintenance'); // maintenance, parts, tires, history

    useEffect(() => {
        loadBikeDetails();
    }, [bikeId]);

    const loadBikeDetails = async () => {
        try {
            setLoading(true);
            // Appel sécurisé via l'adaptateur
            const data = await bikeService.getById(bikeId);
            setBike(data);
        } catch (e) {
            console.error("Erreur chargement vélo:", e);
            // Optionnel : Rediriger vers le garage si vélo non trouvé
            // navigate('/app/garage');
        } finally {
            setLoading(false);
        }
    };

    // --- PROTECTION CONTRE LE CRASH ---
    if (loading) {
        return <div className="bike-detail-loading">Chargement des données du vélo...</div>;
    }

    if (!bike) {
        return (
            <div className="bike-detail-error">
                <p>Vélo introuvable.</p>
                <button onClick={() => navigate('/app/garage')}>Retour au garage</button>
            </div>
        );
    }
    // ----------------------------------

    return (
        <div className="bike-detail-shell">
            <header className="bike-header">
                <button onClick={() => navigate('/app/garage')} className="back-btn">←</button>
                <div className="bike-identity">
                    <h1>{bike.name}</h1>
                    {/* Affichage sécurisé du propriétaire */}
                    <span className="owner-label">
                        {bike.profiles ? `Appartient à ${bike.profiles.name}` : ''}
                    </span>
                </div>
                <div className="bike-kpi">
                    <span className="kpi-value">{bike.total_km} km</span>
                </div>
            </header>

            <nav className="detail-tabs">
                <button 
                    className={activeTab === 'maintenance' ? 'active' : ''} 
                    onClick={() => setActiveTab('maintenance')}
                >
                    Entretien
                </button>
                <button 
                    className={activeTab === 'parts' ? 'active' : ''} 
                    onClick={() => setActiveTab('parts')}
                >
                    Pièces
                </button>
                <button 
                    className={activeTab === 'tires' ? 'active' : ''} 
                    onClick={() => setActiveTab('tires')}
                >
                    Pneus
                </button>
                <button 
                    className={activeTab === 'history' ? 'active' : ''} 
                    onClick={() => setActiveTab('history')}
                >
                    Historique
                </button>
            </nav>

            <div className="tab-content">
                {activeTab === 'maintenance' && <MaintenanceTab bikeId={bikeId} bikeKm={bike.total_km} />}
                {activeTab === 'parts' && <PartsTab bikeId={bikeId} />}
                {activeTab === 'tires' && <TirePressureTab bikeId={bikeId} bikeWeight={bike.weight} />}
                {activeTab === 'history' && <HistoryTab bikeId={bikeId} />}
            </div>
        </div>
    );
}

export default BikeDetailShell;