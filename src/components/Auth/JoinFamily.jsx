import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { supabase } from '../../supabaseClient'; 
import AuthScreen from './AuthScreen'; 
import Logo from '../Layout/Logo';

const JoinFamily = ({ onLogin }) => {
    const { token } = useParams();
    const navigate = useNavigate();

    // 1. DÉTECTION DU RETOUR EMAIL (Hash dans l'URL)
    // Si l'URL contient "access_token", c'est qu'on revient du mail de validation.
    // On affiche direct le spinner ("joining") au lieu du formulaire ("login_required").
    const isMagicLink = window.location.hash.includes('access_token');
    
    const [status, setStatus] = useState(isMagicLink ? 'joining' : 'loading'); 
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        let mounted = true;

        const attemptJoin = async () => {
            if (!mounted) return;
            
            // Vérification : Est-on connecté ?
            // On vérifie le localStorage ou la session Supabase active
            const session = await supabase.auth.getSession();
            const isConnected = !!session.data.session;

            if (isConnected) {
                setStatus('joining');
                try {
                    // On tente de lier le compte à la famille
                    await authService.acceptInvitation(token);
                    alert("Félicitations ! Vous avez rejoint la famille.");
                    navigate('/'); 
                } catch (e) {
                    console.error(e);
                    if (e.message && e.message.includes("duplicate")) {
                        alert("Vous faites déjà partie de cette famille !");
                        navigate('/');
                    } else {
                        setStatus('error');
                        setErrorMsg(e.message || "Impossible de rejoindre.");
                    }
                }
            } else {
                // Si pas connecté et pas de lien magique en cours -> Formulaire
                if (!isMagicLink) {
                    setStatus('login_required');
                }
            }
        };

        // On lance une première tentative
        attemptJoin();

        // On écoute les changements (connexion via le lien mail ou le formulaire)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                attemptJoin();
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [token, navigate, isMagicLink]);

    // Fonction passée au formulaire pour gérer la connexion manuelle
    const handleLocalLogin = async (email, password) => {
        // Pas de try/catch ici, on laisse l'erreur remonter à AuthScreen
        await authService.login(email, password);
    };

    // --- RENDUS ---

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

    // État "loading" ou "joining" (Spinner)
    return (
        <div style={{height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#12121e', color:'white', gap:'20px'}}>
            <Logo width={80} className="spin" />
            <p style={{fontSize:'1.2rem', color:'#ccc'}}>
                {isMagicLink ? "Validation de votre compte..." : "Connexion à la famille..."}
            </p>
        </div>
    );
};

export default JoinFamily;