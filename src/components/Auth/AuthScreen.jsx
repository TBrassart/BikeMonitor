import React, { useState } from 'react';
import { authService } from '../../services/api';
import { FaEnvelope, FaLock, FaUserPlus, FaSignInAlt, FaCheckSquare, FaSquare } from 'react-icons/fa';
// Import du Logo existant
import Logo from '../Layout/Logo'; 
import './AuthScreen.css';

function AuthScreen({ onLogin }) {
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // État du formulaire unifié
    const [formData, setFormData] = useState({ 
        email: '', 
        password: '', 
        confirmPassword: '' 
    });
    const [rememberMe, setRememberMe] = useState(true); // Par défaut sur "Se souvenir"
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isRegister) {
                // --- VALIDATION INSCRIPTION ---
                if (formData.password !== formData.confirmPassword) {
                    throw new Error("Les mots de passe ne correspondent pas.");
                }
                if (formData.password.length < 6) {
                    throw new Error("Le mot de passe doit faire au moins 6 caractères.");
                }

                const { user } = await authService.signUp(formData.email, formData.password);
                if (user) {
                    const profile = await authService.getMyProfile();
                    onLogin(profile);
                }
            } else {
                // --- CONNEXION ---
                // Note: Supabase gère la persistance 'Remember Me' par défaut (localStorage)
                // Pour l'instant, la checkbox est visuelle.
                const { user } = await authService.signInWithEmail(formData.email, formData.password);
                if (user) {
                    const profile = await authService.getMyProfile();
                    onLogin(profile);
                }
            }
        } catch (err) {
            console.error(err);
            // Message d'erreur plus propre
            let msg = err.message;
            if (err.message.includes("Invalid login credentials")) msg = "Email ou mot de passe incorrect.";
            if (err.message.includes("User already registered")) msg = "Cet email est déjà utilisé.";
            setError(msg || "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    // Réinitialiser les champs lors du changement de mode
    const toggleMode = () => {
        setIsRegister(!isRegister);
        setError(null);
        setFormData({ email: '', password: '', confirmPassword: '' });
    };

    return (
        <div className="auth-container">
            {/* HALOS LUMINEUX (Ajustés dans le CSS) */}
            <div className="bg-glow glow-1"></div>
            <div className="bg-glow glow-2"></div>

            <div className="auth-card glass-panel">
                
                {/* HEADER AVEC LE LOGO EXISTANT */}
                <div className="auth-header">
                    <div className="auth-logo-wrapper">
                       <Logo />
                    </div>
                    <p className="auth-subtitle">
                        {isRegister ? "Rejoins le peloton." : "Content de te revoir, pilote."}
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
                        />
                    </div>

                    {/* CHAMP CONFIRMATION (Inscription uniquement) */}
                    {isRegister && (
                        <div className="input-wrapper slide-in">
                            <FaLock className="input-icon" />
                            <input 
                                type="password" 
                                name="confirmPassword"
                                placeholder="Confirmer le mot de passe" 
                                value={formData.confirmPassword} 
                                onChange={handleChange} 
                                required={isRegister}
                            />
                        </div>
                    )}

                    {/* OPTION REMEMBER ME (Connexion uniquement) */}
                    {!isRegister && (
                        <div className="remember-me-row" onClick={() => setRememberMe(!rememberMe)}>
                            {rememberMe ? <FaCheckSquare className="checkbox-icon checked" /> : <FaSquare className="checkbox-icon" />}
                            <span>Se souvenir de moi</span>
                        </div>
                    )}

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
                    <button className="switch-btn" onClick={toggleMode}>
                        {isRegister ? "Se connecter" : "S'inscrire"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AuthScreen;