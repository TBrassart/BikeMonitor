import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import { FaLink, FaClock, FaInfinity, FaTrash, FaCopy, FaCog } from 'react-icons/fa';
import './TurlagManager.css'; // Réutilisation CSS

function TurlagAdmin({ turlagId, turlagData, onUpdate }) {
    const [invites, setInvites] = useState([]);
    const [newInvite, setNewInvite] = useState({ expiresInDays: '7', maxUses: '' });
    const [settings, setSettings] = useState({ 
        max_members: turlagData.max_members || 50, 
        icon_url: turlagData.icon_url || '',
        description: turlagData.description || ''
    });

    useEffect(() => {
        loadInvites();
    }, [turlagId]);

    const loadInvites = async () => {
        const data = await authService.getInvites(turlagId);
        setInvites(data || []);
    };

    const createInvite = async (e) => {
        e.preventDefault();
        try {
            await authService.createInvite(turlagId, {
                expiresInDays: newInvite.expiresInDays === 'never' ? null : parseInt(newInvite.expiresInDays),
                maxUses: newInvite.maxUses ? parseInt(newInvite.maxUses) : null
            });
            loadInvites();
        } catch(e) { alert("Erreur création"); }
    };

    const deleteInvite = async (id) => {
        if(window.confirm("Révoquer ce lien ?")) {
            await authService.deleteInvite(id);
            loadInvites();
        }
    };

    const saveSettings = async (e) => {
        e.preventDefault();
        try {
            await authService.updateTurlag(turlagId, settings);
            alert("Paramètres mis à jour !");
            onUpdate(); // Refresh parent
        } catch(e) { alert("Erreur sauvegarde"); }
    };

    const copyLink = (code) => {
        const url = `${window.location.origin}/invite/${code}`;
        navigator.clipboard.writeText(url);
        alert("Lien copié !");
    };

    return (
        <div className="turlag-admin-panel">
            <h3 style={{borderBottom:'1px solid #333', paddingBottom:'10px', marginTop:'30px'}}>
                <FaCog /> Administration du Turlag
            </h3>

            <div className="admin-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginTop:'20px'}}>
                
                {/* GESTION INVITATIONS */}
                <div className="glass-panel" style={{padding:'20px'}}>
                    <h4>Créer une invitation</h4>
                    <form onSubmit={createInvite} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                        <select 
                            value={newInvite.expiresInDays} 
                            onChange={e => setNewInvite({...newInvite, expiresInDays: e.target.value})}
                            className="neon-select"
                        >
                            <option value="1">Expire dans 1 jour</option>
                            <option value="7">Expire dans 7 jours</option>
                            <option value="30">Expire dans 30 jours</option>
                            <option value="never">Jamais (Permanent)</option>
                        </select>
                        <input 
                            type="number" placeholder="Max utilisateurs (vide = infini)" 
                            value={newInvite.maxUses} onChange={e => setNewInvite({...newInvite, maxUses: e.target.value})}
                            style={{background:'rgba(0,0,0,0.3)', border:'1px solid #444', color:'white', padding:'10px', borderRadius:'8px'}}
                        />
                        <button type="submit" className="primary-btn">Générer le lien</button>
                    </form>

                    <div className="invites-list" style={{marginTop:'20px'}}>
                        {invites.map(inv => (
                            <div key={inv.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.05)', padding:'10px', borderRadius:'8px', marginBottom:'5px'}}>
                                <div>
                                    <div style={{color:'var(--neon-blue)', fontWeight:'bold', cursor:'pointer'}} onClick={() => copyLink(inv.code)}>
                                        {inv.code} <FaCopy style={{fontSize:'0.8rem'}}/>
                                    </div>
                                    <div style={{fontSize:'0.7rem', color:'#888'}}>
                                        {inv.uses_count} / {inv.max_uses || '∞'} • Exp: {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : 'Jamais'}
                                    </div>
                                </div>
                                <button onClick={() => deleteInvite(inv.id)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer'}}><FaTrash /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RÉGLAGES GÉNÉRAUX */}
                <div className="glass-panel" style={{padding:'20px'}}>
                    <h4>Paramètres du Groupe</h4>
                    <form onSubmit={saveSettings} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                        <div>
                            <label style={{fontSize:'0.8rem', color:'#888'}}>Description</label>
                            <textarea 
                                value={settings.description} onChange={e => setSettings({...settings, description: e.target.value})}
                                style={{width:'100%', background:'rgba(0,0,0,0.3)', border:'1px solid #444', color:'white', padding:'10px', borderRadius:'8px'}}
                            />
                        </div>
                        <div>
                            <label style={{fontSize:'0.8rem', color:'#888'}}>Limite Membres</label>
                            <input 
                                type="number" value={settings.max_members} onChange={e => setSettings({...settings, max_members: e.target.value})}
                                style={{width:'100%', background:'rgba(0,0,0,0.3)', border:'1px solid #444', color:'white', padding:'10px', borderRadius:'8px'}}
                            />
                        </div>
                        <div>
                            <label style={{fontSize:'0.8rem', color:'#888'}}>URL Icône</label>
                            <input 
                                type="text" value={settings.icon_url} onChange={e => setSettings({...settings, icon_url: e.target.value})}
                                style={{width:'100%', background:'rgba(0,0,0,0.3)', border:'1px solid #444', color:'white', padding:'10px', borderRadius:'8px'}}
                            />
                        </div>
                        <button type="submit" className="admin-std-btn">Sauvegarder</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default TurlagAdmin;