import React, { useState, useEffect } from 'react';
import { adminService, authService } from '../../services/api';
import { 
    FaUsers, FaDatabase, FaChartLine, FaUserShield, FaTrash, 
    FaListAlt, FaLock, FaTools, FaFileCsv, FaFileCode, 
    FaEnvelopeOpenText, FaBroom, FaPowerOff, FaSearch 
} from 'react-icons/fa';
import './AdminPage.css';

function AdminPage() {
    const [isLocked, setIsLocked] = useState(true);
    const [pin, setPin] = useState('');
    const ADMIN_PIN = "1234";

    const [activeTab, setActiveTab] = useState('users'); 
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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
            const [statsData, usersData, logsData] = await Promise.all([
                adminService.getStats(),
                adminService.getAllUsers(),
                adminService.getLogs()
            ]);
            setStats(statsData);
            setUsers(usersData);
            setLogs(logsData);
            setIsLocked(false);
        } catch (e) {
            alert("Erreur chargement données.");
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

    const handleNewsletter = () => {
        const emails = users.map(u => u.email).filter(e => e).join(', ');
        if (emails) {
            navigator.clipboard.writeText(emails);
            alert(`${users.length} emails copiés !`);
        } else alert("Aucun email.");
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

    const exportData = async (type, format) => {
        const data = type === 'library' ? await adminService.exportLibrary() : await adminService.exportLogs();
        if (!data?.length) return alert("Rien à exporter");
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_${type}.json`;
        a.click();
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
                            placeholder="PIN" 
                            autoFocus 
                            maxLength={4}
                            className="pin-input"
                        />
                        <button type="submit" className="primary-btn" style={{width:'100%'}}>Déverrouiller</button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading) return <div className="loading">Chargement...</div>;

    const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <h2 className="gradient-text">Administration</h2>
                    {maintenanceMode && <span className="maint-badge">MAINTENANCE ACTIVE</span>}
                </div>
                <div className="admin-tabs">
                    <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}><FaUsers /> Pilotes</button>
                    <button className={activeTab === 'logs' ? 'active' : ''} onClick={() => setActiveTab('logs')}><FaListAlt /> Logs</button>
                    <button className={activeTab === 'system' ? 'active' : ''} onClick={() => setActiveTab('system')}><FaTools /> Système</button>
                </div>
            </header>

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
                </div>
            )}

            {/* TAB USERS */}
            {activeTab === 'users' && (
                <div className="admin-section">
                    <div className="section-header">
                        <h3>Utilisateurs</h3>
                        <div className="search-box"><FaSearch /><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Chercher..." /></div>
                    </div>
                    <div className="users-table-container">
                        <table className="users-table">
                            <thead><tr><th>Avatar</th><th>Nom</th><th>Rôle</th><th>Inscrit le</th><th>Actions</th></tr></thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id}>
                                        <td><span className="user-avatar">{u.avatar}</span></td>
                                        <td>{u.name}<div style={{fontSize:'0.7rem', color:'#888'}}>{u.email}</div></td>
                                        <td><span className={`role-badge ${u.app_role}`}>{u.app_role}</span></td>
                                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {u.app_role !== 'admin' && (
                                                <div className="actions-row">
                                                    <button className="action-icon" onClick={() => handleRoleChange(u, u.app_role)}><FaUserShield /></button>
                                                    <button className="action-icon delete" onClick={() => handleEjectUser(u)}><FaTrash /></button>
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
                                <span className="log-date">{new Date(l.created_at).toLocaleDateString()}</span>
                                <span className="log-user">{l.user_name}</span>
                                <span className="log-action">{l.action}</span>
                                <span className="log-details">{l.details}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPage;