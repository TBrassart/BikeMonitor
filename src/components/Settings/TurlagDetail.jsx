import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { FaUsers, FaCalendarAlt, FaCog, FaCrown, FaUserShield, FaCopy, FaArrowLeft, FaMapMarkerAlt, FaPlus, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';
import './TurlagDetail.css';
import TurlagAdmin from './TurlagAdmin';

function TurlagDetail() {
    const { turlagId } = useParams();
    const navigate = useNavigate();
    
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    
    const [showAdminModal, setShowAdminModal] = useState(false);
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
            setEditData({ name: data.turlag.name, description: data.turlag.description || '', icon_url: data.turlag.icon_url || '' });
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    // --- LOGIQUE ADMIN ---
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

    // PROMOUVOIR
    const handlePromote = async (memberId, currentRole) => {
        if (!isAdmin()) return;
        const newRole = currentRole === 'member' ? 'moderator' : 'member';
        if (window.confirm(`Changer le rôle de ce membre en ${newRole} ?`)) {
            try {
                await authService.updateMemberRole(turlagId, memberId, newRole);
                loadData();
            } catch (e) { alert("Erreur droits insuffisants"); }
        }
    };

    // ÉJECTER (NOUVEAU)
    const handleKick = async (memberId, memberName) => {
        if (!isAdmin()) return;
        if (window.confirm(`Bannir ${memberName} du groupe ?`)) {
            try {
                await authService.kickMember(turlagId, memberId);
                loadData();
            } catch (e) { alert("Erreur lors de l'éjection."); }
        }
    };

    // QUITTER
    const handleLeave = async () => {
        if (window.confirm("Quitter ce groupe ?")) {
            await authService.leaveTurlag(turlagId);
            navigate('/app/turlag');
        }
    };

    // ... (Garder handleCreateEvent, handleUpdateTurlag, copyCode comme avant) ...
    const handleCreateEvent = async (e) => { e.preventDefault(); await authService.addTurlagEvent({ turlag_id: turlagId, event_date: eventData.date, ...eventData }); setShowEventForm(false); loadData(); };
    const handleUpdateTurlag = async (e) => { e.preventDefault(); await authService.updateTurlag(turlagId, editData); setShowEditForm(false); loadData(); };
    const copyCode = () => { navigator.clipboard.writeText(turlagId); alert("Code copié !"); };

    if (loading || !details) return <div className="loading">Chargement du QG...</div>;

    return (
        <div className="turlag-detail-page">
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
                    <button onClick={() => setShowAdminModal(true)} className="edit-btn" title="Administration">
                        <FaCog />
                    </button>
                )}
            </div>

            <div className="turlag-layout">
                <div className="left-col">
                    <div className="glass-panel members-list">
                        <h3>Membres ({details.members.length})</h3>
                        {details.members.map(m => (
                            <div key={m.id} className="member-row">
                                <div className="member-avatar">{m.profiles?.avatar || '👤'}</div>
                                <div className="member-info">
                                    <span className="member-name">{m.profiles?.name}</span>
                                    <span className={`role-tag ${m.role}`}>
                                        {m.role === 'admin' && <FaCrown />}
                                        {m.role === 'moderator' && <FaUserShield />}
                                        {m.role}
                                    </span>
                                </div>
                                
                                {/* ACTIONS ADMIN (Promouvoir / Éjecter) */}
                                {isAdmin() && m.user_id !== currentUser.id && (
                                    <div style={{display:'flex', gap:'5px'}}>
                                        <button onClick={() => handlePromote(m.user_id, m.role)} className="promote-btn" title="Changer Rôle">
                                            {m.role === 'moderator' ? 'Destituer' : 'Promouvoir'}
                                        </button>
                                        <button onClick={() => handleKick(m.user_id, m.profiles?.name)} className="kick-btn" title="Éjecter">
                                            <FaTrash />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <button onClick={handleLeave} className="leave-group-btn">Quitter le groupe</button>
                </div>

                <div className="right-col">
                    <div className="events-header">
                        <h3>Prochains Événements</h3>
                        {isPrivileged() && <button onClick={() => setShowEventForm(true)} className="add-event-btn"><FaPlus /> Créer</button>}
                    </div>
                    
                    <div className="events-list">
                        {details.events.map(ev => (
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
                        ))}
                        {details.events.length === 0 && <p className="empty-text">Aucun événement prévu.</p>}
                    </div>
                    
                    {showEventForm && (
                        <div className="glass-panel event-form">
                            <h4>Nouvel Événement</h4>
                            <form onSubmit={handleCreateEvent}>
                                <input type="text" placeholder="Titre" value={eventData.title} onChange={e => setEventData({...eventData, title: e.target.value})} required />
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
                </div>
            </div>

            {/* --- MODALE ADMIN --- */}
            {showAdminModal && (
                <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
                    {/* On arrête la propagation pour que le clic DANS la modale ne la ferme pas */}
                    <div className="glass-panel modal-content admin-modal-size" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-row">
                             <h3 style={{margin:0}}>Administration du Groupe</h3>
                             <button className="close-btn" onClick={() => setShowAdminModal(false)}><FaTimes /></button>
                        </div>
                        
                        {/* Le composant Admin est ici, propre et isolé */}
                        <TurlagAdmin turlagId={turlagId} turlagData={details.turlag} onUpdate={loadData} />
                    </div>
                </div>
            )}

        </div>
    );
}

export default TurlagDetail;