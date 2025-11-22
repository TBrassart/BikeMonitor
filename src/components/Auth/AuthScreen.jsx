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
                const { error } = await authService.signUp(email, password, fullName);
                if (error) throw error;
                alert("Compte créé ! Vérifiez vos emails pour confirmer (si activé) ou connectez-vous.");
                setIsLoginMode(true);
            }
        } catch (error) {
            console.error(error);
            setErrorMsg(error.message || "Une erreur est survenue.");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="auth-screen">
            {/* LOGO ET TITRE */}
            <div className="auth-brand">
                <Logo width={80} height={80} />
                <h1>BikeMonitor</h1>
            </div>
            
            <p className="subtitle">Assistant intelligent pour la famille cycliste.</p>
            
            <div className="login-form">
                <h2>{isLoginMode ? 'Connexion' : 'Créer un compte'}</h2>
                
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
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button type="submit" className="login-btn" disabled={isPending}>
                        {isPending ? 'Chargement...' : (isLoginMode ? 'Se connecter' : "S'inscrire")}
                    </button>
                </form>

                <p className="signup-link">
                    {isLoginMode ? "Pas encore de compte ?" : "Déjà un compte ?"}
                    <a href="#" onClick={(e) => { e.preventDefault(); setIsLoginMode(!isLoginMode); }}>
                        {isLoginMode ? " Créer un compte familial" : " Se connecter"}
                    </a>
                </p>
            </div>
        </div>
    );
};

export default AuthScreen;