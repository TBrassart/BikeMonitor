import React, { useState, useEffect } from 'react';
import { shopService, bikeService, authService } from '../../services/api'; // Ajout bikeService
import { FaUserAstronaut, FaGem, FaCheck, FaUndo, FaBicycle, FaTimes } from 'react-icons/fa';
import './InventoryPage.css';

function InventoryPage() {
    const [inventory, setInventory] = useState([]);
    const [myBikes, setMyBikes] = useState([]); // Pour la modale
    const [loading, setLoading] = useState(true);
    
    // États Modale Choix Vélo
    const [showBikeSelector, setShowBikeSelector] = useState(false);
    const [selectedFrameItem, setSelectedFrameItem] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [invData, bikeData, profile] = await Promise.all([
                shopService.getInventory(),
                bikeService.getAll(),
                authService.getMyProfile()
            ]);
            
            setInventory(invData || []);
            // On filtre pour n'avoir que mes vélos
            setMyBikes(bikeData.filter(b => b.user_id === profile.user_id));
            
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    // --- LOGIQUE CADRES (SPÉCIALE) ---
    const handleFrameClick = (invItem) => {
        // On ouvre la modale pour choisir le vélo
        setSelectedFrameItem(invItem.shop_items); // On passe l'objet shop_item
        setShowBikeSelector(true);
    };

    const confirmFrameEquip = async (bikeId) => {
        try {
            await shopService.equipBike(bikeId, selectedFrameItem.id);
            alert("Cadre installé !");
            setShowBikeSelector(false);
        } catch(e) { alert("Erreur installation"); }
    };

    // --- LOGIQUE STANDARD (Skins, Badges) ---
    const handleEquip = async (invItem) => {
        try {
            await shopService.equip(invItem.id, invItem.shop_items.type);
            await loadData();
            
            if (invItem.shop_items.type === 'skin') {
                const event = new CustomEvent('themeChange', { detail: invItem.shop_items.asset_data });
                window.dispatchEvent(event);
            }
        } catch (e) { alert("Erreur équipement"); }
    };

    const handleReset = async (type) => {
        if (!window.confirm("Retirer l'équipement ?")) return;
        try {
            await shopService.unequip(type);
            await loadData();
            if (type === 'skin') {
                const event = new CustomEvent('themeChange', { detail: null });
                window.dispatchEvent(event);
            }
        } catch (e) { alert("Erreur reset"); }
    };

    const renderSection = (title, type, items) => {
        const somethingEquipped = items.some(i => i.is_equipped);

        return (
            <div className="inventory-section glass-panel">
                <div className="section-header-row">
                    <h4>{title}</h4>
                    {somethingEquipped && type !== 'frame' && (
                        <button className="reset-btn" onClick={() => handleReset(type)}><FaUndo /> Reset</button>
                    )}
                </div>
                
                <div className="inventory-grid">
                    {items.length === 0 && <p className="empty-text">Rien ici.</p>}
                    {items.map(inv => (
                        <div 
                            key={inv.id} 
                            className={`inventory-item ${inv.is_equipped ? 'active' : ''}`}
                            // Si c'est un cadre, on ouvre la modale, sinon on équipe direct
                            onClick={() => type === 'frame' ? handleFrameClick(inv) : handleEquip(inv)}
                            style={type === 'frame' ? { borderColor: inv.shop_items.asset_data?.border } : {}}
                        >
                            <div className="item-header">
                                <span>{inv.shop_items.name}</span>
                                {inv.is_equipped && <FaCheck className="check-icon"/>}
                            </div>
                            {type === 'skin' && (
                                <div className="skin-preview" style={{background: inv.shop_items.asset_data?.primary}}></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) return <div className="loading">Chargement...</div>;

    return (
        <div className="inventory-page">
            
            {/* MODALE SÉLECTION VÉLO */}
            {showBikeSelector && (
                <div className="modal-overlay" onClick={() => setShowBikeSelector(false)}>
                    <div className="glass-panel modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                            <h3>Choisir un vélo</h3>
                            <button onClick={() => setShowBikeSelector(false)} className="close-btn"><FaTimes /></button>
                        </div>
                        <div className="bike-selector-list">
                            {myBikes.map(bike => (
                                <div key={bike.id} className="bike-select-item" onClick={() => confirmFrameEquip(bike.id)}>
                                    <FaBicycle /> {bike.name}
                                    {/* Indicateur si ce vélo a déjà ce cadre */}
                                    {bike.frame_id === selectedFrameItem.id && <FaCheck style={{marginLeft:'auto', color:'var(--neon-green)'}}/>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {renderSection("🎨 Thèmes", 'skin', inventory.filter(i => i.shop_items.type === 'skin'))}
            {renderSection("🖼️ Cadres Vélo", 'frame', inventory.filter(i => i.shop_items.type === 'frame'))}
            {renderSection("📛 Badges", 'badge', inventory.filter(i => i.shop_items.type === 'badge'))}
            {renderSection("👑 Titres", 'title', inventory.filter(i => i.shop_items.type === 'title'))}
        </div>
    );
}

export default InventoryPage;