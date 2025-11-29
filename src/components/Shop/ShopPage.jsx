import React, { useState, useEffect } from 'react';
// CORRECTION 1 : Ajout de bikeService ici
import { shopService, authService, bikeService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { FaBolt, FaGem, FaCheck, FaMagic, FaPalette, FaIdBadge, FaCrown, FaSync, FaBicycle, FaTimes, FaFilter, FaSortAmountDown, FaTrophy } from 'react-icons/fa';
import './ShopPage.css';

function ShopPage() {
    const navigate = useNavigate();
    const [catalog, setCatalog] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [myBikes, setMyBikes] = useState([]);
    const [profile, setProfile] = useState(null);
    
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('skin'); 
    const [isSyncing, setIsSyncing] = useState(false);
    const [gainAnim, setGainAnim] = useState(null); // { amount: 50, type: 'watts' }
    const [processing, setProcessing] = useState(null);
    
    // Filtres
    const [filterRarity, setFilterRarity] = useState('all');
    const [sortOrder, setSortOrder] = useState('price_asc');

    // Modales
    const [showBikeSelector, setShowBikeSelector] = useState(false);
    const [selectedFrameItem, setSelectedFrameItem] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [catData, invData, profData, bikeData] = await Promise.all([
                shopService.getCatalog(), shopService.getInventory(), authService.getMyProfile(), bikeService.getAll()
            ]);
            // On ne montre pas les items exclusifs au Battle Pass dans la boutique
            setCatalog(catData?.filter(i => !i.is_exclusive) || []);
            setInventory(invData || []);
            setProfile(profData);
            setMyBikes(bikeData.filter(b => b.user_id === profData.user_id));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleSyncWatts = async () => {
        setIsSyncing(true);
        try {
            const oldWatts = profile?.watts || 0;
            const data = await shopService.syncHistory();
            const gained = data.watts - oldWatts;
            
            await loadData();
            
            if (gained > 0) {
                setGainAnim({ amount: gained, type: 'watts' });
                setTimeout(() => setGainAnim(null), 2000);
            }
        } catch (e) { console.error(e); } 
        finally { setIsSyncing(false); }
    };

    const handleBuy = async (item, currency) => {
        if (!window.confirm(`Acheter "${item.name}" ?`)) return;
        try {
            await shopService.buy(item.id, currency);
            await loadData();
            alert("Achat réussi !");
        } catch (e) { alert(e.message); }
    };

    // --- FILTRAGE ---
    const getFilteredItems = () => {
        let items = catalog.filter(item => item.type === activeTab);
        
        if (filterRarity !== 'all') {
            items = items.filter(i => i.rarity === filterRarity);
        }

        items.sort((a, b) => {
            if (sortOrder === 'price_asc') return a.price_watts - b.price_watts;
            if (sortOrder === 'price_desc') return b.price_watts - a.price_watts;
            return 0;
        });

        return items;
    };

    // --- ÉQUIPEMENT GLOBAL (Skin, Badge, Titre) ---
    const handleGlobalEquip = async (invItem) => {
        setProcessing(invItem.item_id);
        try {
            await shopService.equip(invItem.id, invItem.shop_items.type);
            await loadData();
            if (invItem.shop_items.type === 'skin') {
                const event = new CustomEvent('themeChange', { detail: invItem.shop_items.asset_data });
                window.dispatchEvent(event);
            }
        } catch (e) { console.error(e); }
        finally { setProcessing(null); }
    };

    // --- ÉQUIPEMENT VÉLO (Cadre) ---
    const openBikeSelector = (item) => {
        setSelectedFrameItem(item);
        setShowBikeSelector(true);
    };

    const confirmFrameEquip = async (bikeId) => {
        try {
            await shopService.equipBike(bikeId, selectedFrameItem.id);
            alert("Cadre installé sur le vélo !");
            setShowBikeSelector(false);
            loadData(); 
        } catch(e) { alert("Erreur installation"); }
    };

    const getOwnedItem = (itemId) => inventory.find(inv => inv.item_id === itemId);

    if (loading) return <div className="loading">Chargement...</div>;

    return (
        <div className="shop-page">
            
            {/* ANIMATION GAIN */}
            {gainAnim && (
                <div className="gain-floating">
                    +{gainAnim.amount} <FaBolt />
                </div>
            )}

            {/* MODALE SÉLECTION VÉLO (CORRECTION 3) */}
            {showBikeSelector && (
                <div className="modal-overlay" onClick={() => setShowBikeSelector(false)}>
                    <div className="glass-panel modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                            <h3>Choisir un vélo</h3>
                            <button onClick={() => setShowBikeSelector(false)} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}><FaTimes /></button>
                        </div>
                        <div className="bike-selector-list">
                            {myBikes.length === 0 ? <p>Aucun vélo dans le garage.</p> : myBikes.map(bike => (
                                <div key={bike.id} className="bike-select-item" onClick={() => confirmFrameEquip(bike.id)}>
                                    <FaBicycle /> {bike.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <header className="shop-header">
                <div>
                    <h2 className="gradient-text">Le Marché</h2>
                    <button className="battlepass-link-btn" onClick={() => navigate('/app/season')}>
                        <FaTrophy /> Voir le Battle Pass
                    </button>
                </div>
                
                <div className="wallet-container">
                    <div className="wallet-part">
                        <FaBolt className="icon-watts" />
                        <div className="wallet-text"><span className="amount-watts">{profile?.watts || 0}</span><small>WATTS</small></div>
                        <button onClick={handleSyncWatts} className="btn-sync" disabled={isSyncing}>
                            <FaSync className={isSyncing ? 'spinning' : ''} />
                        </button>
                    </div>
                    <div className="wallet-sep"></div>
                    <div className="wallet-part">
                        <FaGem className="icon-chips" />
                        <div className="wallet-text"><span className="amount-chips">{profile?.neon_chips || 0}</span><small>CHIPS</small></div>
                    </div>
                </div>
            </header>

            {/* BARRE DE FILTRES */}
            <div className="filters-bar glass-panel">
                <div className="tabs-group">
                    <button className={`tab-btn ${activeTab === 'skin' ? 'active' : ''}`} onClick={() => setActiveTab('skin')}><FaPalette /> Thèmes</button>
                    <button className={`tab-btn ${activeTab === 'frame' ? 'active' : ''}`} onClick={() => setActiveTab('frame')}><FaMagic /> Cadres</button>
                    <button className={`tab-btn ${activeTab === 'badge' ? 'active' : ''}`} onClick={() => setActiveTab('badge')}><FaIdBadge /> Badges</button>
                    <button className={`tab-btn ${activeTab === 'title' ? 'active' : ''}`} onClick={() => setActiveTab('title')}><FaCrown /> Titres</button>
                </div>

                <div className="filters-group">
                    <div className="filter-select-wrapper">
                        <FaFilter />
                        <select value={filterRarity} onChange={e => setFilterRarity(e.target.value)}>
                            <option value="all">Toutes raretés</option>
                            <option value="common">Commun</option>
                            <option value="rare">Rare</option>
                            <option value="epic">Épique</option>
                            <option value="legendary">Légendaire</option>
                        </select>
                    </div>
                    <div className="filter-select-wrapper">
                        <FaSortAmountDown />
                        <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                            <option value="price_asc">Prix croissant</option>
                            <option value="price_desc">Prix décroissant</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="shop-grid">
                {getFilteredItems().map(item => {
                    const ownedInv = getOwnedItem(item.id);
                    const isGlobalEquipped = ownedInv?.is_equipped;

                    return (
                        <div key={item.id} className={`shop-card glass-panel ${ownedInv ? 'is-owned' : ''} rarity-${item.rarity || 'common'}`}>
                            <div className="card-visual">
                                {
                                    item.type === 'skin' ? <div className="preview-skin" style={{background: item.asset_data?.primary}}>Aa</div> : 
                                    item.type === 'frame' ? <div className={`preview-frame ${item.asset_data?.className}`}></div> :
                                    item.type === 'badge' ? <span style={{fontSize:'3rem'}}>{item.asset_data?.icon}</span> : 
                                    item.type === 'title' ? <span className={item.asset_data?.className || ''} style={{fontSize: '0.9rem', textAlign: 'center', padding: '5px'}}>{item.name}</span> :
                                    <FaMagic />
                                }
                            </div>

                            <div className="card-details">
                                <h4>{item.name}</h4>
                                <p>{item.description}</p>
                            </div>

                            <div className="card-actions">
                                {ownedInv ? (
                                    // CORRECTION 4 : Logique pour les cadres
                                    item.type === 'frame' ? (
                                        <button className="btn-action equip" onClick={() => openBikeSelector(item)}>Installer sur un vélo</button>
                                    ) : (
                                        isGlobalEquipped ? (
                                            <button className="btn-action equipped" disabled><FaCheck /> Activé</button>
                                        ) : (
                                            <button className="btn-action equip" onClick={() => handleGlobalEquip(ownedInv)} disabled={!!processing}>Activer</button>
                                        )
                                    )
                                ) : (
                                    <div className="price-row">
                                        {item.price_watts > 0 && <button className="btn-price watts" onClick={() => handleBuy(item, 'watts')} disabled={profile.watts < item.price_watts}><FaBolt /> {item.price_watts}</button>}
                                        {item.price_chips > 0 && <button className="btn-price chips" onClick={() => handleBuy(item, 'chips')} disabled={profile.neon_chips < item.price_chips}><FaGem /> {item.price_chips}</button>}
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