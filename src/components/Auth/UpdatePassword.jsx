import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { FaLock, FaSave } from 'react-icons/fa';
import Logo from '../Layout/Logo';
import './AuthScreen.css'; // On réutilise le même CSS

const UpdatePassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authService.updateUserPassword(password);
            setMsg({ type: 'success', text: 'Mot de passe mis à jour ! Redirection...' });
            setTimeout(() => {
                navigate('/app/dashboard');
            }, 2000);
        } catch (error) {
            setMsg({ type: 'error', text: 'Erreur lors de la mise à jour.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-screen">
            <div className="bg-glow glow-1"></div>
            <div className="auth-card glass-panel">
                <div className="auth-brand">
                    <div className="logo-wrapper"><Logo width={60} height={60} /></div>
                    <h1>Nouveau Mot de Passe</h1>
                </div>

                {msg && <div className={`auth-message ${msg.type}`}>{msg.text}</div>}

                <form className="login-form" onSubmit={handleUpdate}>
                    <div className="input-group">
                        <div className="input-icon"><FaLock /></div>
                        <input 
                            type="password" placeholder="Nouveau mot de passe" 
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            required minLength={6}
                        />
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? '...' : <><FaSave /> Enregistrer</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UpdatePassword;