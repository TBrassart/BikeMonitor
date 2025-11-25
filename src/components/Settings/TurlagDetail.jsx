import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { FaUsers, FaCalendarAlt, FaCog, FaCrown, FaUserShield, FaCopy, FaArrowLeft, FaMapMarkerAlt, FaPlus, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';
import './TurlagDetail.css';

function TurlagDetail() {
    const { turlagId } = useParams();
    const navigate = useNavigate();
    
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    
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
                {isPrivileged() && <button onClick={() => setShowEditForm(true)} className="edit-btn"><FaCog /></button>}
            </div>

            <div className="turlag-layout">
                <div className="left-col">
                    <div className="glass-panel invite-card">
                        <span className="label">Code d'invitation</span>
                        <div className="code-box" onClick={copyCode}>
                            <code>{turlagId.slice(0,8)}...</code> <FaCopy />
                        </div>
                    </div>

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
                    
                    {/* ... (Reste de la section Events & Modales inchangé) ... */}
                     {/* Je raccourcis pour la clarté, garde tes events existants */}
                     <div className="events-list">
                        {details.events.map(ev => (
                            <div key={ev.id} className="event-card glass-panel">
                                <div className="event-date-box">
                                    <span className="day">{new Date(ev.event_date).getDate()}</span>
                                </div>
                                <div className="event-content">
                                    <h4>{ev.title}</h4>
                                    <p>{ev.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {showEventForm && ( /* Formulaire Event */ <div className="glass-panel event-form"><button onClick={()=>setShowEventForm(false)}>Fermer</button></div> )}
                    {showEditForm && ( /* Formulaire Edit */ <div className="modal-overlay"><div className="glass-panel modal-content"><button onClick={()=>setShowEditForm(false)}>Fermer</button></div></div> )}
                </div>
            </div>
        </div>
    );
}

export default TurlagDetail;