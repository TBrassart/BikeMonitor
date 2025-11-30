import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService, supabase, api } from '../../services/api'; 
import { 
    FaUsers, FaArrowLeft, FaCog, FaPaperPlane, FaPoll, FaTools, 
    FaTrophy, FaCommentDots, FaHome, FaPlus, FaTimes, FaCrown, 
    FaUserShield, FaTrash, FaMapMarkerAlt, FaCalendarAlt, FaStopCircle, FaFileDownload, FaMap
} from 'react-icons/fa';
import TurlagAdmin from './TurlagAdmin';
import './TurlagDetail.css';

// ==========================================
// 1. SOUS-COMPOSANT : CHAT (Temps Réel)
// ==========================================
const TurlagChat = ({ turlagId, currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        loadMessages();
        
        // ABONNEMENT REALTIME SUPABASE
        const channel = supabase
            .channel(`turlag_chat_${turlagId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'turlag_messages', 
                filter: `turlag_id=eq.${turlagId}` 
            }, 
            () => {
                // Nouvelle méthode : on recharge pour avoir les jointures (nom/avatar)
                loadMessages(); 
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [turlagId]);

    const loadMessages = async () => {
        try {
            const data = await authService.getMessages(turlagId);
            setMessages(data || []);
            scrollToBottom();
        } catch (e) { console.error("Erreur chat", e); }
    };

    const scrollToBottom = () => {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        try {
            await authService.sendMessage(turlagId, newMessage);
            setNewMessage('');
            // Le realtime mettra à jour l'interface automatiquement
        } catch (e) { console.error(e); }
    };

    return (
        <div className="turlag-chat glass-panel">
            <div className="chat-messages">
                {messages.length === 0 && <div className="empty-chat">Le mur est vide. Dites bonjour ! 👋</div>}
                {messages.map(msg => {
                    const isMe = msg.user_id === currentUser.id;
                    return (
                        <div key={msg.id} className={`chat-bubble-row ${isMe ? 'me' : 'other'}`}>
                            {!isMe && (
                                <div className="chat-avatar" title={msg.profiles?.name}>
                                    {msg.profiles?.avatar || '👤'}
                                </div>
                            )}
                            <div className="chat-content">
                                {!isMe && <span className="chat-name">{msg.profiles?.name}</span>}
                                <div className="chat-bubble">{msg.content}</div>
                                <span className="chat-time">
                                    {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="chat-input-area">
                <input 
                    type="text" 
                    placeholder="Écrire un message..." 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                />
                <button type="submit"><FaPaperPlane /></button>
            </form>
        </div>
    );
};

// ==========================================
// 2. SOUS-COMPOSANT : LEADERBOARD
// ==========================================
const TurlagLeaderboard = ({ turlagId }) => {
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRanking();
    }, [turlagId]);

    const loadRanking = async () => {
        try {
            const data = await authService.getLeaderboard(turlagId);
            setRanking(data || []);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    if (loading) return <div className="loading-mini">Calcul du classement...</div>;

    return (
        <div className="leaderboard-container glass-panel">
            <div className="lb-header">
                <h3><FaTrophy style={{color:'#facc15'}}/> Classement Hebdomadaire (7j)</h3>
                <small>Basé sur les activités synchronisées</small>
            </div>
            
            <table className="users-table">
                <thead><tr><th>#</th><th>Athlète</th><th>Distance</th><th>D+</th><th>Sorties</th></tr></thead>
                <tbody>
                    {ranking.map((r, index) => (
                        <tr key={r.user_id}>
                            <td style={{fontWeight:'bold', fontSize:'1.2rem'}}>
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                            </td>
                            <td>
                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                    <span className="user-avatar small">{r.avatar || '👤'}</span>
                                    {r.name}
                                </div>
                            </td>
                            <td style={{fontWeight:'bold', color:'var(--neon-blue)'}}>{Math.round(r.total_km)} km</td>
                            <td style={{color:'var(--text-secondary)'}}>{r.total_elev} m</td>
                            <td>{r.ride_count}</td>
                        </tr>
                    ))}
                    {ranking.length === 0 && (
                        <tr><td colSpan="5" style={{textAlign:'center', padding:'20px', color:'#888'}}>
                            Aucune sortie enregistrée cette semaine. Allez rouler ! 🚴‍♂️
                        </td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

// ==========================================
// 3. SOUS-COMPOSANT : SONDAGES
// ==========================================
const TurlagPolls = ({ turlagId, currentUserId }) => {
    const [polls, setPolls] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [newOptions, setNewOptions] = useState(['', '']);
    const handleClose = async (pollId) => {
        if(!window.confirm("Clore ce sondage ? Il ne sera plus visible.")) return;
        try {
            await authService.closePoll(pollId);
            loadPolls(); // On recharge la liste (le sondage disparaitra car on filtre is_active=true)
        } catch(e) { alert("Erreur"); }
    };

    useEffect(() => { loadPolls(); }, [turlagId]);

    const loadPolls = async () => {
        try {
            const data = await authService.getPolls(turlagId);
            setPolls(data || []);
        } catch (e) { console.error(e); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const validOptions = newOptions.filter(o => o.trim() !== '');
        if (!newQuestion.trim() || validOptions.length < 2) return alert("Question et au moins 2 options requises.");
        
        try {
            await authService.createPoll(turlagId, newQuestion, validOptions);
            setShowForm(false); 
            setNewQuestion(''); 
            setNewOptions(['', '']);
            loadPolls();
        } catch (e) { alert("Erreur création sondage"); }
    };

    const handleVote = async (pollId, index) => {
        try {
            await authService.votePoll(pollId, index);
            loadPolls();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="polls-section">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                <h3 style={{margin:0, fontSize:'1.1rem'}}><FaPoll /> Sondages</h3>
                <button onClick={() => setShowForm(!showForm)} className="action-icon-btn">
                    <FaPlus />
                </button>
            </div>

            {showForm && (
                <div className="glass-panel poll-form">
                    <input className="admin-input" placeholder="Question ?" value={newQuestion} onChange={e=>setNewQuestion(e.target.value)} autoFocus />
                    {newOptions.map((opt, i) => (
                        <div key={i} style={{display:'flex', gap:'5px', marginBottom:'5px'}}>
                            <input className="admin-input small" placeholder={`Option ${i+1}`} value={opt} onChange={e=>{
                                const nw = [...newOptions]; nw[i] = e.target.value; setNewOptions(nw);
                            }} />
                            {i > 1 && <button onClick={() => setNewOptions(newOptions.filter((_, idx) => idx !== i))} className="close-btn"><FaTimes/></button>}
                        </div>
                    ))}
                    <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                        <button onClick={() => setNewOptions([...newOptions, ''])} className="secondary-btn small">+ Option</button>
                        <button onClick={handleCreate} className="primary-btn small" style={{flex:1}}>Lancer</button>
                    </div>
                </div>
            )}

            <div className="polls-list">
                {polls.map(poll => {
                    const totalVotes = poll.votes.length;
                    const myVote = poll.votes.find(v => v.user_id === currentUserId)?.option_index;
                    const isCreator = poll.created_by === currentUserId;

                    return (
                    <div key={poll.id} className="poll-card glass-panel">
                        <div className="poll-header" style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                            <div>
                                <strong>{poll.question}</strong>
                                <div style={{fontSize:'0.8rem', color:'#888'}}>par {poll.creator?.name}</div>
                            </div>
                            
                            {/* BOUTON CLORE (Visible seulement pour le créateur) */}
                            {isCreator && (
                                <button 
                                    onClick={() => handleClose(poll.id)} 
                                    className="close-poll-btn"
                                    title="Clore le sondage"
                                    style={{background:'transparent', border:'none', color:'#ef4444', cursor:'pointer'}}
                                >
                                    <FaStopCircle />
                                </button>
                            )}
                        </div>
                            <div className="poll-options">
                                {poll.options.map((opt, idx) => {
                                    const count = poll.votes.filter(v => v.option_index === idx).length;
                                    const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                                    const isSelected = myVote === idx;

                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => handleVote(poll.id, idx)} 
                                            className={`poll-option ${isSelected ? 'selected' : ''}`}
                                        >
                                            <div className="poll-bar" style={{width:`${pct}%`}}></div>
                                            <div className="poll-content">
                                                <span>{opt} {isSelected && '✅'}</span>
                                                <span className="poll-count">{count} ({Math.round(pct)}%)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ==========================================
// 4. SOUS-COMPOSANT : ATELIER PARTAGÉ
// ==========================================
const TurlagWorkshop = ({ turlagId }) => {
    const [items, setItems] = useState([]);
    
    useEffect(() => { 
        authService.getSharedWorkshop(turlagId).then(data => setItems(data || [])); 
    }, [turlagId]);

    return (
        <div className="workshop-container">
            <div className="workshop-header">
                <h3><FaTools /> Atelier Participatif</h3>
                <p>Matériel mis à disposition par les membres.</p>
            </div>
            <div className="workshop-grid">
                {items.length === 0 ? (
                    <div className="empty-state glass-panel">Aucun matériel partagé pour le moment.</div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="workshop-card glass-panel">
                            <div className="workshop-card-header">
                                <strong>{item.name}</strong>
                                <div className="user-avatar small" title={`Appartient à ${item.profiles?.name}`}>
                                    {item.profiles?.avatar || '👤'}
                                </div>
                            </div>
                            <p className="workshop-details">{item.brand} • {item.category}</p>
                            <div className="workshop-actions">
                                <span className={`condition-badge ${item.condition}`}>{item.condition}</span>
                                {/* Pourrait être un lien mailto ou un chat direct plus tard */}
                                <button className="contact-btn" onClick={() => alert(`Contactez ${item.profiles?.name} via le chat !`)}>
                                    Emprunter
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// ==========================================
// 5. COMPOSANT PRINCIPAL : TURLAG DETAIL
// ==========================================
function TurlagDetail() {
    const { turlagId } = useParams();
    const navigate = useNavigate();
    
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('home'); // home, chat, leaderboard, workshop
    
    // États Modales & Forms
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [showEventForm, setShowEventForm] = useState(false);
    const [eventData, setEventData] = useState({ title: '', date: '', location: '', description: '' });

    useEffect(() => { loadData(); }, [turlagId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [user, data] = await Promise.all([
                authService.getCurrentUser(),
                authService.getTurlagDetails(turlagId)
            ]);
            setCurrentUser(user);
            setDetails(data);
        } catch (e) {
            console.error(e);
            navigate('/app/turlag'); // Redirection si erreur (ex: exclu du groupe)
        } finally {
            setLoading(false);
        }
    };

    // --- HELPER DROITS ---
    const getMyRole = () => {
        if (!details || !currentUser) return null;
        const me = details.members.find(m => m.user_id === currentUser.id);
        return me ? me.role : null;
    };
    const isAdmin = () => getMyRole() === 'admin';
    const isPrivileged = () => ['admin', 'moderator'].includes(getMyRole());

    // --- ACTIONS MEMBRES ---
    const handlePromote = async (memberId, currentRole) => {
        if (!isAdmin()) return;
        const newRole = currentRole === 'member' ? 'moderator' : 'member';
        if (window.confirm(`Changer le rôle en ${newRole} ?`)) {
            await authService.updateMemberRole(turlagId, memberId, newRole);
            loadData();
        }
    };

    const handleKick = async (memberId, name) => {
        if (!isAdmin()) return;
        if (window.confirm(`Éjecter ${name} du groupe ?`)) {
            await authService.kickMember(turlagId, memberId);
            loadData();
        }
    };

    const handleLeave = async () => {
        if (window.confirm("Quitter ce groupe ?")) {
            await authService.leaveTurlag(turlagId);
            navigate('/app/turlag');
        }
    };

    // --- ACTIONS ÉVÉNEMENTS ---
    // 1. SUPPRESSION
    const handleDeleteEvent = async (eventId) => {
        if(!window.confirm("Annuler cet événement ?")) return;
        try {
            await authService.deleteTurlagEvent(eventId);
            loadData(); // Rafraîchir la liste
        } catch(e) { alert("Erreur suppression"); }
    };

    // 2. CRÉATION AVEC UPLOAD GPX
    const handleCreateEvent = async (e) => {
        e.preventDefault();
        
        // On sépare le fichier et la date locale
        const { date, gpxFile, ...restEventData } = eventData;
        let gpxUrl = null;

        try {
            // Upload si un fichier est présent
            if (gpxFile) {
                gpxUrl = await api.uploadGpx(gpxFile);
            }

            await authService.addTurlagEvent({ 
                turlag_id: turlagId, 
                event_date: date, 
                gpx_url: gpxUrl, // On enregistre l'URL
                ...restEventData 
            });
            
            setShowEventForm(false);
            setEventData({ title: '', date: '', location: '', description: '', gpxFile: null });
            loadData();
        } catch(e) { 
            console.error("Erreur création event:", e);
            alert("Erreur lors de la création."); 
        }
    };

    if (loading || !details) return <div className="loading">Chargement du QG...</div>;

    return (
        <div className="turlag-detail-page">
            {/* 1. HERO HEADER */}
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
                    <button 
                        onClick={() => setShowAdminModal(true)} 
                        className="edit-btn" 
                        title="Administration"
                    >
                        <FaCog />
                    </button>
                )}
            </div>

            {/* 2. NAVIGATION TABS */}
            <div className="turlag-tabs">
                <button className={`tab-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
                    <FaHome /> Accueil
                </button>
                <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
                    <FaCommentDots /> Chat
                </button>
                <button className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
                    <FaTrophy /> Classement
                </button>
                <button className={`tab-btn ${activeTab === 'workshop' ? 'active' : ''}`} onClick={() => setActiveTab('workshop')}>
                    <FaTools /> Atelier
                </button>
            </div>

            {/* 3. CONTENU DES ONGLETS */}
            <div className="turlag-content-area" style={{marginTop:'25px'}}>
                
                {/* --- TAB: ACCUEIL --- */}
                {activeTab === 'home' && (
                    <div className="turlag-layout">
                        {/* COLONNE GAUCHE (Sondages + Membres) */}
                        <div className="left-col">
                            {/* Sondages */}
                            <TurlagPolls turlagId={turlagId} currentUserId={currentUser.id} />
                            
                            {/* Liste Membres */}
                            <div className="glass-panel members-list" style={{marginTop:'20px'}}>
                                <h3>Membres ({details.members.length})</h3>
                                <div className="members-scroll">
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
                                            {/* Actions Admin */}
                                            {isAdmin() && m.user_id !== currentUser.id && (
                                                <div className="member-actions">
                                                    <button onClick={() => handlePromote(m.user_id, m.role)} className="icon-btn-small" title="Promouvoir/Destituer">
                                                        <FaUserShield />
                                                    </button>
                                                    <button onClick={() => handleKick(m.user_id, m.profiles?.name)} className="icon-btn-small danger" title="Éjecter">
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleLeave} className="leave-group-btn">Quitter le groupe</button>
                            </div>
                        </div>

                        {/* COLONNE DROITE (Événements) */}
                        <div className="right-col">
                            <div className="events-header">
                                <h3>Prochains Rides</h3>
                                {/* Seuls les gradés peuvent créer un event, ou tout le monde selon la politique. Ici : Privilégiés. */}
                                {isPrivileged() && (
                                    <button onClick={() => setShowEventForm(!showEventForm)} className="add-event-btn">
                                        <FaPlus /> Créer
                                    </button>
                                )}
                            </div>

                            {/* Formulaire création événement */}
                            {showEventForm && (
                                <div className="glass-panel event-form slide-down">
                                    <h4><FaCalendarAlt /> Planifier une sortie</h4>
                                    <form onSubmit={handleCreateEvent}>
                                        <input type="text" placeholder="Titre (ex: Sortie Longue Dimanche)" value={eventData.title} onChange={e => setEventData({...eventData, title: e.target.value})} required />
                                        <div className="form-row">
                                            <input type="datetime-local" value={eventData.date} onChange={e => setEventData({...eventData, date: e.target.value})} required style={{flex:1}} />
                                        </div>
                                        <input type="text" placeholder="Lieu de RDV" value={eventData.location} onChange={e => setEventData({...eventData, location: e.target.value})} />
                                        
                                        {/* CHAMP GPX */}
                                        <div style={{marginBottom:'15px'}}>
                                            <label style={{display:'block', color:'#ccc', marginBottom:'5px', fontSize:'0.9rem'}}>Trace GPX (Optionnel)</label>
                                            <input 
                                                type="file" accept=".gpx"
                                                onChange={e => setEventData({...eventData, gpxFile: e.target.files[0]})}
                                                style={{background:'rgba(255,255,255,0.05)', padding:'10px'}}
                                            />
                                        </div>

                                        <textarea placeholder="Description, parcours, allure..." value={eventData.description} onChange={e => setEventData({...eventData, description: e.target.value})} rows="3" />
                                        
                                        <div className="form-actions">
                                            <button type="button" onClick={() => setShowEventForm(false)}>Annuler</button>
                                            <button type="submit" className="primary-btn">Publier</button>
                                        </div>
                                    </form>
                                </div>
                            )}
                            
                            {/* Liste Événements */}
                            <div className="events-list">
                                {details.events.length === 0 ? (
                                    <div className="empty-state glass-panel">Aucune sortie prévue.</div>
                                ) : (
                                    details.events.map(ev => {
                                        // On vérifie si c'est passé
                                        const isPast = new Date(ev.event_date) < new Date();
                                        // On vérifie si on a le droit de supprimer (Admin ou Créateur)
                                        const canDelete = isAdmin() || ev.created_by === currentUser.id;

                                        return (
                                            <div key={ev.id} className={`event-card glass-panel ${isPast ? 'past-event' : ''}`} style={{opacity: isPast ? 0.6 : 1}}>
                                                <div className="event-date-box">
                                                    <span className="day">{new Date(ev.event_date).getDate()}</span>
                                                    <span className="month">{new Date(ev.event_date).toLocaleDateString('fr-FR', {month:'short'})}</span>
                                                </div>
                                                <div className="event-content">
                                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                                                        <h4>{ev.title} {isPast && <span style={{fontSize:'0.7rem', background:'#444', padding:'2px 6px', borderRadius:'4px'}}>PASSÉ</span>}</h4>
                                                        
                                                        {/* Actions */}
                                                        <div style={{display:'flex', gap:'10px'}}>
                                                            {/* Bouton GPX */}
                                                            {ev.gpx_url && (
                                                                <a 
                                                                    href={ev.gpx_url} 
                                                                    download 
                                                                    className="icon-btn-small" 
                                                                    title="Télécharger GPX"
                                                                    style={{color:'var(--neon-green)', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center'}}
                                                                >
                                                                    <FaFileDownload />
                                                                </a>
                                                            )}
                                                            
                                                            {/* Bouton Supprimer */}
                                                            {canDelete && (
                                                                <button 
                                                                    onClick={() => handleDeleteEvent(ev.id)} 
                                                                    className="icon-btn-small danger"
                                                                    title="Annuler l'événement"
                                                                >
                                                                    <FaTrash />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="event-meta">
                                                        <span><FaMapMarkerAlt /> {ev.location || 'Lieu inconnu'}</span>
                                                        <span>• {new Date(ev.event_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                    <p>{ev.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: CHAT --- */}
                {activeTab === 'chat' && <TurlagChat turlagId={turlagId} currentUser={currentUser} />}

                {/* --- TAB: CLASSEMENT --- */}
                {activeTab === 'leaderboard' && <TurlagLeaderboard turlagId={turlagId} />}

                {/* --- TAB: ATELIER --- */}
                {activeTab === 'workshop' && <TurlagWorkshop turlagId={turlagId} />}

            </div>

            {/* MODALE ADMINISTRATION (Externe) */}
            {showAdminModal && (
                <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
                    <div className="glass-panel modal-content admin-modal-size" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-row">
                            <h3>Administration</h3>
                            <button className="close-btn" onClick={() => setShowAdminModal(false)}><FaTimes /></button>
                        </div>
                        <TurlagAdmin turlagId={turlagId} turlagData={details.turlag} onUpdate={loadData} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default TurlagDetail;