import React, { useState } from 'react';
import { FaUser, FaLock, FaEnvelope, FaCheckSquare, FaSquare, FaUserPlus, FaSignInAlt } from 'react-icons/fa';
import { authService } from '../../services/api';
import './AuthScreen.css';
import Logo from '../Layout/Logo';

const AuthScreen = ({ onLogin, isInviteFlow = false, inviteToken = null, forceSignUp = false }) => {
    // On initialise en mode login, sauf si on force l'inscription (lien d'invit)
    const [isLoginMode, setIsLoginMode] = useState(!forceSignUp);
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // Nouveau champ
    const [rememberMe, setRememberMe] = useState(true); // Nouveau champ
    
    const [isPending, setIsPending] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState(''); // Pour la "Popup" de mail

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsPending(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            if (isLoginMode) {
                // --- CONNEXION ---
                await onLogin(email, password);
            } else {
                // --- INSCRIPTION ---
                if (password.length < 6) {
                    throw new Error("Le mot de passe doit faire au moins 6 caractères.");
                }
                if (password !== confirmPassword) {
                    throw new Error("Les mots de passe ne correspondent pas.");
                }

                // On construit l'URL de redirection SI on a un token
                const redirectUrl = inviteToken 
                    ? `${window.location.origin}/join/${inviteToken}`
                    : undefined;

                // Appel à l'inscription
                const { data, error } = await authService.signUp(email, password, '', redirectUrl, inviteToken);
                
                if (error) throw error;

                // LOGIQUE DE SUCCÈS / MAIL
                if (data.user && !data.session) {
                    // Cas : Supabase attend une validation email
                    setSuccessMsg("Compte créé avec succès ! 📧 Vérifie tes emails pour valider ton compte avant de te connecter.");
                    setIsLoginMode(true); // On bascule sur l'écran de connexion
                    setPassword('');
                    setConfirmPassword('');
                } else if (data.user && data.session) {
                    // Cas : Connexion directe (si email confirm désactivé)
                    // On laisse le composant parent gérer la suite via le callback ou le reload
                    window.location.reload(); 
                }
            }
        } catch (error) {
            console.error(error);
            let msg = error.message || "Une erreur est survenue.";
            if (msg.includes("User already registered")) msg = "Cet email est déjà utilisé.";
            if (msg.includes("Invalid login")) msg = "Email ou mot de passe incorrect.";
            setErrorMsg(msg);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="auth-screen">
            {/* Animation de fond */}
            <div className="bg-glow glow-1"></div>
            <div className="bg-glow glow-2"></div>

            <div className="auth-card glass-panel">
                <div className="auth-brand">
                    <div className="logo-wrapper">
                         <Logo width={60} height={60} />
                    </div>
                    <h1>BikeMonitor</h1>
                    <p className="subtitle">
                        {isInviteFlow 
                            ? "Rejoignez votre équipe !" 
                            : (isLoginMode ? "Heureux de vous revoir" : "Créez votre écurie")}
                    </p>
                </div>
                
                {/* MESSAGE DE SUCCÈS (POPUP VERTE) */}
                {successMsg && (
                    <div className="auth-message success">
                        {successMsg}
                    </div>
                )}

                {/* MESSAGE D'ERREUR (POPUP ROUGE) */}
                {errorMsg && (
                    <div className="auth-message error">
                        {errorMsg}
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit}>
                    
                    <div className="input-group">
                        <div className="input-icon"><FaEnvelope /></div>
                        <input 
                            type="email" 
                            placeholder="Email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isPending}
                        />
                    </div>

                    <div className="input-group">
                        <div className="input-icon"><FaLock /></div>
                        <input 
                            type="password" 
                            placeholder="Mot de passe" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isPending}
                            minLength={6}
                        />
                    </div>

                    {/* CHAMP CONFIRMATION (Seulement en inscription) */}
                    {!isLoginMode && (
                        <div className="input-group slide-in">
                            <div className="input-icon"><FaLock /></div>
                            <input 
                                type="password" 
                                placeholder="Confirmer le mot de passe" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isPending}
                            />
                        </div>
                    )}

                    {/* SE SOUVENIR DE MOI (Seulement en connexion) */}
                    {isLoginMode && (
                        <div className="remember-me" onClick={() => setRememberMe(!rememberMe)}>
                            {rememberMe ? <FaCheckSquare className="check-icon active" /> : <FaSquare className="check-icon" />}
                            <span>Se souvenir de moi</span>
                        </div>
                    )}

                    <button type="submit" className="login-btn" disabled={isPending}>
                        {isPending ? <span className="loader"></span> : (
                            isLoginMode 
                                ? <><FaSignInAlt /> Se connecter</> 
                                : <><FaUserPlus /> {isInviteFlow ? "Rejoindre" : "S'inscrire"}</>
                        )}
                    </button>
                </form>

                {/* LIEN DE BASCULE (Caché si inscription forcée par invitation) */}
                {!forceSignUp && (
                    <p className="signup-link">
                        {isLoginMode ? "Pas encore de compte ?" : "Déjà un compte ?"}
                        <button 
                            className="switch-btn" 
                            onClick={() => { 
                                setIsLoginMode(!isLoginMode); 
                                setErrorMsg(''); 
                                setSuccessMsg('');
                            }}
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