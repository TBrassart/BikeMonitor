import React, { useState } from 'react';
import { FaUser, FaLock, FaEnvelope } from 'react-icons/fa';
import { authService } from '../../services/api';
import './AuthScreen.css';
import Logo from '../Layout/Logo';

const AuthScreen = ({ onLogin }) => {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    
    // On utilise isPending partout (pas de setIsLoading !)
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
                // Validation préventive
                if (password.length < 6) {
                    throw new Error("Le mot de passe doit faire au moins 6 caractères.");
                }

                const redirectUrl = inviteToken 
                    ? `${window.location.origin}/join/${inviteToken}`
                    : undefined;

                // On passe l'URL à la fonction signUp mise à jour
                const { error } = await authService.signUp(email, password, fullName, redirectUrl);
                
                if (error) throw error;
                
                alert("Compte créé ! Cliquez sur le lien reçu par email pour valider et rejoindre la famille.");
                
                // Tentative de connexion auto
                try {
                    await onLogin(email, password);
                } catch (loginErr) {
                    setIsLoginMode(true);
                    setErrorMsg("Compte créé. Veuillez vérifier vos emails puis vous connecter.");
                }
            }
        } catch (error) {
            console.error("Erreur Auth:", error);
            // Affiche le vrai message de Supabase (ex: "Password should be at least 6 characters")
            setErrorMsg(error.message || "Une erreur est survenue.");
        } finally {
            setIsPending(false); // Correct (c'était ici que ça plantait avant)
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
                <h2>{isLoginMode ? 'Connexion' : 'Créer un compte'}</h2>
                
                {/* Affichage de l'erreur en rouge */}
                {errorMsg && <div className="error-banner">{errorMsg}</div>}

                <form onSubmit={handleSubmit}>
                    {!isLoginMode && (
                        <div className="input-group">
                            <div className="input-wrapper">
                                <FaUser className="input-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Nom complet (ex: Famille Dupont)" 
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
                                minLength={6} // Aide le navigateur à valider
                            />
                        </div>
                    </div>

                    <button type="submit" className="login-btn" disabled={isPending}>
                        {isPending ? 'Chargement...' : (isLoginMode ? 'Se connecter' : "S'inscrire")}
                    </button>
                </form>

                <p className="signup-link">
                    {isLoginMode ? "Pas encore de compte ?" : "Déjà un compte ?"}
                    <a href="#" onClick={(e) => { e.preventDefault(); setIsLoginMode(!isLoginMode); setErrorMsg(''); }}>
                        {isLoginMode ? " Créer un compte familial" : " Se connecter"}
                    </a>
                </p>
            </div>
        </div>
    );
};

export default AuthScreen;