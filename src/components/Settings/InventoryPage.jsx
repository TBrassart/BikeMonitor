import React, { useState, useEffect } from 'react';
import { shopService } from '../../services/api';
import { FaUserAstronaut, FaGem, FaCheck } from 'react-icons/fa';
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
            
            // Si c'est un skin, on applique immédiatement
            if (invItem.shop_items.type === 'skin') {
                const event = new CustomEvent('themeChange', { detail: invItem.shop_items.asset_data });
                window.dispatchEvent(event);
            }
        } catch (e) { alert("Erreur équipement"); }
    };

    const renderSection = (title, type, items) => (
        <div className="inventory-section glass-panel">
            <h4>{title}</h4>
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

    if (loading) return <div className="loading">Chargement de l'armurerie...</div>;

    const skins = inventory.filter(i => i.shop_items.type === 'skin');
    const badges = inventory.filter(i => i.shop_items.type === 'badge');
    const titles = inventory.filter(i => i.shop_items.type === 'title');
    const frames = inventory.filter(i => i.shop_items.type === 'frame');

    return (
        <div className="inventory-page">
            {renderSection("🎨 Thèmes d'interface", 'skin', skins)}
            {renderSection("🖼️ Cadres Vélo (Générique)", 'frame', frames)}
            {renderSection("📛 Badges de Profil", 'badge', badges)}
            {renderSection("👑 Titres Honorifiques", 'title', titles)}
            
            <p className="info-note">
                <FaGem /> Pour équiper un cadre sur un vélo spécifique, passe par la <strong>Boutique, puis Installer</strong>.
                Ici, tu définis tes préférences globales.
            </p>
        </div>
    );
}

export default InventoryPage;