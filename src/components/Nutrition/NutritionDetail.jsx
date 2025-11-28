import React, { useState, useEffect } from 'react';
import { nutritionService } from '../../services/api';
import { FaPen, FaHistory, FaChartPie, FaShoppingBasket, FaTimes, FaLeaf, FaCoffee, FaUtensils, FaCalendarTimes, FaUsers } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './NutritionPage.css';

const COLORS = ['#00e5ff', '#ff00c8', '#f1c40f'];

function NutritionDetail({ item, onClose, onEdit, onItemUpdated }) {
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    
    // État pour le Ravitaillement
    const [restock, setRestock] = useState({ qty: '', price: '' });
    const [isRestocking, setIsRestocking] = useState(false);

    useEffect(() => {
        loadHistory();
    }, [item]);

    const loadHistory = async () => {
        try {
            const data = await nutritionService.getHistory(item.id);
            setHistory(data || []);
        } catch (e) { console.error(e); } 
        finally { setLoadingHistory(false); }
    };

    // GESTION DU RAVITAILLEMENT (ACHAT)
    const handleRestock = async (e) => {
        e.preventDefault();
        if (!restock.qty || !restock.price) return;
        setIsRestocking(true);
        try {
            await nutritionService.addStock(item.id, parseInt(restock.qty), parseFloat(restock.price));
            // On notifie le parent pour mettre à jour la liste globale
            if (onItemUpdated) onItemUpdated(); 
            // On recharge l'historique local
            await loadHistory();
            setRestock({ qty: '', price: '' }); // Reset form
            alert("Stock ajouté et prix moyen mis à jour !");
        } catch (error) {
            alert("Erreur ravitaillement");
        } finally {
            setIsRestocking(false);
        }
    };

    const macroData = [
        { name: 'Glucides', value: parseFloat(item.carbs || 0) },
        { name: 'Protéines', value: parseFloat(item.proteins || 0) },
        { name: 'Lipides', value: parseFloat(item.fat || 0) },
    ].filter(d => d.value > 0);

    const avgPrice = history.length > 0 
        ? (history.reduce((acc, h) => acc + (h.unit_price || 0), 0) / history.length).toFixed(2)
        : 0;

    // Calcul péremption
    const daysUntilExpiration = item.expiration_date 
        ? Math.ceil((new Date(item.expiration_date) - new Date()) / (1000 * 60 * 60 * 24)) 
        : null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="glass-panel modal-content nutri-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="detail-header">
                    <div>
                        <h2 style={{margin:0}}>{item.name}</h2>
                        <p className="brand">{item.brand}</p>
                    </div>
                    <button className="close-btn" onClick={onClose}><FaTimes /></button>
                </div>

                <div className="detail-body">
                    {/* GAUCHE */}
                    <div className="detail-left">
                        <div className="tags-container">
                            <span className="nutri-tag type">{item.category_type}</span>
                            {item.turlags && (
                                <span className="nutri-tag shared" title="Visible par le groupe">
                                    <FaUsers /> {item.turlags.name}
                                </span>
                            )}
                            {item.caffeine && <span className="nutri-tag caffeine"><FaCoffee /> Caféine</span>}
                            {item.tags?.includes('vegan') && <span className="nutri-tag vegan"><FaLeaf /> Vegan</span>}
                        </div>

                        {/* Alerte Péremption */}
                        {daysUntilExpiration !== null && (
                            <div className={`expiration-alert ${daysUntilExpiration < 30 ? 'critical' : 'warning'}`} style={{marginBottom:'15px'}}>
                                <FaCalendarTimes /> 
                                {daysUntilExpiration < 0 ? 'PÉRIMÉ' : `Périme dans ${daysUntilExpiration} jours`} 
                                <small>({new Date(item.expiration_date).toLocaleDateString()})</small>
                            </div>
                        )}

                        <div className="macros-chart-container glass-panel">
                            <h4>Macros (par unité)</h4>
                            {macroData.length > 0 ? (
                                <div style={{width:'100%', height:'180px'}}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={macroData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                                {macroData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{backgroundColor:'#1e1e2d', borderRadius:'8px', border:'none'}} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <p className="empty-text">Pas de données.</p>}
                        </div>

                        {item.recipe && (
                            <div className="recipe-box glass-panel">
                                <h4>👨‍🍳 Recette</h4>
                                <p>{item.recipe}</p>
                            </div>
                        )}
                    </div>

                    {/* DROITE */}
                    <div className="detail-right">
                        <div className="kpi-row">
                            <div className="kpi-small">
                                <span className="label">Stock</span>
                                <span className={`value ${item.quantity <= item.min_quantity ? 'alert' : ''}`}>{item.quantity}</span>
                            </div>
                            <div className="kpi-small">
                                <span className="label">Prix Moyen</span>
                                <span className="value">{avgPrice} €</span>
                            </div>
                        </div>

                        {/* FORMULAIRE RAVITAILLEMENT */}
                        <div className="restock-form glass-panel">
                            <h4><FaShoppingBasket /> Ravitaillement (Achat)</h4>
                            <form onSubmit={handleRestock} style={{display:'flex', gap:'10px', alignItems:'flex-end'}}>
                                <div style={{flex:1}}>
                                    <label style={{fontSize:'0.7rem', color:'#888'}}>Qté Ajoutée</label>
                                    <input type="number" required value={restock.qty} onChange={e => setRestock({...restock, qty: e.target.value})} style={{width:'100%', padding:'8px', background:'rgba(0,0,0,0.3)', border:'1px solid #444', color:'white', borderRadius:'4px'}} />
                                </div>
                                <div style={{flex:1}}>
                                    <label style={{fontSize:'0.7rem', color:'#888'}}>Prix Total (€)</label>
                                    <input type="number" step="0.01" required value={restock.price} onChange={e => setRestock({...restock, price: e.target.value})} style={{width:'100%', padding:'8px', background:'rgba(0,0,0,0.3)', border:'1px solid #444', color:'white', borderRadius:'4px'}} />
                                </div>
                                <button type="submit" disabled={isRestocking} style={{background:'var(--gradient-success)', color:'white', border:'none', padding:'8px 15px', borderRadius:'4px', cursor:'pointer', height:'35px'}}>
                                    {isRestocking ? '...' : '+'}
                                </button>
                            </form>
                        </div>

                        <div className="history-list glass-panel">
                            <h4><FaHistory /> Historique d'achat</h4>
                            {loadingHistory ? <p>...</p> : (
                                <ul>
                                    {history.map(h => (
                                        <li key={h.id}>
                                            <span>{new Date(h.purchase_date).toLocaleDateString()}</span>
                                            <span>+{h.quantity_added}</span>
                                            <span style={{color:'var(--text-secondary)'}}>{h.price_paid}€</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <button className="edit-btn-full" onClick={() => { onClose(); onEdit(item); }}>
                            <FaPen /> Modifier la fiche complète
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NutritionDetail;