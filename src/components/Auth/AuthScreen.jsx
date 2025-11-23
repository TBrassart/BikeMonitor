import React, { useState } from 'react';
import { authService } from '../../services/api';
import { FaBolt, FaEnvelope, FaLock, FaUserPlus, FaSignInAlt } from 'react-icons/fa';
import './AuthScreen.css';

function AuthScreen({ onLogin }) {
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(null); // On efface l'erreur quand l'utilisateur tape
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isRegister) {
                // INSCRIPTION
                const { user } = await authService.signUp(formData.email, formData.password);
                if (user) {
                    // On connecte direct après l'inscription
                    const profile = await authService.getMyProfile();
                    onLogin(profile);
                }
            } else {
                // CONNEXION
                const { user } = await authService.signInWithEmail(formData.email, formData.password);
                if (user) {
                    const profile = await authService.getMyProfile();
                    onLogin(profile);
                }
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Identifiants incorrects ou erreur réseau.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass-panel">
                
                {/* HEADER LOGO */}
                <div className="auth-header">
                    <div className="logo-circle">
                        <FaBolt />
                    </div>
                    <h1 className="gradient-text">BikeMonitor</h1>
                    <p className="auth-subtitle">
                        {isRegister ? "Rejoins le peloton." : "Pilote ton écurie."}
                    </p>
                </div>

                {/* ERROR BOX */}
                {error && <div className="auth-error">{error}</div>}

                {/* FORMULAIRE */}
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-wrapper">
                        <FaEnvelope className="input-icon" />
                        <input 
                            type="email" 
                            name="email"
                            placeholder="Email" 
                            value={formData.email} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                    
                    <div className="input-wrapper">
                        <FaLock className="input-icon" />
                        <input 
                            type="password" 
                            name="password"
                            placeholder="Mot de passe" 
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                            minLength={6}
                        />
                    </div>

                    <button type="submit" className="primary-btn auth-submit-btn" disabled={loading}>
                        {loading ? <span className="loader"></span> : (
                            isRegister ? <><FaUserPlus /> Créer le compte</> : <><FaSignInAlt /> Se connecter</>
                        )}
                    </button>
                </form>

                {/* FOOTER SWITCH */}
                <div className="auth-footer">
                    <p>
                        {isRegister ? "Déjà membre ?" : "Pas encore de compte ?"}
                    </p>
                    <button 
                        className="switch-btn" 
                        onClick={() => { setIsRegister(!isRegister); setError(null); }}
                    >
                        {isRegister ? "Se connecter" : "S'inscrire"}
                    </button>
                </div>
            </div>
            
            {/* DÉCORATION DE FOND (Optionnel) */}
            <div className="bg-glow glow-1"></div>
            <div className="bg-glow glow-2"></div>
        </div>
    );
}

export default AuthScreen;