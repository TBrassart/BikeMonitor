import React, { useState } from 'react';
import { FaUser, FaLock, FaEnvelope } from 'react-icons/fa';
import { authService } from '../../services/api';
import './AuthScreen.css';
import Logo from '../Layout/Logo';

// CORRECTION ICI : Ajout de 'inviteToken' dans les props
const AuthScreen = ({ onLogin, isInviteFlow = false, inviteToken = null, forceSignUp = false }) => {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    
    const [isPending, setIsPending] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsPending(true);
        setErrorMsg('');

        try {
            if (isLoginMode) {
                await onLogin(email, password);
            } else {
                // --- INSCRIPTION ---
                if (password.length < 6) {
                    throw new Error("Le mot de passe doit faire au moins 6 caractères.");
                }

                // On construit l'URL de redirection SI on a un token
                const redirectUrl = inviteToken 
                    ? `${window.location.origin}/join/${inviteToken}`
                    : undefined;

                // On passe l'URL à la fonction signUp (qui a été mise à jour dans api.js)
                const { error } = await authService.signUp(email, password, fullName, redirectUrl, inviteToken);
                
                if (error) throw error;
                
                alert("Compte créé ! Cliquez sur le lien reçu par email pour valider et rejoindre la famille.");
                
                try {
                    await onLogin(email, password);
                } catch (loginErr) {
                    setIsLoginMode(true);
                    setErrorMsg("Compte créé. Vérifiez vos emails.");
                }
            }
        } catch (error) {
            console.error("Erreur Auth:", error);
            setErrorMsg(error.message || "Une erreur est survenue.");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="auth-screen">
            <div className="auth-brand">
                <Logo width={80} height={80} />
                <h1>BikeMonitor</h1>
            </div>
            
            <p className="subtitle">Assistant intelligent pour la famille cycliste.</p>
            
            <div className="login-form">
                <h2>{isLoginMode ? 'Connexion' : (isInviteFlow ? 'Créer mon profil invité' : 'Créer un compte')}</h2>                
                {errorMsg && <div className="error-banner">{errorMsg}</div>}

                <form onSubmit={handleSubmit}>
                    {!isLoginMode && (
                        <div className="input-group">
                            <div className="input-wrapper">
                                <FaUser className="input-icon" />
                                <input 
                                    type="text" 
                                    placeholder={isInviteFlow ? "Votre Prénom et Nom" : "Nom de la famille (ex: Famille Dupont)"} 
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required={!isLoginMode}
                                    disabled={isPending}
                                />
                            </div>
                        </div>
                    )}

                    <div className="input-group">
                        <div className="input-wrapper">
                            <FaEnvelope className="input-icon" />
                            <input 
                                type="email" 
                                placeholder="Email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isPending}
                            />
                        </div>
                    </div>
                    
                    <div className="input-group">
                        <div className="input-wrapper">
                            <FaLock className="input-icon" />
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
                    </div>

                    <button type="submit" className="login-btn" disabled={isPending}>
                        {isPending ? 'Chargement...' : (isLoginMode ? 'Se connecter' : (isInviteFlow ? "Rejoindre la famille" : "S'inscrire"))}
                    </button>
                </form>

                {/* ON CACHE LE LIEN DE SWITCH SI L'INSCRIPTION EST FORCÉE */}
                {!forceSignUp && (
                    <p className="signup-link">
                        {isLoginMode ? "Pas encore de compte ?" : "Déjà un compte ?"}
                        <a href="#" onClick={(e) => { e.preventDefault(); setIsLoginMode(!isLoginMode); setErrorMsg(''); }}>
                            {isLoginMode ? " Créer un compte familial" : " Se connecter"}
                        </a>
                    </p>
                )}
                {/* Le lien de switch doit être visible seulement si on n'est pas en mode Forcé */}
                {/* ... sinon le reste de AuthScreen gère le switch ... */}
            </div>
        </div>
    );
};

export default AuthScreen;