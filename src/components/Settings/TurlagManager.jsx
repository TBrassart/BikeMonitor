import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import { FaUsers, FaPlus, FaSignInAlt, FaCopy, FaCrown, FaTrash, FaTimes } from 'react-icons/fa';
import './TurlagManager.css';

function TurlagManager() {
    const [turlags, setTurlags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'create', 'join'
    
    const [formData, setFormData] = useState({ name: '', description: '', code: '' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        loadTurlags();
    }, []);

    const loadTurlags = async () => {
        try {
            setLoading(true);
            const data = await authService.getMyTurlags();
            setTurlags(data || []);
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
            resetView();
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
            resetView();
        } catch (e) {
            setError(e.message || "Code invalide ou déjà membre.");
        }
    };

    const handleLeave = async (turlagId, turlagName) => {
        if (!window.confirm(`Quitter l'équipe "${turlagName}" ?`)) return;
        try {
            await authService.leaveTurlag(turlagId);
            loadTurlags();
        } catch (e) {
            alert("Erreur lors du départ.");
        }
    };

    const resetView = () => {
        setView('list');
        setFormData({ name: '', description: '', code: '' });
        loadTurlags();
        setTimeout(() => setSuccess(null), 3000);
    };

    const copyCode = (id) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) return <div className="loading-state">Chargement des équipes...</div>;

    return (
        <div className="turlag-manager">
            {/* HEADER ACTIONS */}
            <div className="turlag-actions-header">
                {view === 'list' ? (
                    <>
                        <button onClick={() => setView('create')} className="action-card glass-panel create">
                            <div className="icon-circle"><FaPlus /></div>
                            <span>Créer une équipe</span>
                        </button>
                        <button onClick={() => setView('join')} className="action-card glass-panel join">
                            <div className="icon-circle"><FaSignInAlt /></div>
                            <span>Rejoindre via code</span>
                        </button>
                    </>
                ) : (
                    <button onClick={() => setView('list')} className="secondary-btn back-btn">
                        <FaTimes /> Annuler
                    </button>
                )}
            </div>

            {/* NOTIFICATIONS */}
            {success && <div className="message-box success">{success}</div>}
            {error && <div className="message-box error">{error}</div>}

            {/* --- VUE LISTE --- */}
            {view === 'list' && (
                <div className="turlags-grid">
                    {turlags.length === 0 ? (
                        <div className="empty-state glass-panel">
                            <FaUsers className="empty-icon" />
                            <p>Tu ne fais partie d'aucun Turlag.</p>
                            <small>Crée ton peloton ou rejoins tes amis !</small>
                        </div>
                    ) : (
                        turlags.map(turlag => {
                            // Note: L'API doit renvoyer le role, sinon on suppose membre
                            const isAdmin = turlag.created_by_me || false; 

                            return (
                                <div key={turlag.id} className="turlag-card glass-panel">
                                    <div className="card-header">
                                        <h3>{turlag.name}</h3>
                                        {isAdmin && <span className="role-badge admin"><FaCrown /> Admin</span>}
                                    </div>
                                    
                                    <p className="turlag-desc">{turlag.description || "Pas de description"}</p>
                                    
                                    <div className="code-section">
                                        <span className="code-label">Code d'invitation :</span>
                                        <button 
                                            onClick={() => copyCode(turlag.id)} 
                                            className={`copy-btn ${copiedId === turlag.id ? 'copied' : ''}`}
                                        >
                                            {copiedId === turlag.id ? 'Copié !' : <><FaCopy /> {turlag.id.slice(0, 8)}...</>}
                                        </button>
                                    </div>

                                    <div className="card-footer">
                                        <button onClick={() => handleLeave(turlag.id, turlag.name)} className="leave-btn">
                                            <FaTrash /> Quitter
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* --- VUE CRÉATION --- */}
            {view === 'create' && (
                <div className="form-container glass-panel">
                    <h3>Nouveau Turlag</h3>
                    <form onSubmit={handleCreate}>
                        <div className="form-group">
                            <label>Nom de l'équipe</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Les Grimpeurs du Dimanche" 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Description / Devise</label>
                            <input 
                                type="text" 
                                placeholder="Pain, No Gain..." 
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                        <button type="submit" className="primary-btn full-width">Lancer l'équipe 🚀</button>
                    </form>
                </div>
            )}

            {/* --- VUE REJOINDRE --- */}
            {view === 'join' && (
                <div className="form-container glass-panel">
                    <h3>Rejoindre une équipe</h3>
                    <p className="info-text">Demande le code d'invitation (UUID) à l'admin du groupe.</p>
                    <form onSubmit={handleJoin}>
                        <div className="form-group">
                            <label>Code d'invitation</label>
                            <input 
                                type="text" 
                                placeholder="Colle le code ici..." 
                                value={formData.code}
                                onChange={e => setFormData({...formData, code: e.target.value})}
                                required 
                            />
                        </div>
                        <button type="submit" className="primary-btn full-width">Rejoindre maintenant</button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default TurlagManager;