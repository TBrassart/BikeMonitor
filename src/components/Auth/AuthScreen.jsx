import React, { useState } from 'react';
import { authService } from '../../services/api';
import './AuthScreen.css';

function AuthScreen({ onLogin }) {
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isRegister) {
                // Inscription
                const { user } = await authService.signUp(email, password);
                if (user) {
                    // Création auto du profil et connexion
                    const profile = await authService.getMyProfile();
                    onLogin(profile);
                }
            } else {
                // Connexion
                const { user } = await authService.signInWithEmail(email, password);
                if (user) {
                    // Récupération auto du profil et connexion
                    const profile = await authService.getMyProfile();
                    onLogin(profile);
                }
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-screen">
            <div className="auth-card">
                <h1>BikeMonitor 🚲</h1>
                <p>{isRegister ? "Rejoins le peloton." : "Connecte-toi à ton écurie."}</p>

                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>Mot de passe</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            required 
                            minLength={6}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="primary-btn">
                        {loading ? 'Chargement...' : (isRegister ? "S'inscrire" : "Se connecter")}
                    </button>
                </form>

                <button className="link-btn" onClick={() => setIsRegister(!isRegister)}>
                    {isRegister ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
                </button>
            </div>
        </div>
    );
}

export default AuthScreen;