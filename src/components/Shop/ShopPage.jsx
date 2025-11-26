import React, { useState, useEffect } from 'react';
import { shopService, authService } from '../../services/api';
import { FaBolt, FaGem, FaCheck, FaMagic, FaPalette, FaIdBadge, FaCrown, FaSync } from 'react-icons/fa';
function ShopPage() {
    const [catalog, setCatalog] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('skin'); // skin, frame, badge, title
    const [processing, setProcessing] = useState(null); // ID de l'item en cours d'achat
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [catData, invData, profData] = await Promise.all([
                shopService.getCatalog(),
                shopService.getInventory(),
                authService.getMyProfile()
            ]);
            setCatalog(catData);
            setInventory(invData);
            setProfile(profData);
        } catch (e) {
            console.error("Erreur chargement shop", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncWatts = async () => {
        setIsSyncing(true);
        try {
            await shopService.syncHistory();
            await loadData(); // Recharge le profil pour voir le nouveau solde
        } catch (e) {
            console.error(e);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleBuy = async (item, currency) => {
        if (!window.confirm(`Acheter "${item.name}" pour ${currency === 'watts' ? item.price_watts + ' Watts' : item.price_chips + ' Chips'} ?`)) return;

        setProcessing(item.id);
        try {
            await shopService.buy(item.id, currency);
            // On recharge tout pour mettre à jour le solde et l'inventaire
            await loadData();
            alert("Achat réussi ! 🛍️");
        } catch (e) {
            alert("Erreur : " + e.message);
        } finally {
            setProcessing(null);
        }
    };

    const handleEquip = async (invItem) => {
        setProcessing(invItem.item_id);
        try {
            await shopService.equip(invItem.id, invItem.shop_items.type);
            await loadData();
        } catch (e) {
            console.error(e);
        } finally {
            setProcessing(null);
        }
    };

    // Vérifie si on possède l'item (retourne l'objet inventaire ou null)
    const getOwnedItem = (itemId) => {
        return inventory.find(inv => inv.item_id === itemId);
    };

    const filteredItems = catalog.filter(item => item.type === activeTab);

    if (loading) return <div className="loading-screen">Ouverture du marché noir...</div>;

    return (
        <div className="shop-page">
            <header className="shop-header">
                <h2 className="gradient-text">Le Marché</h2>
                {/* PORTE-MONNAIE */}
                <div className="wallet-display glass-panel">
                    <div className="wallet-section">
                        <div className="wallet-item watts">
                            <FaBolt />
                            <span>{profile?.watts || 0}</span>
                            <small>Watts</small>
                        </div>
                        
                        <button 
                            onClick={handleSyncWatts} 
                            className="icon-action-small" 
                            title="Récupérer mes Watts historiques"
                            disabled={isSyncing}
                        >
                            <FaSync className={isSyncing ? 'spinning' : ''} />
                        </button>
                    </div>

                    <div className="wallet-divider"></div>
                    
                    <div className="wallet-item chips">
                        <FaGem />
                        <span>{profile?.neon_chips || 0}</span>
                        <small>Chips</small>
                    </div>
                </div>
            </header>

            {/* TABS */}
            <div className="shop-tabs glass-panel">
                <button className={activeTab === 'skin' ? 'active' : ''} onClick={() => setActiveTab('skin')}><FaPalette /> Thèmes</button>
                <button className={activeTab === 'frame' ? 'active' : ''} onClick={() => setActiveTab('frame')}><FaMagic /> Cadres</button>
                <button className={activeTab === 'badge' ? 'active' : ''} onClick={() => setActiveTab('badge')}><FaIdBadge /> Badges</button>
                <button className={activeTab === 'title' ? 'active' : ''} onClick={() => setActiveTab('title')}><FaCrown /> Titres</button>
            </div>

            {/* GRILLE */}
            <div className="shop-grid">
                {filteredItems.map(item => {
                    const owned = getOwnedItem(item.id);
                    const isEquipped = owned?.is_equipped;

                    return (
                        <div key={item.id} className={`shop-card glass-panel ${owned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}`}>
                            <div className="item-preview" style={{
                                border: item.type === 'frame' && item.asset_data?.border ? `3px solid ${item.asset_data.border}` : 'none',
                                background: item.type === 'skin' && item.asset_data?.bg ? item.asset_data.bg : 'rgba(255,255,255,0.05)'
                            }}>
                                {item.type === 'badge' ? <span style={{fontSize:'3rem'}}>{item.asset_data?.icon || '📦'}</span> : 
                                 item.type === 'skin' ? <span style={{color: item.asset_data?.primary || 'white', fontWeight:'bold'}}>Aa</span> :
                                 <FaMagic style={{fontSize:'2rem', color:'#666'}} />
                                }
                            </div>

                            <div className="item-info">
                                <h4>{item.name}</h4>
                                <p>{item.description}</p>
                            </div>

                            <div className="item-actions">
                                {owned ? (
                                    isEquipped ? (
                                        <button className="action-btn equipped" disabled><FaCheck /> Équipé</button>
                                    ) : (
                                        <button className="action-btn equip" onClick={() => handleEquip(owned)} disabled={!!processing}>
                                            {processing === item.id ? '...' : 'Équiper'}
                                        </button>
                                    )
                                ) : (
                                    <div className="buy-buttons">
                                        {item.price_watts > 0 && (
                                            <button 
                                                className="buy-btn watts" 
                                                onClick={() => handleBuy(item, 'watts')}
                                                disabled={profile.watts < item.price_watts || !!processing}
                                            >
                                                <FaBolt /> {item.price_watts}
                                            </button>
                                        )}
                                        {item.price_chips > 0 && (
                                            <button 
                                                className="buy-btn chips" 
                                                onClick={() => handleBuy(item, 'chips')}
                                                disabled={profile.neon_chips < item.price_chips || !!processing}
                                            >
                                                <FaGem /> {item.price_chips}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ShopPage;