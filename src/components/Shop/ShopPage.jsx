import React, { useState, useEffect } from 'react';
import { shopService, authService } from '../../services/api';
import { FaBolt, FaGem, FaCheck, FaMagic, FaPalette, FaIdBadge, FaCrown, FaSync } from 'react-icons/fa';
import './ShopPage.css';

function ShopPage() {
    const [catalog, setCatalog] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('skin');
    const [processing, setProcessing] = useState(null);
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
            setCatalog(catData || []);
            setInventory(invData || []);
            setProfile(profData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncWatts = async () => {
        setIsSyncing(true);
        try {
            await shopService.syncHistory();
            await loadData();
        } catch (e) { console.error(e); } 
        finally { setIsSyncing(false); }
    };

    const handleBuy = async (item, currency) => {
        if (!window.confirm(`Acheter "${item.name}" ?`)) return;
        setProcessing(item.id);
        try {
            await shopService.buy(item.id, currency);
            await loadData();
            alert("Achat réussi !");
        } catch (e) { alert(e.message); } 
        finally { setProcessing(null); }
    };

    const handleEquip = async (invItem) => {
        setProcessing(invItem.item_id);
        try {
            await shopService.equip(invItem.id, invItem.shop_items.type);
            await loadData();
        } catch (e) { console.error(e); } 
        finally { setProcessing(null); }
    };

    const getOwnedItem = (itemId) => inventory.find(inv => inv.item_id === itemId);
    const filteredItems = catalog.filter(item => item.type === activeTab);

    if (loading) return <div className="loading">Chargement du marché...</div>;

    return (
        <div className="shop-page">
            <header className="shop-header">
                <h2 className="gradient-text">Le Marché</h2>
                
                {/* CONTAINER WALLET CORRIGÉ */}
                <div className="wallet-container">
                    {/* Section Watts */}
                    <div className="wallet-part">
                        <FaBolt className="icon-watts" />
                        <div className="wallet-text">
                            <span className="amount-watts">{profile?.watts || 0}</span>
                            <small>WATTS</small>
                        </div>
                        <button 
                            onClick={handleSyncWatts} 
                            className="btn-sync"
                            disabled={isSyncing}
                            title="Synchroniser l'historique"
                        >
                            <FaSync className={isSyncing ? 'spinning' : ''} />
                        </button>
                    </div>

                    <div className="wallet-sep"></div>

                    {/* Section Chips */}
                    <div className="wallet-part">
                        <FaGem className="icon-chips" />
                        <div className="wallet-text">
                            <span className="amount-chips">{profile?.neon_chips || 0}</span>
                            <small>CHIPS</small>
                        </div>
                    </div>
                </div>
            </header>

            {/* TABS CORRIGÉS */}
            <div className="shop-tabs-container">
                <button className={`tab-btn ${activeTab === 'skin' ? 'active' : ''}`} onClick={() => setActiveTab('skin')}><FaPalette /> Thèmes</button>
                <button className={`tab-btn ${activeTab === 'frame' ? 'active' : ''}`} onClick={() => setActiveTab('frame')}><FaMagic /> Cadres</button>
                <button className={`tab-btn ${activeTab === 'badge' ? 'active' : ''}`} onClick={() => setActiveTab('badge')}><FaIdBadge /> Badges</button>
                <button className={`tab-btn ${activeTab === 'title' ? 'active' : ''}`} onClick={() => setActiveTab('title')}><FaCrown /> Titres</button>
            </div>

            {/* GRILLE ITEMS */}
            <div className="shop-grid">
                {filteredItems.map(item => {
                    const owned = getOwnedItem(item.id);
                    const isEquipped = owned?.is_equipped;

                    return (
                        <div key={item.id} className={`shop-card glass-panel ${owned ? 'is-owned' : ''} ${isEquipped ? 'is-equipped' : ''}`}>
                            <div className="card-visual">
                                {item.type === 'skin' ? <div className="preview-skin" style={{background: item.asset_data?.primary}}>Aa</div> : <FaMagic />}
                            </div>

                            <div className="card-details">
                                <h4>{item.name}</h4>
                                <p>{item.description}</p>
                            </div>

                            <div className="card-actions">
                                {owned ? (
                                    isEquipped ? (
                                        <button className="btn-action equipped" disabled><FaCheck /> Équipé</button>
                                    ) : (
                                        <button className="btn-action equip" onClick={() => handleEquip(owned)} disabled={!!processing}>Équiper</button>
                                    )
                                ) : (
                                    <div className="price-row">
                                        {item.price_watts > 0 && (
                                            <button className="btn-price watts" onClick={() => handleBuy(item, 'watts')} disabled={profile.watts < item.price_watts}>
                                                <FaBolt /> {item.price_watts}
                                            </button>
                                        )}
                                        {item.price_chips > 0 && (
                                            <button className="btn-price chips" onClick={() => handleBuy(item, 'chips')} disabled={profile.neon_chips < item.price_chips}>
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