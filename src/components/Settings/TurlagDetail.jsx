import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { FaUsers, FaCalendarAlt, FaCog, FaCrown, FaUserShield, FaCopy, FaArrowLeft, FaMapMarkerAlt, FaPlus, FaTimes, FaEdit } from 'react-icons/fa';
import './TurlagDetail.css';

function TurlagDetail() {
    const { turlagId } = useParams();
    const navigate = useNavigate();
    
    const [details, setDetails] = useState(null); // { turlag, members, events }
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    
    // États pour formulaires
    const [showEventForm, setShowEventForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    
    const [eventData, setEventData] = useState({ title: '', date: '', location: '', description: '' });
    const [editData, setEditData] = useState({ name: '', description: '', icon_url: '' });

    useEffect(() => {
        loadData();
    }, [turlagId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const user = await authService.getCurrentUser();
            setCurrentUser(user);
            
            const data = await authService.getTurlagDetails(turlagId);
            setDetails(data);
            
            // Pré-remplir edit form
            setEditData({
                name: data.turlag.name,
                description: data.turlag.description || '',
                icon_url: data.turlag.icon_url || ''
            });
        } catch (e) {
            console.error(e);
            // navigate('/app/turlag'); // Rediriger si erreur
        } finally {
            setLoading(false);
        }
    };

    // --- ACTIONS ADMIN/MODO ---
    const isPrivileged = () => {
        if (!details || !currentUser) return false;
        const me = details.members.find(m => m.user_id === currentUser.id);
        return me && (me.role === 'admin' || me.role === 'moderator');
    };

    const isAdmin = () => {
        if (!details || !currentUser) return false;
        const me = details.members.find(m => m.user_id === currentUser.id);
        return me && me.role === 'admin';
    };

    const handlePromote = async (memberId, currentRole) => {
        if (!isAdmin()) return;
        const newRole = currentRole === 'member' ? 'moderator' : 'member';
        if (window.confirm(`Changer le rôle de ce membre en ${newRole} ?`)) {
            await authService.updateMemberRole(turlagId, memberId, newRole);
            loadData();
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        try {
            await authService.addTurlagEvent({ turlag_id: turlagId, event_date: eventData.date, ...eventData });
            setShowEventForm(false);
            setEventData({ title: '', date: '', location: '', description: '' });
            loadData();
        } catch (e) { alert("Erreur création événement"); }
    };

    const handleUpdateTurlag = async (e) => {
        e.preventDefault();
        try {
            await authService.updateTurlag(turlagId, editData);
            setShowEditForm(false);
            loadData();
        } catch (e) { alert("Erreur modification"); }
    };

    const handleLeave = async () => {
        if (window.confirm("Quitter ce groupe ?")) {
            await authService.leaveTurlag(turlagId);
            navigate('/app/turlag');
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(turlagId);
        alert("Code copié !");
    };

    if (loading || !details) return <div className="loading">Chargement du QG...</div>;

    return (
        <div className="turlag-detail-page">
            {/* HEADER HERO */}
            <div className="turlag-hero glass-panel">
                <button onClick={() => navigate('/app/turlag')} className="back-icon"><FaArrowLeft /></button>
                <div className="hero-content">
                    <div className="turlag-icon-large">
                        {details.turlag.icon_url ? <img src={details.turlag.icon_url} alt="icon" /> : <FaUsers />}
                    </div>
                    <div>
                        <h1>{details.turlag.name}</h1>
                        <p className="turlag-desc">{details.turlag.description}</p>
                    </div>
                </div>
                {isPrivileged() && (
                    <button onClick={() => setShowEditForm(true)} className="edit-btn"><FaCog /></button>
                )}
            </div>

            <div className="turlag-layout">
                {/* COLONNE GAUCHE : MEMBRES & ADMIN */}
                <div className="left-col">
                    
                    {/* CARD INVITATION */}
                    <div className="glass-panel invite-card">
                        <span className="label">Code d'invitation</span>
                        <div className="code-box" onClick={copyCode}>
                            <code>{turlagId.slice(0,8)}...</code>
                            <FaCopy />
                        </div>
                    </div>

                    {/* LISTE MEMBRES */}
                    <div className="glass-panel members-list">
                        <h3>Membres ({details.members.length})</h3>
                        {details.members.map(m => (
                            <div key={m.id} className="member-row">
                                <div className="member-avatar">
                                    {m.profiles?.avatar || m.profiles?.name.charAt(0)}
                                </div>
                                <div className="member-info">
                                    <span className="member-name">{m.profiles?.name}</span>
                                    <span className={`role-tag ${m.role}`}>
                                        {m.role === 'admin' && <FaCrown />}
                                        {m.role === 'moderator' && <FaUserShield />}
                                        {m.role}
                                    </span>
                                </div>
                                {isAdmin() && m.user_id !== currentUser.id && (
                                    <button onClick={() => handlePromote(m.user_id, m.role)} className="promote-btn">
                                        {m.role === 'moderator' ? 'Destituer' : 'Promouvoir'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <button onClick={handleLeave} className="leave-group-btn">Quitter le groupe</button>
                </div>

                {/* COLONNE DROITE : ÉVÉNEMENTS */}
                <div className="right-col">
                    <div className="events-header">
                        <h3>Prochains Événements</h3>
                        {isPrivileged() && (
                            <button onClick={() => setShowEventForm(true)} className="add-event-btn"><FaPlus /> Créer</button>
                        )}
                    </div>

                    {/* FORMULAIRE ÉVÉNEMENT */}
                    {showEventForm && (
                        <div className="glass-panel event-form">
                            <h4>Nouvel Événement</h4>
                            <form onSubmit={handleCreateEvent}>
                                <input type="text" placeholder="Titre (ex: Sortie Longue)" value={eventData.title} onChange={e => setEventData({...eventData, title: e.target.value})} required />
                                <div className="row">
                                    <input type="date" value={eventData.date} onChange={e => setEventData({...eventData, date: e.target.value})} required />
                                    <input type="text" placeholder="Lieu" value={eventData.location} onChange={e => setEventData({...eventData, location: e.target.value})} />
                                </div>
                                <textarea placeholder="Détails..." value={eventData.description} onChange={e => setEventData({...eventData, description: e.target.value})} />
                                <div className="form-actions">
                                    <button type="button" onClick={() => setShowEventForm(false)}>Annuler</button>
                                    <button type="submit" className="primary-btn">Publier</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* LISTE EVENTS */}
                    <div className="events-list">
                        {details.events.length === 0 ? (
                            <p className="empty-text">Aucun événement prévu.</p>
                        ) : (
                            details.events.map(ev => (
                                <div key={ev.id} className="event-card glass-panel">
                                    <div className="event-date-box">
                                        <span className="day">{new Date(ev.event_date).getDate()}</span>
                                        <span className="month">{new Date(ev.event_date).toLocaleDateString('fr-FR', {month:'short'})}</span>
                                    </div>
                                    <div className="event-content">
                                        <h4>{ev.title}</h4>
                                        <div className="event-meta">
                                            <span><FaMapMarkerAlt /> {ev.location || 'Non spécifié'}</span>
                                        </div>
                                        <p>{ev.description}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL EDIT GROUP */}
            {showEditForm && (
                <div className="modal-overlay">
                    <div className="glass-panel modal-content">
                        <h3>Modifier le Groupe</h3>
                        <form onSubmit={handleUpdateTurlag}>
                            <label>Nom</label>
                            <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                            <label>Description</label>
                            <textarea value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} />
                            <label>URL Icône (Optionnel)</label>
                            <input type="text" value={editData.icon_url} onChange={e => setEditData({...editData, icon_url: e.target.value})} placeholder="https://..." />
                            <div className="form-actions">
                                <button type="button" onClick={() => setShowEditForm(false)}>Annuler</button>
                                <button type="submit" className="primary-btn">Sauvegarder</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TurlagDetail;