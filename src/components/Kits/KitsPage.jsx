import React, { useState, useEffect } from 'react';
import { kitService } from '../../services/api';
import { FaPlus, FaPlay, FaPen, FaTrash } from 'react-icons/fa';
import KitForm from './KitForm';
import KitPlayer from './KitPlayer';
import './KitsPage.css';

function KitsPage() {
    const [kits, setKits] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modales
    const [showForm, setShowForm] = useState(false);
    const [editingKit, setEditingKit] = useState(null);
    const [playingKit, setPlayingKit] = useState(null); // Kit en cours de vérification

    useEffect(() => {
        loadKits();
    }, []);

    const loadKits = async () => {
        setLoading(true);
        try {
            const data = await kitService.getAll();
            setKits(data || []);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if(window.confirm("Supprimer ce kit ?")) {
            await kitService.delete(id);
            loadKits();
        }
    };

    const handleEdit = (e, kit) => {
        e.stopPropagation();
        setEditingKit(kit);
        setShowForm(true);
    };

    const openNew = () => {
        setEditingKit(null);
        setShowForm(true);
    };

    if (loading) return <div className="loading">Chargement des checklists...</div>;

    return (
        <div className="kits-page">
            <header className="page-header">
                <div>
                    <h2 className="gradient-text">Checklists</h2>
                    <p className="subtitle">Ne rien oublier avant le départ</p>
                </div>
                <button className="add-btn primary-btn" onClick={openNew}>
                    <FaPlus /> <span className="desktop-only">Créer</span>
                </button>
            </header>

            <div className="kits-grid">
                {kits.length === 0 ? (
                    <div className="empty-state glass-panel">Crée ton premier kit de départ !</div>
                ) : (
                    kits.map(kit => (
                        <div key={kit.id} className="kit-card glass-panel" onClick={() => setPlayingKit(kit)}>
                            <div className="kit-icon-large">{kit.icon}</div>
                            <div className="kit-info">
                                <h3>{kit.name}</h3>
                                <p>{kit.items?.length || 0} objets</p>
                            </div>
                            <div className="kit-actions">
                                <button className="play-btn"><FaPlay /> LANCER</button>
                                <div className="mini-actions">
                                    <button onClick={(e) => handleEdit(e, kit)}><FaPen /></button>
                                    <button onClick={(e) => handleDelete(e, kit.id)} className="del"><FaTrash /></button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODALES */}
            {showForm && (
                <KitForm 
                    initialData={editingKit} 
                    onClose={() => setShowForm(false)} 
                    onSave={loadKits} 
                />
            )}

            {playingKit && (
                <KitPlayer 
                    kit={playingKit} 
                    onClose={() => setPlayingKit(null)} 
                />
            )}
        </div>
    );
}

export default KitsPage;