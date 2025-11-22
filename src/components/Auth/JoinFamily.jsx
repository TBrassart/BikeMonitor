import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { supabase } from '../../supabaseClient'; // Nécessaire pour écouter l'auth
import AuthScreen from './AuthScreen'; 
import Logo from '../Layout/Logo';

const JoinFamily = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // loading, login_required, joining, success, error
    const [errorMsg, setErrorMsg] = useState('');

    // 1. EFFET PRINCIPAL : Écouteur d'authentification
    useEffect(() => {
        let mounted = true;

        const attemptJoin = async () => {
            if (!mounted) return;
            
            // Si l'utilisateur est connecté, on lance l'invitation
            if (authService.isAuthenticated) {
                setStatus('joining');
                try {
                    await authService.acceptInvitation(token);
                    alert("Félicitations ! Vous avez rejoint la famille.");
                    navigate('/'); // Redirection vers le Dashboard
                } catch (e) {
                    console.error(e);
                    // Si l'erreur est "déjà membre", on redirige quand même
                    if (e.message && e.message.includes("duplicate")) {
                        alert("Vous faites déjà partie de cette famille !");
                        navigate('/');
                    } else {
                        setStatus('error');
                        setErrorMsg(e.message || "Impossible de rejoindre.");
                    }
                }
            } else {
                // Pas connecté -> On affiche le formulaire
                setStatus('login_required');
            }
        };

        // Lance la tentative au chargement
        attemptJoin();

        // Écoute les changements (ex: l'utilisateur vient de se connecter via le formulaire)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                attemptJoin();
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [token, navigate]);

    const handleLocalLogin = async (email, password) => {
        await authService.login(email, password);
    };

    // 3. RENDU
    if (status === 'error') {
        return (
            <div style={{height: '100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#12121e', color:'white', gap:'20px', padding:'20px', textAlign:'center'}}>
                <Logo width={80} />
                <h2 style={{color: '#e74c3c'}}>Oups !</h2>
                <p>{errorMsg}</p>
                <button onClick={() => navigate('/')} style={{padding:'12px 25px', borderRadius:'8px', border:'none', background:'#333', color:'white', cursor:'pointer', fontWeight:'bold'}}>
                    Retour à l'accueil
                </button>
            </div>
        );
    }
    
    if (status === 'login_required') {
        return (
            <div style={{position:'relative', minHeight:'100vh', background:'var(--color-dark-bg)'}}>
                {/* Bandeau d'invitation */}
                <div style={{
                    background:'linear-gradient(90deg, #00e5ff, #ff00c8)', 
                    color:'white', 
                    padding:'15px', 
                    textAlign:'center', 
                    fontWeight:'bold',
                    position: 'sticky', top:0, zIndex: 100
                }}>
                    🚀 Vous êtes invité à rejoindre une famille !
                </div>
                
                <AuthScreen 
                    onLogin={handleLocalLogin} 
                    isInviteFlow={true} 
                    inviteToken={token}
                />
            </div>
        );
    }

    return (
        <div style={{height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#12121e', color:'white', gap:'20px'}}>
            <Logo width={60} className="spin" /> {/* Si tu as une classe spin, sinon juste le logo */}
            <p style={{fontSize:'1.2rem'}}>Validation de l'invitation...</p>
        </div>
    );
};

export default JoinFamily;