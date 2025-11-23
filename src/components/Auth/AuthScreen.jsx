import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import './AuthScreen.css';

// NOTE : On ne doit PLUS importer ProfileSelection ici.
// Le but est d'aller directement au Dashboard une fois connecté.

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
            // 1. On vérifie si l'utilisateur est authentifié (Supabase Auth)
            const user = await authService.getCurrentUser();
            
            if (user) {
                // 2. On s'assure qu'il a un profil dans la nouvelle table 'profiles'
                // Si c'est sa première fois, createInitialProfile va le créer auto.
                const profile = await authService.createInitialProfile(user);
                
                // 3. On connecte l'utilisateur immédiatement (SKIP de la sélection de profil)
                onLogin(profile);
            }
        } catch (e) {
            console.error("Erreur vérification utilisateur:", e);
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