import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { FaUsers, FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import '../Auth/AuthScreen.css'; // On réutilise le style Auth

function InviteLanding() {
    const { code } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [msg, setMsg] = useState('Vérification de l\'invitation...');
    const [groupName, setGroupName] = useState('');

    useEffect(() => {
        attemptJoin();
    }, []);

    const attemptJoin = async () => {
        try {
            // On tente de rejoindre directement
            // (Si l'user n'est pas connecté, l'API renverra une erreur ou null, à gérer)
            const user = await authService.getCurrentUser();
            if (!user) {
                // Rediriger vers login avec le code en mémoire pour après
                // Ici on fait simple : message d'erreur
                setStatus('error');
                setMsg("Vous devez être connecté pour rejoindre un groupe.");
                return;
            }

            const group = await authService.joinByCode(code);
            setGroupName(group.name);
            setStatus('success');
            setMsg(`Bienvenue dans l'équipe ${group.name} !`);
            
            setTimeout(() => navigate(`/app/turlag/${group.id}`), 2000);

        } catch (e) {
            setStatus('error');
            setMsg(e.message || "Lien invalide ou expiré.");
        }
    };

    return (
        <div className="auth-screen">
            <div className="bg-glow glow-1"></div>
            <div className="auth-card glass-panel">
                <div style={{fontSize:'3rem', marginBottom:'20px', color: status==='error'?'#ef4444':'var(--neon-blue)'}}>
                    {status === 'loading' && <FaSpinner className="spinning" />}
                    {status === 'success' && <FaCheckCircle />}
                    {status === 'error' && <FaExclamationTriangle />}
                </div>
                
                <h2 className="gradient-text">Invitation Turlag</h2>
                <p style={{color:'#ccc', margin:'20px 0', fontSize:'1.1rem'}}>{msg}</p>

                {status === 'error' && (
                    <button onClick={() => navigate('/app/dashboard')} className="secondary-btn">
                        Retour au Dashboard
                    </button>
                )}
                
                {status === 'error' && msg.includes("connecté") && (
                    <button onClick={() => navigate('/')} className="primary-btn" style={{marginTop:'10px'}}>
                        Se connecter
                    </button>
                )}
            </div>
        </div>
    );
}

export default InviteLanding;