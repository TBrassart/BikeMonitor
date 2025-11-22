import React, { useState, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    ComposedChart, Line, Area, ReferenceLine 
} from 'recharts';
import { FaChevronUp, FaChevronDown, FaInfoCircle } from 'react-icons/fa';
import { bikeService } from '../../services/api';
import './ChartsSection.css';

// Palette "BikeMonitor"
const COLORS = ['#00e5ff', '#ff00c8', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22'];
const COLORS_FITNESS = {
    ctl: '#00e5ff', // Cyan (Forme)
    atl: '#ff00c8', // Rose (Fatigue)
    tsb: '#f1c40f'  // Jaune (Balance)
};

const ChartsSection = ({ profileId, period, isRolling }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentStats, setCurrentStats] = useState(null);

    // État de visibilité (chargé depuis le localStorage)
    const [visibility, setVisibility] = useState(() => {
        const saved = localStorage.getItem('bm_charts_visibility');
        return saved ? JSON.parse(saved) : { fitness: true, volume: true, pie: true, macros: true };
    });

    // Chargement des données graphiques (Dépend de la période)
    useEffect(() => {
        if (profileId) {
            setLoading(true);
            bikeService.getChartsData(profileId, period, isRolling).then(res => {
                setData(res);
                setLoading(false);
            });
        }
    }, [profileId, period, isRolling]);

    // Chargement de l'état de forme ACTUEL (Une seule fois, ou si le profil change)
    useEffect(() => {
        if (profileId) {
            bikeService.getCurrentFitness(profileId).then(stats => {
                setCurrentStats(stats);
            });
        }
    }, [profileId]);

    // Sauvegarde de la préférence de dépliage
    const toggleSection = (sectionKey) => {
        const newVisibility = { ...visibility, [sectionKey]: !visibility[sectionKey] };
        setVisibility(newVisibility);
        localStorage.setItem('bm_charts_visibility', JSON.stringify(newVisibility));
    };

    // --- ALGORITHME STATUT (Basé sur currentStats et non data) ---
    const getRiderStatus = () => {
        if (!currentStats) return null;
        
        const tsb = currentStats.tsb; // On utilise la valeur calculée spécifiquement

        if (tsb < -30) return { label: "Surcharge ⚠️", color: '#e74c3c' };
        if (tsb < -10) return { label: "Productif 💪", color: '#2ecc71' };
        if (tsb < 5)   return { label: "Maintien 😐", color: '#aaa' };
        if (tsb < 25)  return { label: "Frais (Course) 🚀", color: '#00e5ff' };
        return { label: "Désentraînement 💤", color: '#f39c12' };
    };

    const riderStatus = getRiderStatus();

    if (loading) return <div className="charts-loading">Chargement des graphiques...</div>;
    if (!data) return null;

    const getTitle = () => {
        if (period === 'week') return "Volume Semaine";
        if (period === 'month') return "Volume Mensuel";
        return "Volume Annuel";
    };

    // Tooltip Fitness Custom
    const FitnessTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip fitness">
                    <p className="tooltip-date">{label}</p>
                    <div className="tooltip-row" style={{color: COLORS_FITNESS.ctl}}>
                        <span>Forme (CTL)</span><strong>{payload.find(p => p.dataKey === 'ctl')?.value}</strong>
                    </div>
                    <div className="tooltip-row" style={{color: COLORS_FITNESS.atl}}>
                        <span>Fatigue (ATL)</span><strong>{payload.find(p => p.dataKey === 'atl')?.value}</strong>
                    </div>
                    <div className="tooltip-row border-top" style={{color: COLORS_FITNESS.tsb}}>
                        <span>Balance (TSB)</span><strong>{payload.find(p => p.dataKey === 'tsb')?.value}</strong>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="charts-section-container">
            
            {/* 1. GRAPHIQUE FITNESS (Repliable) */}
            <div className={`chart-card wide ${!visibility.fitness ? 'collapsed' : ''}`}>
                <div className="chart-header clickable" onClick={() => toggleSection('fitness')}>
                    <div className="header-left">
                        <h3>📈 Forme & Fatigue</h3>
                        {/* Badge d'état du coureur */}
                        {riderStatus && (
                            <div className="rider-status-badge" style={{borderColor: riderStatus.color, color: riderStatus.color}}>
                                {riderStatus.label}
                            </div>
                        )}
                    </div>
                    <div className="header-right">
                        {visibility.fitness ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                </div>
                
                {visibility.fitness && (
                    <div className="chart-wrapper">
                        {data.fitnessData && data.fitnessData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={data.fitnessData}>
                                    <defs>
                                        <linearGradient id="colorCtl" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS_FITNESS.ctl} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={COLORS_FITNESS.ctl} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" hide />
                                    <YAxis yAxisId="left" hide domain={[0, 'auto']} />
                                    <YAxis yAxisId="right" hide />
                                    <Tooltip content={<FitnessTooltip />} cursor={{stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2}} />
                                    <ReferenceLine y={0} yAxisId="right" stroke="#666" strokeDasharray="3 3" />
                                    
                                    <Area yAxisId="left" type="monotone" dataKey="ctl" stroke={COLORS_FITNESS.ctl} strokeWidth={2} fill="url(#colorCtl)" />
                                    <Line yAxisId="left" type="monotone" dataKey="atl" stroke={COLORS_FITNESS.atl} strokeWidth={1} dot={false} />
                                    <Bar yAxisId="right" dataKey="tsb" fill={COLORS_FITNESS.tsb} barSize={2} opacity={0.6} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : <p className="no-data-msg">Pas assez d'historique.</p>}
                    </div>
                )}
            </div>

            {/* LIGNE 2 : VOLUME & PARC */}
            <div className="charts-section">
                
                {/* Volume (Repliable) */}
                <div className={`chart-card ${!visibility.volume ? 'collapsed' : ''}`}>
                    <div className="chart-header clickable" onClick={() => toggleSection('volume')}>
                        <h3>{getTitle()} {isRolling ? '(Glissant)' : ''}</h3>
                        {visibility.volume ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {visibility.volume && (
                        <div className="chart-wrapper">
                            {data.chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="name" stroke="#888" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor:'#1e1e2d', border:'1px solid #444'}} />
                                        {data.bikeNames.map((bikeName, index) => (
                                            <Bar key={bikeName} dataKey={bikeName} stackId="a" fill={COLORS[index % COLORS.length]} radius={[2, 2, 0, 0]} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p className="no-data-msg">Pas de données.</p>}
                        </div>
                    )}
                </div>

                {/* Parc (Repliable) */}
                <div className={`chart-card ${!visibility.pie ? 'collapsed' : ''}`}>
                    <div className="chart-header clickable" onClick={() => toggleSection('pie')}>
                        <h3>Utilisation Parc</h3>
                        {visibility.pie ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {visibility.pie && (
                        <div className="chart-wrapper">
                            {data.pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={data.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                            {data.pieData.map((entry, index) => {
                                                const globalIndex = data.bikeNames.indexOf(entry.name);
                                                const color = globalIndex >= 0 ? COLORS[globalIndex % COLORS.length] : '#888';
                                                return <Cell key={`cell-${index}`} fill={color} />;
                                            })}
                                        </Pie>
                                        <Tooltip contentStyle={{backgroundColor: '#1e1e2d', border:'1px solid #444'}} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <p className="no-data-msg">Pas de données.</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* ... (Le reste : Macros, Budget peut être repliable aussi sur le même modèle) ... */}
            {/* Je te laisse Nutrition et Budget tels quels pour l'instant */}
             <div className="chart-card" style={{flex: 1, marginTop: '20px'}}>
                    <h3>🍎 Répartition Stock</h3>
                    <div className="chart-wrapper">
                        {data.macros && data.macros.reduce((a,b) => a + b.value, 0) > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.macros}
                                        cx="50%" cy="50%"
                                        innerRadius={40} outerRadius={60}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.macros.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{backgroundColor: '#1e1e2d', borderRadius:'8px'}} formatter={(value) => `${value}g`} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '0.7rem'}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <p className="no-data-msg">Stock vide ou sans infos.</p>}
                    </div>
                </div>

            <div className="budget-banner" style={{marginTop: '20px', padding: '20px', background: '#1e1e2d', borderRadius: '12px', borderLeft: '5px solid #e74c3c', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                    <h3 style={{margin:0, color: 'white', fontSize: '1.1rem'}}>💸 Budget Maintenance</h3>
                    <p style={{margin:'5px 0 0 0', color: '#888', fontSize: '0.9rem'}}>Coût des pièces installées sur la période sélectionnée.</p>
                </div>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#e74c3c'}}>
                    {data.budget?.total || 0} €
                </div>
            </div>
        </div>
    );
};

export default ChartsSection;