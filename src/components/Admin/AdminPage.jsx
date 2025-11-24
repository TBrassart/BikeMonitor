import React, { useState, useEffect } from 'react';
import { adminService, authService } from '../../services/api';
import { FaUsers, FaDatabase, FaChartLine, FaUserShield, FaBan, FaSearch } from 'react-icons/fa';
import './AdminPage.css';

function AdminPage() {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        checkRights();
    }, []);

    const checkRights = async () => {
        const profile = await authService.getMyProfile();
        if (profile && profile.app_role === 'admin') {
            setIsAdmin(true);
            loadData();
        } else {
            setLoading(false);
        }
    };

    const loadData = async () => {
        try {
            const [statsData, usersData] = await Promise.all([
                adminService.getStats(),
                adminService.getAllUsers()
            ]);
            setStats(statsData);
            setUsers(usersData);
        } catch (e) {
            console.error("Erreur admin", e);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, currentRole) => {
        const newRole = currentRole === 'user' ? 'moderator' : 'user';
        if (window.confirm(`Passer cet utilisateur en ${newRole} ?`)) {
            await adminService.updateRole(userId, newRole);
            loadData();
        }
    };

    if (!loading && !isAdmin) {
        return (
            <div className="admin-denied">
                <h1>⛔ Accès Interdit</h1>
                <p>Cette zone est réservée au staff technique.</p>
            </div>
        );
    }

    if (loading) return <div className="loading">Chargement du QG...</div>;

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) // Si email dispo
    );

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h2 className="gradient-text">Administration</h2>
                <p className="subtitle">Tour de contrôle</p>
            </header>

            {/* KPI GLOBAL */}
            <div className="admin-kpi-grid">
                <div className="kpi-card glass-panel">
                    <FaUsers className="kpi-icon" style={{color: '#3b82f6'}} />
                    <div>
                        <span className="value">{stats.users}</span>
                        <span className="label">Pilotes</span>
                    </div>
                </div>
                <div className="kpi-card glass-panel">
                    <FaDatabase className="kpi-icon" style={{color: '#10b981'}} />
                    <div>
                        <span className="value">{stats.bikes}</span>
                        <span className="label">Vélos</span>
                    </div>
                </div>
                <div className="kpi-card glass-panel">
                    <FaChartLine className="kpi-icon" style={{color: '#f59e0b'}} />
                    <div>
                        <span className="value">{parseInt(stats.totalKm).toLocaleString()}</span>
                        <span className="label">Km Cumulés</span>
                    </div>
                </div>
            </div>

            {/* GESTION UTILISATEURS */}
            <div className="admin-section glass-panel">
                <div className="section-header">
                    <h3>Gestion Utilisateurs</h3>
                    <div className="search-box">
                        <FaSearch />
                        <input 
                            type="text" 
                            placeholder="Rechercher un pilote..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="users-table-container">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Avatar</th>
                                <th>Nom</th>
                                <th>Rôle</th>
                                <th>Inscription</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td><span className="user-avatar">{user.avatar || '👤'}</span></td>
                                    <td>{user.name}</td>
                                    <td>
                                        <span className={`role-badge ${user.app_role}`}>
                                            {user.app_role}
                                        </span>
                                    </td>
                                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td>
                                        {user.app_role !== 'admin' && (
                                            <button 
                                                className="action-icon" 
                                                onClick={() => handleRoleChange(user.user_id, user.app_role)}
                                                title={user.app_role === 'moderator' ? "Rétrograder" : "Promouvoir Modérateur"}
                                            >
                                                <FaUserShield color={user.app_role === 'moderator' ? '#10b981' : '#6b7280'} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default AdminPage;