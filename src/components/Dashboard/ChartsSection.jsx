import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  RadialLinearScale, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Radar } from 'react-chartjs-2';
import { FaGripVertical, FaEye, FaEyeSlash } from 'react-icons/fa';
import './ChartsSection.css';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement, 
  RadialLinearScale, Title, Tooltip, Legend, Filler
);

const ChartsSection = ({ 
    activities, allActivities, period, bikes, 
    isEditMode, chartOrder, hiddenCharts, 
    onDragStart, onDragOver, onDrop, toggleVisibility 
}) => {

    // État pour la comparaison ---
    const [compareYear, setCompareYear] = useState('none');

    const availableYears = useMemo(() => {
        if (!allActivities.length) return [];
        return [...new Set(allActivities.map(a => new Date(a.start_date).getFullYear()))].sort().reverse();
    }, [allActivities]);
    
    // --- 1. HEATMAP ---
    const heatmapData = useMemo(() => {
        const days = [];
        const today = new Date();
        const startDate = new Date(); startDate.setMonth(today.getMonth() - 5); startDate.setDate(1);
        const activityMap = {};
        allActivities.forEach(act => {
            const d = new Date(act.start_date).toISOString().split('T')[0];
            const dist = act.distance > 1000 ? act.distance/1000 : act.distance;
            activityMap[d] = (activityMap[d] || 0) + dist;
        });
        let current = new Date(startDate);
        while (current <= today) {
            const dateStr = current.toISOString().split('T')[0];
            const km = activityMap[dateStr] || 0;
            let intensity = 0;
            if (km > 0) intensity = 1; if (km > 30) intensity = 2; if (km > 60) intensity = 3; if (km > 100) intensity = 4;
            days.push({ date: dateStr, intensity, km });
            current.setDate(current.getDate() + 1);
        }
        return days;
    }, [allActivities]);

    // --- 2. RADAR ---
    const radarData = useMemo(() => {
        if (allActivities.length === 0) return null;

        const totalKm = allActivities.reduce((acc, a) => acc + (a.distance > 1000 ? a.distance/1000 : a.distance), 0);
        const totalElev = allActivities.reduce((acc, a) => acc + a.total_elevation_gain, 0);
        
        const monthsActive = Math.max(1, (new Date() - new Date(allActivities[allActivities.length-1].start_date)) / (1000 * 60 * 60 * 24 * 30));
        const avgKmPerMonth = totalKm / monthsActive;
        const scoreVolume = Math.min(100, (avgKmPerMonth / 400) * 100); 
        const scoreRegularity = Math.min(100, (allActivities.length / monthsActive / 12) * 100); 
        const ratioClimb = (totalElev / totalKm) * 100;
        const scoreClimber = Math.min(100, (ratioClimb / 1500) * 100 * 1.5);
        const maxDist = Math.max(...allActivities.map(a => a.distance > 1000 ? a.distance/1000 : a.distance));
        const scoreEndurance = Math.min(100, (maxDist / 150) * 100);
        const maxSpeed = Math.max(...allActivities.map(a => (a.external_data?.max_speed || 0) * 3.6));
        const scoreSprint = Math.min(100, (maxSpeed / 60) * 100);

        return {
            labels: ['Endurance', 'Sprint', 'Grimpeur', 'Régularité', 'Volume'],
            datasets: [{
                label: 'Mon Profil',
                data: [scoreEndurance, scoreSprint, scoreClimber, scoreRegularity, scoreVolume],
                backgroundColor: 'rgba(14, 165, 233, 0.2)', borderColor: '#0ea5e9', borderWidth: 2, pointBackgroundColor: '#fff', pointBorderColor: '#0ea5e9'
            }]
        };
    }, [allActivities]);

    // --- 3. VOLUME (Vélos Empilés + Comparaison Ligne) ---
    const barChartData = useMemo(() => {
        if (activities.length === 0) return null;

        const groupedCurrent = {}; // { "Jan": { "Vélo A": 100 } }
        const groupedCompare = {}; // { "Jan": 150 }
        const labels = [];

        // Helper date
        const getDateKey = (dateStr) => {
            const d = new Date(dateStr);
            return period === 'year' 
                ? d.toLocaleDateString('fr-FR', { month: 'short' }) 
                : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        };

        // 1. Traitement Activités Actuelles (Détail Vélo)
        activities.forEach(act => {
            const key = getDateKey(act.start_date);
            if (!labels.includes(key)) labels.push(key);
            if (!groupedCurrent[key]) groupedCurrent[key] = {};

            const bikeObj = bikes.find(b => b.id === act.bike_id);
            const bikeName = bikeObj ? bikeObj.name : (act.external_data?.gear_name || "Sans vélo");
            const dist = act.distance > 1000 ? act.distance/1000 : act.distance;
            
            groupedCurrent[key][bikeName] = (groupedCurrent[key][bikeName] || 0) + dist;
        });

        // 2. Traitement Comparaison (Total Global)
        if (compareYear !== 'none') {
            const compareActs = allActivities.filter(a => new Date(a.start_date).getFullYear() === parseInt(compareYear));
            compareActs.forEach(act => {
                const key = getDateKey(act.start_date);
                if (!labels.includes(key)) labels.push(key);
                const dist = act.distance > 1000 ? act.distance/1000 : act.distance;
                groupedCompare[key] = (groupedCompare[key] || 0) + dist;
            });
        }

        // 3. Construction des Datasets
        // A. Les barres des vélos
        const allBikeNames = [...new Set(bikes.map(b => b.name)), "Sans vélo"];
        const activeBikeNames = allBikeNames.filter(name => {
            // On garde seulement les vélos qui ont roulé sur la période affichée
            return labels.some(l => groupedCurrent[l] && groupedCurrent[l][name] > 0);
        });

        const datasets = activeBikeNames.map((name, i) => ({
            type: 'bar',
            label: name,
            data: labels.map(l => Math.round(groupedCurrent[l]?.[name] || 0)),
            backgroundColor: `hsl(${200 + (i * 50)}, 70%, 60%)`,
            borderRadius: 4,
            stack: 'current',
            order: 2
        }));

        // B. La ligne de comparaison
        if (compareYear !== 'none') {
            datasets.push({
                type: 'line',
                label: `Année ${compareYear}`,
                data: labels.map(l => Math.round(groupedCompare[l] || 0)),
                borderColor: '#fff',
                borderWidth: 2,
                borderDash: [5, 5], // Pointillés
                pointRadius: 0,
                tension: 0.4,
                order: 1
            });
        }

        return { labels, datasets };
    }, [activities, allActivities, period, compareYear, bikes]);

    // --- 4. FITNESS (CORRECTION) ---
    const fitnessData = useMemo(() => {
        if (allActivities.length === 0) return null;
        const sortedAll = [...allActivities].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        const dataPoints = [];
        let atl = 0, ctl = 0;
        
        const viewStartDate = activities.length > 0 
            ? new Date([...activities].sort((a,b)=>new Date(a.start_date)-new Date(b.start_date))[0].start_date) 
            : new Date();

        sortedAll.forEach(act => {
            // Sécurisation des nombres
            const dist = Number(act.distance > 1000 ? act.distance/1000 : act.distance);
            const elev = Number(act.total_elevation_gain || 0);
            const load = Number(act.external_data?.suffer_score) || (elev / 10 + dist);
            
            ctl = ctl + (load - ctl) / 42;
            atl = atl + (load - atl) / 7;
            const tsb = ctl - atl;

            const date = new Date(act.start_date);
            if (date >= viewStartDate) {
                dataPoints.push({
                    date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                    ctl: Math.round(ctl),
                    atl: Math.round(atl),
                    tsb: Math.round(tsb)
                });
            }
        });

        const displayPoints = period === 'year' ? dataPoints.filter((_, i) => i % 7 === 0) : dataPoints;

        return {
            labels: displayPoints.map(d => d.date),
            datasets: [
                {
                    label: 'Forme (CTL)',
                    data: displayPoints.map(d => d.ctl),
                    borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)', // Éclairci
                    borderWidth: 2, tension: 0.4, fill: true, yAxisID: 'y',
                    pointRadius: 0, pointHoverRadius: 4 // Visible au survol
                },
                {
                    label: 'Fatigue (ATL)',
                    data: displayPoints.map(d => d.atl),
                    borderColor: '#ec4899', 
                    borderWidth: 2, // Plus de pointillés pour être sûr de la voir
                    tension: 0.4, pointRadius: 0, pointHoverRadius: 4, yAxisID: 'y'
                },
                {
                    label: 'Balance (TSB)',
                    data: displayPoints.map(d => d.tsb),
                    type: 'bar',
                    backgroundColor: (ctx) => ctx.raw >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)', // Éclairci
                    yAxisID: 'y1', barThickness: 4
                }
            ]
        };
    }, [allActivities, activities, period]);

    // --- OPTIONS ---
    const commonOptions = { 
        responsive: true, 
        maintainAspectRatio: false,
        interaction: {
            mode: 'index', // Affiche toutes les valeurs de l'index X
            intersect: false, // Pas besoin d'être pile sur le point
        },
        plugins: { legend: { labels: { color: '#fff' } } }
    };
    
    const barOptions = {
        ...commonOptions,
        scales: {
            x: { stacked: true, ticks: { color: '#9ca3af' }, grid: { display: false } },
            y: { stacked: true, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
    };

    const fitnessOptions = {
        ...commonOptions,
        scales: {
            x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
            y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#3b82f6' } },
            y1: { type: 'linear', display: false, position: 'right', grid: { display: false } },
        }
    };

    const radarOptions = { ...commonOptions, scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#fff' } } } };

    const renderChart = (id) => {
        switch(id) {
            case 'heatmap': return (<><h3>Régularité</h3><div className="heatmap-grid">{heatmapData.map((day, i) => <div key={i} className={`heatmap-cell intensity-${day.intensity}`} title={`${day.date}: ${Math.round(day.km)}km`}></div>)}</div><div className="heatmap-legend">
                        <span>Moins</span>
                        <div className="legend-scale">
                            <div className="cell intensity-0"></div>
                            <div className="cell intensity-1"></div>
                            <div className="cell intensity-2"></div>
                            <div className="cell intensity-3"></div>
                            <div className="cell intensity-4"></div>
                        </div>
                        <span>Plus</span>
                    </div></>);
            case 'radar': 
                return (
                    <>
                        <h3>
                            Profil
                        </h3>
                        <div className="chart-wrapper radar-wrapper">
                            {radarData && <Radar data={radarData} options={radarOptions} />}
                        </div>
                    </>
                );
            case 'volume':
                return (
                    <>
                        <div className="chart-header-row">
                            <h3>Volume (km)</h3>
                            {/* SÉLECTEUR DE COMPARAISON */}
                            <select 
                                value={compareYear} 
                                onChange={(e) => setCompareYear(e.target.value)}
                                className="compare-select"
                                onClick={e => e.stopPropagation()} // Empêche le drag quand on clique
                                style={{
                                    background:'rgba(0,0,0,0.3)', border:'1px solid #444', 
                                    color:'white', borderRadius:'8px', padding:'2px 8px', fontSize:'0.8rem'
                                }}
                            >
                                <option value="none">Pas de comparaison</option>
                                {availableYears.map(y => <option key={y} value={y}>Vs {y}</option>)}
                            </select>
                        </div>
                        <div className="chart-wrapper">
                            {barChartData && <Bar data={barChartData} options={barOptions} />}
                        </div>
                    </>
                );
            case 'fitness': return (<><h3>Forme & Fatigue</h3><div className="chart-wrapper">{fitnessData && <Line data={fitnessData} options={fitnessOptions} />}</div></>);
            default: return null;
        }
    };

    if (!activities || activities.length === 0) return <div className="empty-charts">Pas assez de données.</div>;

    return (
        <div className={`charts-grid-dynamic ${isEditMode ? 'edit-mode' : ''}`}>
            {chartOrder.map(id => {
                const isHidden = hiddenCharts.includes(id);
                if (!isEditMode && isHidden) return null;
                const sizeClass = (id === 'heatmap' || id === 'radar') ? 'half-width' : 'full-width';

                return (
                    <div 
                        key={id} 
                        className={`chart-card glass-panel ${sizeClass} ${isHidden ? 'hidden-item' : ''}`}
                        draggable={isEditMode}
                        onDragStart={(e) => onDragStart(e, id, 'chart')}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, id, 'chart')}
                    >
                        {isEditMode && (
                            <div className="kpi-edit-controls">
                                <FaGripVertical className="drag-handle" />
                                <button onClick={(e) => { e.stopPropagation(); toggleVisibility(id, 'chart'); }} className="vis-btn">
                                    {isHidden ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        )}
                        {renderChart(id)}
                    </div>
                );
            })}
        </div>
    );
};

export default ChartsSection;