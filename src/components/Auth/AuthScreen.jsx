import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import './AuthScreen.css';
// On a supprimé l'import de ProfileSelection car il n'est plus utile

function AuthScreen({ onLogin }) {
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const user = await authService.getCurrentUser();
            if (user) {
                // L'utilisateur est authentifié techniquement
                // On vérifie s'il a un profil applicatif (table profiles)
                // S'il n'en a pas (première connexion), on le crée automatiquement
                const profile = await authService.createInitialProfile(user);
                
                // On notifie l'app qu'on est prêt
                onLogin(profile);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await authService.signInWithEmail(email);
            if (error) throw error;
            setSent(true);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="auth-loading">Chargement...</div>;
    }

    if (sent) {
        return (
            <div className="auth-screen">
                <div className="auth-card">
                    <h2>Vérifie tes emails ! 📧</h2>
                    <p>Un lien magique a été envoyé à <strong>{email}</strong>.</p>
                    <p>Clique dessus pour te connecter instantanément.</p>
                    <button onClick={() => setSent(false)} className="secondary-btn">
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-screen">
            <div className="auth-card">
                <h1>BikeMonitor 🚲</h1>
                <p>Gère ton écurie, tes pièces et tes sorties.</p>
                
                <form onSubmit={handleLogin}>
                    <input 
                        type="email" 
                        placeholder="ton@email.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Envoi...' : 'Recevoir mon lien magique'}
                    </button>
                </form>
                
                {error && <div className="error-msg">{error}</div>}
            </div>
        </div>
    );
}

export default AuthScreen;