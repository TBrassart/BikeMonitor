import React, { useState, useEffect } from 'react';
import { adminService, authService, shopService, helpService } from '../../services/api';
import { 
    FaUsers, FaDatabase, FaChartLine, FaUserShield, FaTrash, 
    FaListAlt, FaLock, FaTools, FaFileCsv, FaFileCode, FaQuestionCircle, FaInbox, FaCheck, FaArchive, FaPen,
    FaEnvelopeOpenText, FaBroom, FaPowerOff, FaSearch, FaBullhorn, FaExclamationCircle, FaFilter, FaTrophy, FaPlusCircle
} from 'react-icons/fa';
import './AdminPage.css';

function AdminPage() {
    const [isLocked, setIsLocked] = useState(true);
    const [pin, setPin] = useState('');

    const [activeTab, setActiveTab] = useState('users'); 
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    // --- FILTRES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    // États Saison
    const [seasonConfig, setSeasonConfig] = useState({ xp_per_km: 10, xp_per_elev: 0.5 });
    const [newMission, setNewMission] = useState({ 
        title: '', description: '', xp_reward: 500, icon: '🎯', 
        type: 'manual', criteriaValue: 0 
    });
    const [shopItems, setShopItems] = useState([]);
    const [levels, setLevels] = useState([]);

    // États pour FAQ & Feedback
    const [faqs, setFaqs] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    
    // État pour l'édition FAQ
    const [editingFaq, setEditingFaq] = useState(null); // null = mode création
    const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: 'general', display_order: 0 });

    // LISTE DES TYPES DE MISSIONS PARAMÉTRABLES
    const MISSION_TYPES = [
        { code: 'manual', label: 'Manuelle (Déclaratif)', unit: '' },
        { code: 'min_dist_single', label: 'Rouler une distance (1 sortie)', unit: 'km' },
        { code: 'total_elevation', label: 'Cumuler du dénivelé (Total)', unit: 'm' },
        { code: 'ride_count', label: 'Nombre de sorties', unit: 'sorties' },
        { code: 'min_speed', label: 'Vitesse moyenne min (1 sortie)', unit: 'km/h' },
    ];

    useEffect(() => {
        checkRights();
    }, []);

    const checkRights = async () => {
        try {
            const profile = await authService.getMyProfile();
            if (profile && profile.app_role === 'admin') {
                setIsAdmin(true);
                const maint = await adminService.getMaintenance();
                setMaintenanceMode(maint);
                setLoading(false);
            } else {
                setLoading(false);
            }
        } catch (e) {
            setLoading(false);
        }
    };

    const unlockAndLoad = async () => {
        setLoading(true);
        try {
            // ON AJOUTE shopService.getSeason() et shopService.getCatalog()
            const [statsData, usersData, logsData, configData, levelsData, itemsData, faqsData, feedbacksData] = await Promise.all([
                adminService.getStats(),
                adminService.getAllUsers(),
                adminService.getLogs(),
                shopService.getSeasonConfig(),
                shopService.getSeason(),
                shopService.getCatalog(),
                helpService.getFaqs(),
                helpService.getAllFeedbacks()
            ]);

            setStats(statsData);
            setUsers(usersData);
            setLogs(logsData);
            if(configData) setSeasonConfig(configData);
            setLevels(levelsData || []);
            setShopItems(itemsData || []);
            setFaqs(faqsData || []);
            setFeedbacks(feedbacksData || []);

            setIsLocked(false);
        } catch (e) {
            console.error(e);
            alert("Erreur chargement données.");
        } finally {
            setLoading(false);
        }
    };

    const handlePinSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); // Petit effet de chargement pendant la vérif

        try {
            const isValid = await adminService.verifyPin(pin);
            
            if (isValid) {
                unlockAndLoad(); // Si c'est bon, on charge les données
            } else {
                alert("Code PIN incorrect ⛔");
                setPin('');
                setLoading(false); // On arrête le chargement si échec
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    // --- LOGIQUE SAISON ---
    const handleUpdateSeasonConfig = async (e) => {
        e.preventDefault();
        try {
            await shopService.updateSeasonConfig(seasonConfig);
            adminService.log('ADMIN_SEASON', `Mise à jour ratios XP: ${JSON.stringify(seasonConfig)}`, 'warning');
            alert("Configuration saison mise à jour !");
        } catch (e) { alert("Erreur sauvegarde config"); }
    };

    const handleCreateMission = async (e) => {
        e.preventDefault();
        
        // Construction de l'objet criteria
        let criteria = null;
        if (newMission.type !== 'manual') {
            criteria = {
                type: newMission.type,
                value: parseFloat(newMission.criteriaValue)
            };
        }

        const missionPayload = {
            title: newMission.title,
            description: newMission.description,
            xp_reward: newMission.xp_reward,
            icon: newMission.icon,
            criteria: criteria // Supabase stockera ça en JSONB
        };

        try {
            await shopService.addMission(missionPayload);
            adminService.log('ADMIN_MISSION', `Nouvelle mission: ${newMission.title}`, 'info');
            alert("Mission créée !");
            // Reset
            setNewMission({ title: '', description: '', xp_reward: 500, icon: '🎯', type: 'manual', criteriaValue: 0 }); 
        } catch (e) { alert("Erreur création mission"); }
    };

    // ACTIONS
    const handleMaintenanceToggle = async () => {
        const newState = !maintenanceMode;
        if (window.confirm(`Basculer la maintenance sur ${newState ? 'ON' : 'OFF'} ?`)) {
            await adminService.setMaintenance(newState);
            setMaintenanceMode(newState);
            adminService.log('MAINTENANCE', `Mode maintenance : ${newState}`, 'danger');
        }
    };

    const handleCleanup = async () => {
        if (window.confirm("Nettoyer les photos inutiles ?")) {
            setLoading(true);
            try {
                const count = await adminService.cleanupPhotos();
                alert(`${count} photos supprimées.`);
                adminService.log('CLEANUP', `${count} photos supprimées`, 'warning');
            } catch(e) { alert("Erreur nettoyage"); }
            setLoading(false);
        }
    };

    const handleNewsletter = async () => { // Ajout de async
        const emails = users.map(u => u.email).filter(e => e).join(', ');
        if (emails) {
            navigator.clipboard.writeText(emails);
            // LOG DE L'ACTION
            await adminService.log('ADMIN_DATA', `A copié la liste des emails (${users.length} adresses)`, 'warning');
            alert(`${users.length} emails copiés dans le presse-papier !`);
        } else {
            alert("Aucun email trouvé.");
        }
    };

    const handleRoleChange = async (user, currentRole) => {
        const newRole = currentRole === 'user' ? 'moderator' : 'user';
        if (window.confirm(`Changer le rôle de ${user.name} ?`)) {
            await adminService.updateRole(user.user_id, newRole);
            // Refresh local simple
            setUsers(users.map(u => u.id === user.id ? {...u, app_role: newRole} : u));
        }
    };

    const handleEjectUser = async (user) => {
        if (prompt(`Taper DELETE pour supprimer ${user.name}`) === "DELETE") {
            await adminService.deleteUser(user.user_id);
            setUsers(users.filter(u => u.id !== user.id));
        }
    };

    // --- EXPORTS ---
    const exportData = async (type, format) => {
        // 1. Log de l'action AVANT de commencer
        await adminService.log(
            'ADMIN_EXPORT', 
            `Export des données : ${type} (format ${format})`, 
            'info'
        );

        let data;
        try {
            if (type === 'library') data = await adminService.exportLibrary();
            if (type === 'logs') data = await adminService.exportLogs();

            if (!data || data.length === 0) {
                alert("Aucune donnée à exporter.");
                return;
            }

            if (format === 'json') {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                downloadFile(blob, `${type}_export_${new Date().toISOString().split('T')[0]}.json`);
            } else {
                const headers = Object.keys(data[0]).join(',');
                const rows = data.map(row => 
                    Object.values(row).map(v => 
                        typeof v === 'object' ? JSON.stringify(v).replace(/"/g, "'") : `"${v}"`
                    ).join(',')
                );
                const csvContent = [headers, ...rows].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                downloadFile(blob, `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);
            }
        } catch (e) {
            console.error("Erreur export", e);
            alert("Erreur lors de l'export.");
        }
    };

    if (!loading && !isAdmin) return <div className="admin-denied"><h1>⛔ Accès Interdit</h1></div>;

    // --- LOCK SCREEN CENTRÉ ET STYLÉ ---
    if (isLocked && isAdmin && !loading) {
        return (
            <div className="admin-lock-screen">
                <div className="lock-content glass-panel">
                    <FaLock className="lock-icon" />
                    <h2>Zone Sécurisée</h2>
                    <form onSubmit={handlePinSubmit}>
                        <input 
                            type="password" 
                            value={pin} 
                            onChange={e => setPin(e.target.value)} 
                            placeholder="Mot de passe Admin" // Changé
                            autoFocus 
                            className="pin-input"
                            style={{ letterSpacing: '5px' }} 
                        />
                        <button type="submit" className="primary-btn" style={{width:'100%'}}>
                            Déverrouiller
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading) return <div className="loading">Chargement...</div>;

    // --- LOGIQUE DE FILTRAGE ---
    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
                              (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesRole = filterRole === 'all' || u.app_role === filterRole;
        
        return matchesSearch && matchesRole;
    });

    const handleUpdateLevel = async (levelNum, field, value) => {
        try {
            // On utilise 'level' comme identifiant unique
            const updatedLevels = levels.map(l => l.level === levelNum ? { ...l, [field]: value } : l);
            setLevels(updatedLevels);
            await shopService.updateLevel(levelNum, { [field]: value });
        } catch (e) {
            console.error(e);
            alert("Erreur maj niveau : " + e.message);
        }
    };

    // --- GESTION FAQ ---
    const handleSaveFaq = async (e) => {
        e.preventDefault();
        try {
            if (editingFaq) {
                await helpService.updateFaq(editingFaq.id, faqForm);
                alert("Question mise à jour !");
            } else {
                await helpService.createFaq(faqForm);
                alert("Question créée !");
            }
            // Reset & Reload
            setEditingFaq(null);
            setFaqForm({ question: '', answer: '', category: 'general', display_order: 0 });
            const freshFaqs = await helpService.getFaqs();
            setFaqs(freshFaqs);
        } catch(e) { alert("Erreur sauvegarde FAQ"); }
    };

    const handleEditFaq = (faq) => {
        setEditingFaq(faq);
        setFaqForm({ 
            question: faq.question, 
            answer: faq.answer, 
            category: faq.category, 
            display_order: faq.display_order 
        });
    };

    const handleDeleteFaq = async (id) => {
        if(!window.confirm("Supprimer cette question ?")) return;
        await helpService.deleteFaq(id);
        setFaqs(faqs.filter(f => f.id !== id));
    };

    // --- GESTION FEEDBACK ---
    const handleFeedbackStatus = async (id, newStatus) => {
        try {
            await helpService.updateFeedbackStatus(id, newStatus);
            // Mise à jour optimiste locale
            setFeedbacks(feedbacks.map(f => f.id === id ? { ...f, status: newStatus } : f));
        } catch(e) { alert("Erreur maj statut"); }
    };

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <h2 className="gradient-text">Administration</h2>
                    {maintenanceMode && <span className="maint-badge">MAINTENANCE ACTIVE</span>}
                </div>
                <div className="admin-tabs">
                    <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}><FaUsers /> Pilotes</button>
                    <button className={activeTab === 'season' ? 'active' : ''} onClick={() => setActiveTab('season')}><FaTrophy /> Saison</button>
                    <button className={activeTab === 'logs' ? 'active' : ''} onClick={() => setActiveTab('logs')}><FaListAlt /> Logs</button>
                    <button className={activeTab === 'system' ? 'active' : ''} onClick={() => setActiveTab('system')}><FaTools /> Système</button>
                    <button className={activeTab === 'support' ? 'active' : ''} onClick={() => setActiveTab('support')}><FaInbox /> Support</button>
                    <button className={activeTab === 'faq' ? 'active' : ''} onClick={() => setActiveTab('faq')}><FaQuestionCircle /> FAQ</button>
                </div>
            </header>

            {/* ONGLET SAISON (C'est celui qui nous intéresse) */}
            {activeTab === 'season' && (
                <div className="admin-section glass-panel">
                    <h3><FaTrophy /> Configuration Saison & Missions</h3>
                    
                    <div className="system-grid">
                        {/* CONFIG RATIOS */}
                        <div className="system-card glass-panel">
                            <h4>Règles XP (Globales)</h4>
                            <p>Modifie combien d'XP rapporte chaque kilomètre.</p>
                            <form onSubmit={handleUpdateSeasonConfig} className="banner-form">
                                <div className="form-group">
                                    <label>XP par km (Défaut: 10)</label>
                                    <input 
                                        type="number" className="admin-input"
                                        value={seasonConfig.xp_per_km} 
                                        onChange={e => setSeasonConfig({...seasonConfig, xp_per_km: parseInt(e.target.value)})} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>XP par m D+ (Défaut: 0.5)</label>
                                    <input 
                                        type="number" step="0.1" className="admin-input"
                                        value={seasonConfig.xp_per_elev} 
                                        onChange={e => setSeasonConfig({...seasonConfig, xp_per_elev: parseFloat(e.target.value)})} 
                                    />
                                </div>
                                <button className="admin-std-btn">Sauvegarder Ratios</button>
                            </form>
                        </div>

                        {/* CRÉATION MISSION INTELLIGENTE */}
                        <div className="system-card glass-panel">
                            <h4>Nouvelle Mission</h4>
                            <p>Configurez une mission automatique.</p>
                            <form onSubmit={handleCreateMission} className="banner-form">
                                
                                {/* 1. CHOIX DU TYPE */}
                                <div className="form-group">
                                    <label>Type d'objectif</label>
                                    <select 
                                        className="admin-input"
                                        value={newMission.type}
                                        onChange={e => setNewMission({...newMission, type: e.target.value})}
                                    >
                                        {MISSION_TYPES.map(t => (
                                            <option key={t.code} value={t.code}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 2. VALEUR CIBLE (Si pas manuel) */}
                                {newMission.type !== 'manual' && (
                                    <div className="form-group">
                                        <label>Objectif à atteindre ({MISSION_TYPES.find(t=>t.code === newMission.type)?.unit})</label>
                                        <input 
                                            type="number" className="admin-input" 
                                            placeholder="Ex: 50"
                                            value={newMission.criteriaValue} 
                                            onChange={e => setNewMission({...newMission, criteriaValue: e.target.value})} 
                                        />
                                    </div>
                                )}

                                {/* 3. DETAILS COSMÉTIQUES */}
                                <div className="form-group">
                                    <label>Titre</label>
                                    <input 
                                        className="admin-input" placeholder="Ex: Grand Fondeur" required
                                        value={newMission.title} onChange={e => setNewMission({...newMission, title: e.target.value})} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <input 
                                        className="admin-input" placeholder="Ex: Rouler 100km en une fois" 
                                        value={newMission.description} onChange={e => setNewMission({...newMission, description: e.target.value})} 
                                    />
                                </div>
                                <div style={{display:'flex', gap:'10px'}}>
                                    <div className="form-group" style={{flex:1}}>
                                        <label>XP Gain</label>
                                        <input 
                                            type="number" className="admin-input"
                                            value={newMission.xp_reward} onChange={e => setNewMission({...newMission, xp_reward: parseInt(e.target.value)})} 
                                        />
                                    </div>
                                    <div className="form-group" style={{width:'80px'}}>
                                        <label>Icône</label>
                                        <input 
                                            className="admin-input"
                                            value={newMission.icon} onChange={e => setNewMission({...newMission, icon: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                <button className="admin-std-btn"><FaPlusCircle /> Créer Mission</button>
                            </form>
                        </div>
                        {/* GESTION DES NIVEAUX (BATTLE PASS) */}
                        <div className="system-card glass-panel" style={{gridColumn: '1 / -1'}}>
                            <h4>Configuration du Battle Pass</h4>
                            <p>Définissez l'XP requise et les récompenses pour chaque niveau.</p>
                            
                            <div style={{maxHeight:'400px', overflowY:'auto', border:'1px solid var(--border-color)', borderRadius:'8px'}}>
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Niveau</th>
                                            <th>XP Requis</th>
                                            <th>Gain Watts</th>
                                            <th>Item (Récompense)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {levels.map(lvl => (
                                            /* CORRECTION 1 : On utilise lvl.level comme Key */
                                            <tr key={lvl.level}> 
                                                <td style={{fontWeight:'bold', color:'var(--neon-blue)'}}>Lvl {lvl.level}</td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        className="admin-input" 
                                                        style={{width:'80px', padding:'5px'}}
                                                        value={lvl.xp_required}
                                                        /* CORRECTION 2 : On passe lvl.level à la fonction update */
                                                        onChange={(e) => handleUpdateLevel(lvl.level, 'xp_required', parseInt(e.target.value))}
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        className="admin-input" 
                                                        style={{width:'80px', padding:'5px'}}
                                                        value={lvl.reward_watts || 0}
                                                        onChange={(e) => handleUpdateLevel(lvl.level, 'reward_watts', parseInt(e.target.value))}
                                                    />
                                                </td>
                                                <td>
                                                    <select 
                                                        className="admin-input" 
                                                        style={{padding:'5px'}}
                                                        value={lvl.reward_item_id || ''}
                                                        onChange={(e) => handleUpdateLevel(lvl.level, 'reward_item_id', e.target.value || null)}
                                                    >
                                                        <option value="">-- Aucun --</option>
                                                        {shopItems.map(item => (
                                                            <option key={item.id} value={item.id}>
                                                                {item.name} ({item.rarity})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI */}
            <div className="admin-kpi-grid">
                <div className="kpi-card"><FaUsers className="kpi-icon" style={{color: '#3b82f6'}} /><div><span className="value">{stats?.users || 0}</span><span className="label">Pilotes</span></div></div>
                <div className="kpi-card"><FaDatabase className="kpi-icon" style={{color: '#10b981'}} /><div><span className="value">{stats?.bikes || 0}</span><span className="label">Vélos</span></div></div>
                <div className="kpi-card"><FaChartLine className="kpi-icon" style={{color: '#f59e0b'}} /><div><span className="value">{stats?.totalKm || 0}</span><span className="label">Km</span></div></div>
            </div>

            {/* TAB SYSTEME */}
            {activeTab === 'system' && (
                <div className="system-grid">
                    {/* MAINTENANCE - BOUTON ROUGE */}
                    <div className={`system-card ${maintenanceMode ? 'danger-zone' : ''}`}>
                        <h3><FaPowerOff /> Maintenance</h3>
                        <p>Bloque l'accès au site pour les utilisateurs.</p>
                        <button onClick={handleMaintenanceToggle} className={`admin-danger-btn ${maintenanceMode ? 'active' : ''}`}>
                            {maintenanceMode ? 'DÉSACTIVER' : 'ACTIVER'}
                        </button>
                    </div>

                    {/* CLEANUP - BOUTON STANDARD */}
                    <div className="system-card">
                        <h3><FaBroom /> Nettoyage</h3>
                        <p>Supprime les photos inutilisées du stockage.</p>
                        <button onClick={handleCleanup} className="admin-std-btn">Lancer le scan</button>
                    </div>

                    {/* NEWSLETTER - BOUTON STANDARD */}
                    <div className="system-card">
                        <h3><FaEnvelopeOpenText /> Emails</h3>
                        <p>Récupérer la liste des contacts.</p>
                        <button onClick={handleNewsletter} className="admin-std-btn">Copier la liste</button>
                    </div>

                    {/* EXPORTS */}
                    <div className="system-card">
                        <h3>Exports</h3>
                        <div className="export-row">
                            <span>Bibliothèque</span>
                            <div>
                                <button onClick={() => exportData('library', 'json')} className="icon-action"><FaFileCode /></button>
                            </div>
                        </div>
                        <div className="export-row">
                            <span>Logs</span>
                            <div>
                                <button onClick={() => exportData('logs', 'json')} className="icon-action"><FaFileCode /></button>
                            </div>
                        </div>
                    </div>

                    {/* BANNIÈRE GLOBALE */}
                    <div className="system-card glass-panel">
                        <h3><FaBullhorn /> Annonce Globale</h3>
                        <p>Afficher un bandeau défilant pour tous les utilisateurs.</p>
                        
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const fd = new FormData(e.target);
                            const settings = {
                                message: fd.get('message'),
                                startAt: fd.get('startAt'),
                                endAt: fd.get('endAt'),
                                type: fd.get('type')
                            };
                            try {
                                await adminService.setBanner(settings);
                                
                                // LOG DE L'ACTION
                                await adminService.log(
                                    'ADMIN_BANNER', 
                                    `Nouvelle bannière programmée : "${settings.message}" (${settings.type})`, 
                                    'info'
                                );
                                
                                alert("Bannière programmée !");
                                // Optionnel: Recharger les logs pour voir l'action tout de suite
                                const newLogs = await adminService.getLogs();
                                setLogs(newLogs);
                                
                            } catch(err) { alert("Erreur sauvegarde"); }
                        }} className="banner-form">
                            
                            <div className="form-group">
                                <label>Message</label>
                                <input name="message" type="text" placeholder="Ex: Maintenance ce soir..." required className="admin-input" />
                            </div>
                            
                            {/* CORRECTION : ON EMPILERA CES CHAMPS VIA CSS */}
                            <div className="dates-row">
                                <div className="form-group">
                                    <label>Début</label>
                                    <input name="startAt" type="datetime-local" required className="admin-input" />
                                </div>
                                <div className="form-group">
                                    <label>Fin</label>
                                    <input name="endAt" type="datetime-local" required className="admin-input" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Type d'annonce</label>
                                <div className="radio-group">
                                    <label className="radio-label info"><input type="radio" name="type" value="info" defaultChecked /> Info</label>
                                    <label className="radio-label warning"><input type="radio" name="type" value="warning" /> Attention</label>
                                    <label className="radio-label danger"><input type="radio" name="type" value="maintenance" /> Maint.</label>
                                    <label className="radio-label feature"><input type="radio" name="type" value="feature" /> New</label>
                                </div>
                            </div>

                            <button type="submit" className="admin-std-btn">Programmer l'annonce</button>
                        </form>
                    </div>
                </div>
            )}

            {/* TAB UTILISATEURS (AVEC FILTRES) */}
            {activeTab === 'users' && (
                <div className="admin-section">
                    <div className="section-header">
                        <h3>Utilisateurs ({filteredUsers.length})</h3>
                        
                        <div className="filters-toolbar">
                            <div className="search-box">
                                <FaSearch />
                                <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Nom ou email..." />
                            </div>
                            
                            <div className="role-filter-wrapper">
                                <FaFilter className="filter-icon" />
                                <select 
                                    value={filterRole} 
                                    onChange={(e) => setFilterRole(e.target.value)} 
                                    className="role-select"
                                >
                                    <option value="all">Tous les rôles</option>
                                    <option value="admin">Admins</option>
                                    <option value="moderator">Modérateurs</option>
                                    <option value="user">Utilisateurs</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="users-table-container">
                        <table className="users-table">
                            <thead><tr><th>Avatar</th><th>Nom</th><th>Rôle</th><th>Inscrit le</th><th>Dernière connexion</th><th>Actions</th></tr></thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id}>
                                        <td><span className="user-avatar">{u.avatar}</span></td>
                                        <td>{u.name}<div style={{fontSize:'0.7rem', color:'#888'}}>{u.email}</div></td>
                                        <td>
                                            {/* Badge Rôle Dynamique */}
                                            <span className={`role-badge ${u.app_role}`}>
                                                {u.app_role === 'admin' && '👑 '}
                                                {u.app_role === 'moderator' && '🛡️ '}
                                                {u.app_role}
                                            </span>
                                        </td>
                                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {u.last_sign_in_at ? (
                                                <div style={{lineHeight:'1.2'}}>
                                                    <div>{new Date(u.last_sign_in_at).toLocaleDateString()}</div>
                                                    <small style={{color:'#888', fontSize:'0.75rem'}}>
                                                        {new Date(u.last_sign_in_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </small>
                                                </div>
                                            ) : (
                                                <span style={{opacity: 0.3}}>-</span>
                                            )}
                                        </td>
                                        <td>
                                            {u.app_role !== 'admin' && (
                                                <div className="actions-row">
                                                    <button className="action-icon" onClick={() => handleRoleChange(u, u.app_role)} title="Changer Rôle"><FaUserShield /></button>
                                                    <button className="action-icon delete" onClick={() => handleEjectUser(u)} title="Éjecter"><FaTrash /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB LOGS */}
            {activeTab === 'logs' && (
                <div className="admin-section">
                    <h3>Logs Système</h3>
                    <div className="logs-list">
                        {logs.map(l => (
                            <div key={l.id} className={`log-item ${l.level}`}>
                                <span className="log-date">{new Date(l.created_at).toLocaleString('fr-FR')}</span>
                                <span className="log-user">{l.user_name}</span>
                                <span className="log-action">{l.action}</span>
                                <span className="log-details">{l.details}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ONGLET FAQ */}
            {activeTab === 'faq' && (
                <div className="admin-section glass-panel">
                    <h3>Gestion FAQ</h3>
                    
                    {/* Formulaire Création/Édition */}
                    <div className="system-card" style={{marginBottom:'30px', borderLeft:'4px solid var(--neon-blue)'}}>
                        <h4>{editingFaq ? 'Modifier la question' : 'Nouvelle Question'}</h4>
                        <form onSubmit={handleSaveFaq} className="banner-form">
                            <input 
                                className="admin-input" placeholder="Question ?" required
                                value={faqForm.question} onChange={e => setFaqForm({...faqForm, question: e.target.value})}
                            />
                            <textarea 
                                className="admin-input" placeholder="Réponse..." rows="3" required
                                value={faqForm.answer} onChange={e => setFaqForm({...faqForm, answer: e.target.value})}
                            />
                            <div style={{display:'flex', gap:'10px'}}>
                                <select 
                                    className="admin-input" 
                                    value={faqForm.category} onChange={e => setFaqForm({...faqForm, category: e.target.value})}
                                >
                                    <option value="general">Général</option>
                                    <option value="technique">Technique</option>
                                    <option value="turlag">Turlag</option>
                                    <option value="boutique">Boutique</option>
                                    <option value="battlepass">Battle Pass</option>
                                    <option value="profil">Profil</option>
                                </select>
                                <input 
                                    type="number" className="admin-input" placeholder="Ordre"
                                    value={faqForm.display_order} onChange={e => setFaqForm({...faqForm, display_order: parseInt(e.target.value)})}
                                />
                            </div>
                            <div style={{display:'flex', gap:'10px'}}>
                                <button type="submit" className="admin-std-btn">{editingFaq ? 'Mettre à jour' : 'Créer'}</button>
                                {editingFaq && (
                                    <button type="button" onClick={() => {setEditingFaq(null); setFaqForm({ question: '', answer: '', category: 'general', display_order: 0 });}} className="admin-danger-btn" style={{width:'auto'}}>Annuler</button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Liste */}
                    <div className="faq-admin-list">
                        {faqs.map(f => (
                            <div key={f.id} className="faq-admin-item glass-panel">
                                <div style={{flex:1}}>
                                    <strong>{f.display_order}. {f.question}</strong>
                                    <p style={{margin:'5px 0', color:'#ccc', fontSize:'0.9rem'}}>{f.answer}</p>
                                    <span className="role-badge user">{f.category}</span>
                                </div>
                                <div style={{display:'flex', gap:'10px'}}>
                                    <button onClick={() => handleEditFaq(f)} className="icon-action"><FaPen /></button>
                                    <button onClick={() => handleDeleteFaq(f.id)} className="icon-action" style={{color:'#ef4444'}}><FaTrash /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ONGLET SUPPORT (FEEDBACK) */}
            {activeTab === 'support' && (
                <div className="admin-section">
                    <h3>Boîte de réception ({feedbacks.filter(f => f.status === 'new').length} nouveaux)</h3>
                    
                    <div className="feedback-list">
                        {feedbacks.map(f => (
                            <div key={f.id} className={`feedback-card glass-panel status-${f.status}`}>
                                <div className="fb-header">
                                    <span className={`fb-type ${f.type}`}>
                                        {f.type === 'bug' && '🐛 BUG'}
                                        {f.type === 'feature' && '💡 IDÉE'}
                                        {f.type === 'other' && '💬 AUTRE'}
                                    </span>
                                    <span className="fb-date">{new Date(f.created_at).toLocaleDateString()}</span>
                                </div>
                                
                                <p className="fb-message">"{f.message}"</p>
                                
                                <div className="fb-footer">
                                    <div className="fb-user">
                                        <span className="user-avatar small" style={{width:'20px', height:'20px', fontSize:'0.7rem'}}>👤</span>
                                        {f.profiles?.name || 'Inconnu'}
                                    </div>
                                    
                                    <div className="fb-actions">
                                        {f.status !== 'done' && (
                                            <button onClick={() => handleFeedbackStatus(f.id, 'done')} className="action-btn success" title="Marquer traité">
                                                <FaCheck /> Traité
                                            </button>
                                        )}
                                        {f.status === 'new' && (
                                            <button onClick={() => handleFeedbackStatus(f.id, 'read')} className="action-btn read" title="Marquer lu">
                                                <FaEnvelopeOpenText /> Lu
                                            </button>
                                        )}
                                        {f.status === 'done' && (
                                            <span className="status-done-badge">✅ Archivé</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {feedbacks.length === 0 && <p className="empty-text">Aucun message.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPage;