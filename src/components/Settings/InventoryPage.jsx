import React, { useState, useEffect } from 'react';
import { shopService } from '../../services/api';
import { FaUserAstronaut, FaGem, FaCheck, FaUndo } from 'react-icons/fa';
import './InventoryPage.css';

function InventoryPage() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await shopService.getInventory();
            setInventory(data || []);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

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

    // --- NOUVELLE FONCTION : RESET ---
    const handleReset = async (type) => {
        if (!window.confirm("Retirer l'équipement de cette catégorie ?")) return;
        try {
            await shopService.unequip(type);
            await loadData();

            // Si c'est un skin, on remet le thème par défaut
            if (type === 'skin') {
                // Envoyer 'null' déclenche le resetTheme() dans ThemeManager
                const event = new CustomEvent('themeChange', { detail: null });
                window.dispatchEvent(event);
            }
        } catch (e) { alert("Erreur lors du reset"); }
    };

    const renderSection = (title, type, items) => {
        // On vérifie si quelque chose est équipé dans cette catégorie pour afficher le bouton Reset
        const somethingEquipped = items.some(i => i.is_equipped);

        return (
            <div className="inventory-section glass-panel">
                <div className="section-header-row">
                    <h4>{title}</h4>
                    {somethingEquipped && (
                        <button className="reset-btn" onClick={() => handleReset(type)} title="Tout déséquiper">
                            <FaUndo /> Reset
                        </button>
                    )}
                </div>
                
                <div className="inventory-grid">
                    {items.length === 0 && <p className="empty-text">Rien ici. Visite la boutique !</p>}
                    {items.map(inv => (
                        <div 
                            key={inv.id} 
                            className={`inventory-item ${inv.is_equipped ? 'active' : ''}`}
                            onClick={() => handleEquip(inv)}
                            style={inv.shop_items.type === 'frame' ? { borderColor: inv.shop_items.asset_data?.border } : {}}
                        >
                            <div className="item-header">
                                <span>{inv.shop_items.name}</span>
                                {inv.is_equipped && <FaCheck className="check-icon"/>}
                            </div>
                            {inv.shop_items.type === 'skin' && (
                                <div className="skin-preview" style={{background: inv.shop_items.asset_data?.primary}}></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) return <div className="loading">Chargement de l'armurerie...</div>;

    const skins = inventory.filter(i => i.shop_items.type === 'skin');
    const badges = inventory.filter(i => i.shop_items.type === 'badge');
    const titles = inventory.filter(i => i.shop_items.type === 'title');
    const frames = inventory.filter(i => i.shop_items.type === 'frame');

    return (
        <div className="inventory-page">
            {renderSection("🎨 Thèmes d'interface", 'skin', skins)}
            {renderSection("📛 Badges de Profil", 'badge', badges)}
            {renderSection("👑 Titres Honorifiques", 'title', titles)}
            
            {/* Note: Les cadres sont gérés par vélo, donc pas de reset global ici pour éviter la confusion */}
            <div className="inventory-section glass-panel">
                <h4>🖼️ Cadres Vélo (Collection)</h4>
                <div className="inventory-grid">
                    {frames.length === 0 && <p className="empty-text">Aucun cadre.</p>}
                    {frames.map(inv => (
                        <div key={inv.id} className="inventory-item" style={{borderColor: inv.shop_items.asset_data?.border}}>
                            <div className="item-header"><span>{inv.shop_items.name}</span></div>
                        </div>
                    ))}
                </div>
            </div>
            
            <p className="info-note">
                <FaGem /> Pour gérer les cadres sur tes vélos, passe par la <strong>Boutique, puis Installer</strong>.
            </p>
        </div>
    );
}

export default InventoryPage;