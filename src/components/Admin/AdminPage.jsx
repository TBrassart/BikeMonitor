import React, { useState, useEffect } from 'react';
import { adminService, authService } from '../../services/api';
import { 
    FaUsers, FaDatabase, FaChartLine, FaUserShield, FaTrash, 
    FaListAlt, FaLock, FaTools, FaFileCsv, FaFileCode, 
    FaEnvelopeOpenText, FaBroom, FaPowerOff, FaSearch, FaExclamationCircle 
} from 'react-icons/fa';
import './AdminPage.css';

function AdminPage() {
    // --- SÉCURITÉ 2FA (PIN) ---
    const [isLocked, setIsLocked] = useState(true);
    const [pin, setPin] = useState('');
    const ADMIN_PIN = "1234"; // À changer pour la prod si nécessaire

    // --- ÉTATS ---
    const [activeTab, setActiveTab] = useState('users'); // 'users', 'logs', 'system'
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. VÉRIFICATION DES DROITS AU CHARGEMENT
    useEffect(() => {
        checkRights();
    }, []);

    const checkRights = async () => {
        try {
            const profile = await authService.getMyProfile();
            if (profile && profile.app_role === 'admin') {
                setIsAdmin(true);
                // On charge juste l'état maintenance pour l'affichage initial
                const maint = await adminService.getMaintenance();
                setMaintenanceMode(maint);
                setLoading(false);
            } else {
                setLoading(false); // Pas admin, on affichera l'écran "Accès Interdit"
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    // 2. DÉVERROUILLAGE ET CHARGEMENT DES DONNÉES
    const unlockAndLoad = async () => {
        setLoading(true);
        try {
            const [statsData, usersData, logsData] = await Promise.all([
                adminService.getStats(),
                adminService.getAllUsers(),
                adminService.getLogs()
            ]);
            setStats(statsData);
            setUsers(usersData);
            setLogs(logsData);
            setIsLocked(false); // Déverrouillage réussi
        } catch (e) {
            console.error("Erreur chargement admin", e);
            alert("Erreur de chargement des données.");
        } finally {
            setLoading(false);
        }
    };

    const handlePinSubmit = (e) => {
        e.preventDefault();
        if (pin === ADMIN_PIN) {
            unlockAndLoad();
        } else {
            alert("Code PIN incorrect");
            setPin('');
        }
    };

    // --- ACTIONS UTILISATEURS ---

    const handleRoleChange = async (user, currentRole) => {
        const newRole = currentRole === 'user' ? 'moderator' : 'user';
        if (window.confirm(`Passer ${user.name} en ${newRole} ?`)) {
            try {
                await adminService.updateRole(user.user_id, newRole);
                adminService.log('ADMIN_ROLE', `A changé le rôle de ${user.name} en ${newRole}`, 'warning');
                
                // Mise à jour locale pour éviter de tout recharger
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, app_role: newRole } : u));
            } catch (e) { alert("Erreur modification rôle"); }
        }
    };

    const handleEjectUser = async (user) => {
        const confirmName = prompt(`ATTENTION : Action irréversible.\nPour supprimer ${user.name} et TOUTES ses données (vélos, stats...), tapez "DELETE" :`);
        if (confirmName === "DELETE") {
            try {
                await adminService.deleteUser(user.user_id);
                adminService.log('ADMIN_EJECT', `A supprimé définitivement l'utilisateur ${user.name}`, 'danger');
                alert("Utilisateur éjecté.");
                // Mise à jour locale
                setUsers(prev => prev.filter(u => u.id !== user.id));
            } catch (e) {
                alert("Erreur lors de l'éjection.");
            }
        }
    };

    // --- ACTIONS SYSTÈME ---

    const handleMaintenanceToggle = async () => {
        const newState = !maintenanceMode;
        if (window.confirm(`Basculer le mode Maintenance sur ${newState ? 'ON' : 'OFF'} ?\n(Les utilisateurs non-admin seront bloqués)`)) {
            await adminService.setMaintenance(newState);
            setMaintenanceMode(newState);
            adminService.log('MAINTENANCE', `Mode maintenance passé à ${newState}`, 'danger');
        }
    };

    const handleCleanup = async () => {
        if (window.confirm("Scanner et supprimer les photos orphelines du stockage ?")) {
            setLoading(true);
            try {
                const count = await adminService.cleanupPhotos();
                alert(`${count} fichiers inutiles supprimés.`);
                adminService.log('CLEANUP', `${count} photos supprimées`, 'warning');
            } catch(e) { alert("Erreur nettoyage"); }
            setLoading(false);
        }
    };

    const handleNewsletter = () => {
        const emails = users.map(u => u.email).filter(e => e).join(', ');
        if (emails) {
            navigator.clipboard.writeText(emails);
            alert(`${users.length} emails copiés dans le presse-papier !`);
        } else {
            alert("Aucun email trouvé.");
        }
    };

    // --- EXPORTS ---
    const exportData = async (type, format) => {
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
                // CSV simple (aplatit le premier niveau d'objet)
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

    const downloadFile = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // --- VUES ET RENDER ---

    if (!loading && !isAdmin) {
        return (
            <div className="admin-denied">
                <h1>⛔ Accès Interdit</h1>
                <p>Cette zone est réservée au staff technique.</p>
            </div>
        );
    }

    // ÉCRAN DE VERROUILLAGE (PIN)
    if (isLocked && isAdmin && !loading) {
        return (
            <div className="admin-lock-screen glass-panel">
                <FaLock className="lock-icon" />
                <h2>Zone Sécurisée</h2>
                <p style={{color:'#aaa', marginBottom:'20px'}}>Veuillez confirmer votre identité.</p>
                <form onSubmit={handlePinSubmit}>
                    <input 
                        type="password" 
                        value={pin} 
                        onChange={e => setPin(e.target.value)} 
                        placeholder="Code PIN" 
                        autoFocus 
                        maxLength={4}
                        className="pin-input"
                    />
                    <button type="submit" className="primary-btn" style={{width:'100%'}}>Déverrouiller</button>
                </form>
            </div>
        );
    }

    if (loading) return <div className="loading">Chargement du QG...</div>;

    // Filtrage utilisateurs pour la recherche
    const filteredUsers = users.filter(u => 
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <h2 className="gradient-text">Administration</h2>
                    {maintenanceMode && <span className="maint-badge">⚠ MAINTENANCE ACTIVE</span>}
                </div>
                <div className="admin-tabs">
                    <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
                        <FaUsers /> Pilotes
                    </button>
                    <button className={activeTab === 'logs' ? 'active' : ''} onClick={() => setActiveTab('logs')}>
                        <FaListAlt /> Logs
                    </button>
                    <button className={activeTab === 'system' ? 'active' : ''} onClick={() => setActiveTab('system')}>
                        <FaTools /> Système
                    </button>
                </div>
            </header>

            {/* KPI GLOBAL */}
            {stats && (
                <div className="admin-kpi-grid">
                    <div className="kpi-card glass-panel">
                        <FaUsers className="kpi-icon" style={{color: '#3b82f6'}} />
                        <div><span className="value">{stats.users}</span><span className="label">Pilotes</span></div>
                    </div>
                    <div className="kpi-card glass-panel">
                        <FaDatabase className="kpi-icon" style={{color: '#10b981'}} />
                        <div><span className="value">{stats.bikes}</span><span className="label">Vélos</span></div>
                    </div>
                    <div className="kpi-card glass-panel">
                        <FaChartLine className="kpi-icon" style={{color: '#f59e0b'}} />
                        <div><span className="value">{parseInt(stats.totalKm).toLocaleString()}</span><span className="label">Km Cumulés</span></div>
                    </div>
                </div>
            )}

            {/* --- ONGLET UTILISATEURS --- */}
            {activeTab === 'users' && (
                <div className="admin-section glass-panel">
                    <div className="section-header">
                        <h3>Gestion Utilisateurs ({filteredUsers.length})</h3>
                        <div className="search-box">
                            <FaSearch />
                            <input type="text" placeholder="Chercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="users-table-container">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>Avatar</th>
                                    <th>Nom</th>
                                    <th>Rôle</th>
                                    <th>Inscrit le</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id}>
                                        <td><span className="user-avatar">{user.avatar || '👤'}</span></td>
                                        <td>
                                            <div style={{fontWeight:'bold'}}>{user.name}</div>
                                            <div style={{fontSize:'0.8rem', color:'#888'}}>{user.email}</div>
                                        </td>
                                        <td><span className={`role-badge ${user.app_role}`}>{user.app_role}</span></td>
                                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {user.app_role !== 'admin' && (
                                                <div className="actions-row">
                                                    <button className="action-icon" onClick={() => handleRoleChange(user, user.app_role)} title="Changer Rôle">
                                                        <FaUserShield color={user.app_role === 'moderator' ? '#10b981' : '#6b7280'} />
                                                    </button>
                                                    <button className="action-icon delete" onClick={() => handleEjectUser(user)} title="Éjecter">
                                                        <FaTrash />
                                                    </button>
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

            {/* --- ONGLET LOGS --- */}
            {activeTab === 'logs' && (
                <div className="admin-section glass-panel">
                    <div className="section-header">
                        <h3>Journal d'activité (100 derniers)</h3>
                        <div className="export-mini-actions">
                             <button onClick={() => exportData('logs', 'csv')} title="Export CSV"><FaFileCsv /></button>
                        </div>
                    </div>
                    <div className="logs-list">
                        {logs.map(log => (
                            <div key={log.id} className={`log-item ${log.level}`}>
                                <span className="log-date">{new Date(log.created_at).toLocaleString()}</span>
                                <span className="log-user"><strong>{log.user_name}</strong></span>
                                <span className="log-action">{log.action}</span>
                                <span className="log-details">{log.details}</span>
                            </div>
                        ))}
                        {logs.length === 0 && <p style={{padding:'20px', color:'#888'}}>Aucun log enregistré.</p>}
                    </div>
                </div>
            )}

            {/* --- ONGLET SYSTÈME --- */}
            {activeTab === 'system' && (
                <div className="system-grid">
                    {/* MAINTENANCE */}
                    <div className={`system-card glass-panel ${maintenanceMode ? 'danger-zone' : ''}`}>
                        <h3><FaPowerOff /> Mode Maintenance</h3>
                        <p>Bloque l'accès à l'application pour tous les utilisateurs non-admin.</p>
                        <button onClick={handleMaintenanceToggle} className={`toggle-maint-btn ${maintenanceMode ? 'active' : ''}`}>
                            {maintenanceMode ? 'DÉSACTIVER LA MAINTENANCE' : 'ACTIVER LA MAINTENANCE'}
                        </button>
                    </div>

                    {/* CLEANUP */}
                    <div className="system-card glass-panel">
                        <h3><FaBroom /> Nettoyage Stockage</h3>
                        <p>Supprime les photos qui ne sont plus liées à aucun vélo.</p>
                        <button onClick={handleCleanup} className="secondary-btn full-width">Lancer le nettoyage</button>
                    </div>

                    {/* NEWSLETTER */}
                    <div className="system-card glass-panel">
                        <h3><FaEnvelopeOpenText /> Newsletter</h3>
                        <p>Copier la liste des emails de tous les utilisateurs.</p>
                        <button onClick={handleNewsletter} className="secondary-btn full-width">Copier les emails</button>
                    </div>

                    {/* EXPORTS */}
                    <div className="system-card glass-panel">
                        <h3>Exports Données</h3>
                        <div className="export-row">
                            <span>Bibliothèque :</span>
                            <div>
                                <button onClick={() => exportData('library', 'csv')} className="icon-action"><FaFileCsv /></button>
                                <button onClick={() => exportData('library', 'json')} className="icon-action"><FaFileCode /></button>
                            </div>
                        </div>
                        <div className="export-row">
                            <span>Logs Système :</span>
                            <div>
                                <button onClick={() => exportData('logs', 'csv')} className="icon-action"><FaFileCsv /></button>
                                <button onClick={() => exportData('logs', 'json')} className="icon-action"><FaFileCode /></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPage;