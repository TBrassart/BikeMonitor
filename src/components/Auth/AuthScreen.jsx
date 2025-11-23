import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import './AuthScreen.css';

function AuthScreen({ onLogin }) {
    const [loading, setLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState(false); // Bascule Login/Register
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    // Vérification de session au chargement
    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const user = await authService.getCurrentUser();
            if (user) {
                // Si connecté, on s'assure que le profil existe et on lance l'app
                const profile = await authService.createInitialProfile(user);
                onLogin(profile);
            }
        } catch (e) {
            console.error("Session check error", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isRegistering) {
                // --- INSCRIPTION ---
                const { user } = await authService.signUp(email, password);
                if (user) {
                    // Parfois Supabase demande une confirmation email, parfois non (selon config)
                    // Si l'user est créé et connecté, on crée son profil
                    await authService.createInitialProfile(user);
                    onLogin(); 
                } else {
                    setMessage("Compte créé ! Vérifie tes emails pour confirmer.");
                    setIsRegistering(false); // On repasse en mode connexion
                }
            } else {
                // --- CONNEXION ---
                const { user } = await authService.signInWithEmail(email, password);
                if (user) {
                    await authService.createInitialProfile(user);
                    onLogin();
                }
            }
        } catch (e) {
            setError(e.message || "Une erreur est survenue");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="auth-loading">Chargement...</div>;

    return (
        <div className="auth-screen">
            <div className="auth-card">
                <h1>BikeMonitor 🚲</h1>
                <p>
                    {isRegistering 
                        ? "Crée ton écurie et rejoins ton Turlag." 
                        : "Gère ton écurie, tes pièces et tes sorties."}
                </p>
                
                {message && <div className="success-msg">{message}</div>}
                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input 
                            type="email" 
                            placeholder="ton@email.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Mot de passe</label>
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                            minLength={6}
                        />
                    </div>

                    <button type="submit" disabled={loading} className="primary-btn">
                        {loading ? 'Chargement...' : (isRegistering ? "S'inscrire" : "Se connecter")}
                    </button>
                </form>

                <div className="auth-footer">
                    <button 
                        className="link-btn" 
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError(null);
                            setMessage(null);
                        }}
                    >
                        {isRegistering 
                            ? "Déjà un compte ? Se connecter" 
                            : "Pas encore de compte ? S'inscrire"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AuthScreen;