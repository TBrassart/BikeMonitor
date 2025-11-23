// src/components/Settings/TurlagManager.jsx
import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import './TurlagManager.css'; // On créera le CSS juste après

function TurlagManager() {
    const [turlags, setTurlags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'create', 'join'
    const [formData, setFormData] = useState({ name: '', description: '', code: '' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        loadTurlags();
    }, []);

    const loadTurlags = async () => {
        try {
            setLoading(true);
            const data = await authService.getMyTurlags();
            setTurlags(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await authService.createTurlag(formData.name, formData.description);
            setSuccess("Turlag créé ! 🎉");
            setView('list');
            setFormData({ name: '', description: '', code: '' });
            loadTurlags();
        } catch (e) {
            setError("Erreur lors de la création.");
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await authService.joinTurlag(formData.code);
            setSuccess("Tu as rejoint le Turlag ! 🚴");
            setView('list');
            setFormData({ name: '', description: '', code: '' });
            loadTurlags();
        } catch (e) {
            setError(e.message || "Code invalide ou déjà membre.");
        }
    };

    const copyCode = (id) => {
        navigator.clipboard.writeText(id);
        setSuccess("Code copié ! Partage-le à tes amis.");
        setTimeout(() => setSuccess(null), 3000);
    };

    if (loading) return <div>Chargement de tes équipes...</div>;

    return (
        <div className="turlag-manager">
            {success && <div className="success-toast">{success}</div>}
            
            {view === 'list' && (
                <>
                    <div className="turlag-actions">
                        <button onClick={() => setView('create')} className="primary-btn">
                            + Nouveau Turlag
                        </button>
                        <button onClick={() => setView('join')} className="secondary-btn">
                            Rejoindre un groupe
                        </button>
                    </div>

                    <div className="turlags-list">
                        {turlags.length === 0 ? (
                            <div className="empty-state">
                                <p>Tu ne fais partie d'aucun Turlag pour l'instant.</p>
                                <p>Crée le tien ou rejoins tes amis !</p>
                            </div>
                        ) : (
                            turlags.map(turlag => (
                                <div key={turlag.id} className="turlag-card">
                                    <div className="turlag-info">
                                        <h3>{turlag.name}</h3>
                                        <p>{turlag.description}</p>
                                    </div>
                                    <div className="turlag-code-section">
                                        <span>Code d'invitation :</span>
                                        <button onClick={() => copyCode(turlag.id)} className="code-btn">
                                            Copier 📋
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {view === 'create' && (
                <div className="turlag-form">
                    <h3>Créer une nouvelle équipe</h3>
                    <form onSubmit={handleCreate}>
                        <label>Nom du Turlag</label>
                        <input 
                            type="text" 
                            placeholder="Ex: Team Dimanche" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            required 
                        />
                        <label>Description (optionnel)</label>
                        <input 
                            type="text" 
                            placeholder="Nos sorties épiques..." 
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                        <div className="form-buttons">
                            <button type="button" onClick={() => setView('list')}>Annuler</button>
                            <button type="submit" className="primary-btn">Créer</button>
                        </div>
                    </form>
                    {error && <p className="error">{error}</p>}
                </div>
            )}

            {view === 'join' && (
                <div className="turlag-form">
                    <h3>Rejoindre une équipe</h3>
                    <form onSubmit={handleJoin}>
                        <label>Code d'invitation (ID du Turlag)</label>
                        <input 
                            type="text" 
                            placeholder="Colle le code ici..." 
                            value={formData.code}
                            onChange={e => setFormData({...formData, code: e.target.value})}
                            required 
                        />
                        <div className="form-buttons">
                            <button type="button" onClick={() => setView('list')}>Annuler</button>
                            <button type="submit" className="primary-btn">Rejoindre</button>
                        </div>
                    </form>
                    {error && <p className="error">{error}</p>}
                </div>
            )}
        </div>
    );
}

export default TurlagManager;