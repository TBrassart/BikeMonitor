import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import AuthScreen from './AuthScreen'; 
import Logo from '../Layout/Logo';

const JoinFamily = ({ onLogin }) => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('checking'); // checking, login_required, success, error
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        checkAndJoin();
    }, []);

    const checkAndJoin = async () => {
        // Si l'utilisateur est déjà connecté, on essaie de rejoindre direct
        if (authService.isAuthenticated) {
            try {
                await authService.acceptInvitation(token);
                alert("Félicitations ! Vous avez rejoint la famille.");
                navigate('/');
            } catch (e) {
                console.error(e);
                setStatus('error');
                setErrorMsg(e.message || "Impossible de rejoindre.");
            }
        } else {
            // Sinon, on demande de se connecter/inscrire
            setStatus('login_required');
        }
    };

    // Wrapper pour gérer la connexion puis retenter le join
    const handleAuthSuccess = async (email, password) => {
        await onLogin(email, password);
        // Une fois connecté, on relance la logique
        checkAndJoin(); 
    };

    if (status === 'error') {
        return (
            <div style={{height: '100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#12121e', color:'white', gap:'20px'}}>
                <Logo width={80} />
                <h2>Oups !</h2>
                <p style={{color:'#e74c3c'}}>{errorMsg}</p>
                <button onClick={() => navigate('/')} style={{padding:'10px 20px', borderRadius:'8px', border:'none', background:'#333', color:'white', cursor:'pointer'}}>Retour à l'accueil</button>
            </div>
        );
    }
    
    if (status === 'login_required') {
        return (
            <div style={{position:'relative'}}>
                <div style={{
                    background:'linear-gradient(90deg, #00e5ff, #ff00c8)', 
                    color:'white', 
                    padding:'15px', 
                    textAlign:'center', 
                    fontWeight:'bold',
                    position: 'absolute', top:0, left:0, right:0, zIndex: 10
                }}>
                    🚀 Vous êtes invité à rejoindre une famille !
                </div>
                <AuthScreen onLogin={handleAuthSuccess} />
            </div>
        );
    }

    return (
        <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#12121e', color:'white'}}>
            Traitement de l'invitation...
        </div>
    );
};

export default JoinFamily;