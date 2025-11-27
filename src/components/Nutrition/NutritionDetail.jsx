import React, { useState, useEffect } from 'react';
import { nutritionService } from '../../services/api';
import { FaPen, FaHistory, FaChartPie, FaShoppingBasket, FaTimes, FaLeaf, FaCoffee, FaUtensils } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './NutritionPage.css'; // On réutilise le CSS principal

const COLORS = ['#00e5ff', '#ff00c8', '#f1c40f']; // Glucides, Protéines, Lipides

function NutritionDetail({ item, onClose, onEdit }) {
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

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

    // Données pour le graphe
    const macroData = [
        { name: 'Glucides', value: parseFloat(item.carbs || 0) },
        { name: 'Protéines', value: parseFloat(item.proteins || 0) },
        { name: 'Lipides', value: parseFloat(item.fat || 0) },
    ].filter(d => d.value > 0);

    // Calcul prix moyen
    const avgPrice = history.length > 0 
        ? (history.reduce((acc, h) => acc + (h.unit_price || 0), 0) / history.length).toFixed(2)
        : item.price;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="glass-panel modal-content nutri-detail-modal" onClick={e => e.stopPropagation()}>
                
                {/* HEADER */}
                <div className="detail-header">
                    <div>
                        <h2 style={{margin:0}}>{item.name}</h2>
                        <p className="brand">{item.brand}</p>
                    </div>
                    <button className="close-btn" onClick={onClose}><FaTimes /></button>
                </div>

                <div className="detail-body">
                    
                    {/* COLONNE GAUCHE : INFO & MACROS */}
                    <div className="detail-left">
                        <div className="tags-container">
                            <span className="nutri-tag type">{item.category_type}</span>
                            {item.caffeine && <span className="nutri-tag caffeine"><FaCoffee /> Caféine</span>}
                            {item.tags?.includes('vegan') && <span className="nutri-tag vegan"><FaLeaf /> Vegan</span>}
                            {item.tags?.includes('homemade') && <span className="nutri-tag homemade"><FaUtensils /> Maison</span>}
                        </div>

                        <div className="macros-chart-container glass-panel">
                            <h4>Répartition (pour 100g/unité)</h4>
                            {macroData.length > 0 ? (
                                <div style={{width:'100%', height:'180px'}}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={macroData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                                {macroData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{backgroundColor:'#1e1e2d', borderRadius:'8px', border:'none'}} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <p className="empty-text">Pas de données nutritionnelles.</p>}
                            <div className="macros-text">
                                <span>🥖 {item.carbs}g</span>
                                <span>🥩 {item.proteins}g</span>
                                <span>🥑 {item.fat}g</span>
                            </div>
                        </div>

                        {item.recipe && (
                            <div className="recipe-box glass-panel">
                                <h4>👨‍🍳 Recette</h4>
                                <p>{item.recipe}</p>
                            </div>
                        )}
                    </div>

                    {/* COLONNE DROITE : HISTORIQUE & ACTIONS */}
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

                        <div className="history-list glass-panel">
                            <h4><FaHistory /> Historique d'achat</h4>
                            {loadingHistory ? <p>...</p> : (
                                <ul>
                                    {history.map(h => (
                                        <li key={h.id}>
                                            <span>{new Date(h.purchase_date).toLocaleDateString()}</span>
                                            <span>+{h.quantity_added}</span>
                                            <span>{h.price_paid}€</span>
                                        </li>
                                    ))}
                                    {history.length === 0 && <li className="empty-text">Aucun achat enregistré.</li>}
                                </ul>
                            )}
                        </div>

                        <button className="edit-btn-full" onClick={() => { onClose(); onEdit(item); }}>
                            <FaPen /> Modifier la fiche
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NutritionDetail;