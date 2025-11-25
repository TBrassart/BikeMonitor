import React, { useState } from 'react';
import { authService } from '../../services/api';
import { FaEnvelope, FaLock, FaUserPlus, FaSignInAlt, FaCheckSquare, FaSquare, FaPaperPlane, FaArrowLeft } from 'react-icons/fa';
import Logo from '../Layout/Logo'; 
import './AuthScreen.css';

const AuthScreen = ({ onLogin, isInviteFlow = false, inviteToken = null, forceSignUp = false }) => {
    const [isLoginMode, setIsLoginMode] = useState(!forceSignUp);
    const [isForgotMode, setIsForgotMode] = useState(false); // Nouveau mode
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    
    const [isPending, setIsPending] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsPending(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            if (isForgotMode) {
                // --- MOT DE PASSE OUBLIÉ ---
                await authService.resetPasswordForEmail(email);
                setSuccessMsg("Email de récupération envoyé ! Vérifie ta boîte de réception.");
                // On ne change pas de mode tout de suite pour laisser lire le message
            } 
            else if (isLoginMode) {
                // --- CONNEXION ---
                await authService.signInWithEmail(email, password);
                if (onLogin) await onLogin();
            } else {
                // --- INSCRIPTION ---
                if (password.length < 6) throw new Error("Le mot de passe doit faire au moins 6 caractères.");
                if (password !== confirmPassword) throw new Error("Les mots de passe ne correspondent pas.");

                const redirectUrl = inviteToken ? `${window.location.origin}/join/${inviteToken}` : undefined;
                const { data, error } = await authService.signUp(email, password, '', redirectUrl, inviteToken);
                if (error) throw error;

                if (data.user && !data.session) {
                    setSuccessMsg("Compte créé ! 📧 Vérifie tes emails pour valider.");
                    setIsLoginMode(true);
                    setPassword('');
                    setConfirmPassword('');
                } else if (data.user && data.session) {
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error(error);
            let msg = error.message || "Une erreur est survenue.";
            if (msg.includes("Invalid login")) msg = "Email ou mot de passe incorrect.";
            if (msg.includes("User already registered")) msg = "Cet email est déjà utilisé.";
            setErrorMsg(msg);
        } finally {
            setIsPending(false);
        }
    };

    // Titre dynamique
    let title = "Heureux de vous revoir";
    if (!isLoginMode) title = "Créez votre écurie";
    if (isForgotMode) title = "Récupération";

    return (
        <div className="auth-screen">
            <div className="bg-glow glow-1"></div>
            <div className="bg-glow glow-2"></div>

            <div className="auth-card glass-panel">
                <div className="auth-brand">
                    <div className="logo-wrapper"><Logo width={60} height={60} /></div>
                    <h1>BikeMonitor</h1>
                    <p className="subtitle">{isInviteFlow ? "Rejoignez votre équipe !" : title}</p>
                </div>
                
                {successMsg && <div className="auth-message success">{successMsg}</div>}
                {errorMsg && <div className="auth-message error">{errorMsg}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    
                    <div className="input-group">
                        <div className="input-icon"><FaEnvelope /></div>
                        <input 
                            type="email" placeholder="Email" 
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            required disabled={isPending}
                        />
                    </div>

                    {!isForgotMode && (
                        <div className="input-group slide-in">
                            <div className="input-icon"><FaLock /></div>
                            <input 
                                type="password" placeholder="Mot de passe" 
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                required disabled={isPending} minLength={6}
                            />
                        </div>
                    )}

                    {!isLoginMode && !isForgotMode && (
                        <div className="input-group slide-in">
                            <div className="input-icon"><FaLock /></div>
                            <input 
                                type="password" placeholder="Confirmer le mot de passe" 
                                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                required disabled={isPending}
                            />
                        </div>
                    )}

                    {/* OPTIONS DE CONNEXION */}
                    {isLoginMode && !isForgotMode && (
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'5px'}}>
                            <div className="remember-me" onClick={() => setRememberMe(!rememberMe)}>
                                {rememberMe ? <FaCheckSquare className="check-icon active" /> : <FaSquare className="check-icon" />}
                                <span>Se souvenir</span>
                            </div>
                            <button type="button" className="forgot-link" onClick={() => {setIsForgotMode(true); setErrorMsg(''); setSuccessMsg('');}}>
                                Mot de passe oublié ?
                            </button>
                        </div>
                    )}

                    {/* BOUTON D'ACTION PRINCIPAL */}
                    <button type="submit" className="login-btn" disabled={isPending}>
                        {isPending ? <span className="loader"></span> : (
                            isForgotMode ? <><FaPaperPlane /> Envoyer le lien</> :
                            isLoginMode ? <><FaSignInAlt /> Se connecter</> : 
                            <><FaUserPlus /> {isInviteFlow ? "Rejoindre" : "S'inscrire"}</>
                        )}
                    </button>

                    {/* BOUTON RETOUR (Mode Forgot) */}
                    {isForgotMode && (
                        <button type="button" className="switch-btn" style={{marginTop:'15px'}} onClick={() => setIsForgotMode(false)}>
                            <FaArrowLeft /> Retour à la connexion
                        </button>
                    )}
                </form>

                {/* LIEN DE BASCULE LOGIN/REGISTER */}
                {!forceSignUp && !isForgotMode && (
                    <p className="signup-link">
                        {isLoginMode ? "Pas encore de compte ?" : "Déjà un compte ?"}
                        <button 
                            className="switch-btn" 
                            onClick={() => { setIsLoginMode(!isLoginMode); setErrorMsg(''); setSuccessMsg(''); }}
                        >
                            {isLoginMode ? "Créer un compte" : "Se connecter"}
                        </button>
                    </p>
                )}
            </div>
        </div>
    );
};

export default AuthScreen;