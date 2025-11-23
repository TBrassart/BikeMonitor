import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { stravaService } from '../../services/stravaService';

function StravaCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Connexion à Strava en cours...');

    useEffect(() => {
        // On récupère le code d'autorisation envoyé par Strava
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            setStatus("Connexion refusée par l'utilisateur.");
            setTimeout(() => navigate('/app/settings'), 2000);
            return;
        }

        if (code) {
            handleAuth(code);
        } else {
            setStatus("Erreur : Aucun code reçu.");
            setTimeout(() => navigate('/app/settings'), 2000);
        }
    }, []);

    const handleAuth = async (code) => {
        try {
            // Échange du code contre le token
            await stravaService.handleCallback(code);
            setStatus("✅ Succès ! Ton compte Strava est lié.");
            // On lance une première synchro immédiate pour le plaisir
            await stravaService.syncActivities(); 
            setTimeout(() => navigate('/app/settings'), 1500);
        } catch (e) {
            console.error(e);
            setStatus("❌ Erreur lors de la liaison Strava.");
            setTimeout(() => navigate('/app/settings'), 3000);
        }
    };

    return (
        <div style={{ 
            height: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            backgroundColor: '#0f172a', 
            color: 'white' 
        }}>
            <h2>{status}</h2>
            <div style={{ marginTop: '20px' }} className="loader">🔄</div>
        </div>
    );
}

export default StravaCallback;