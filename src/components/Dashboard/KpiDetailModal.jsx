import React, { useMemo } from 'react';
import { FaTimes, FaTrophy, FaCalendarDay, FaRoute, FaArrowUp, FaStopwatch, FaHeartbeat, FaBicycle, FaWrench, FaMountain } from 'react-icons/fa';
import { Bar, Line, Scatter, Radar } from 'react-chartjs-2';
import { 
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, 
    Title, Tooltip, Legend, Filler, RadialLinearScale 
} from 'chart.js';
import './KpiDetailModal.css';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement, BarElement, 
    Title, Tooltip, Legend, Filler, RadialLinearScale
);

const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e1e2d', titleColor: '#fff', bodyColor: '#ccc', borderColor: '#444', borderWidth: 1 } },
    scales: {
        x: { grid: { display: false }, ticks: { color: '#888' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } }
    }
};

function KpiDetailModal({ type, activities, bikes, user, onClose }) {

    // ==========================================
    // 1. CALCULS GRAPHIQUES EXPERTS (Sortis des boucles)
    // ==========================================

    // --- SCATTER PLOT (Distance vs Dénivelé) ---
    const scatterData = useMemo(() => {
        if (type !== 'dist' && type !== 'elev') return null;
        return {
            datasets: [{
                label: 'Sorties',
                data: activities.map(a => ({
                    x: a.distance / 1000, // Distance en km
                    y: a.total_elevation_gain // D+ en m
                })),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                pointRadius: 4,
                pointHoverRadius: 8
            }]
        };
    }, [activities, type]);

    const scatterOptions = {
        ...commonOptions,
        scales: {
            x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Distance (km)', color: '#666' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
            y: { title: { display: true, text: 'D+ (m)', color: '#666' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } }
        },
        plugins: { 
            legend: { display: false },
            tooltip: { 
                callbacks: { label: (ctx) => `${ctx.raw.x.toFixed(1)}km / ${ctx.raw.y}m` } 
            } 
        }
    };

    // --- RADAR (Hebdomadaire) ---
    const weekRadarData = useMemo(() => {
        if (type !== 'time') return null;
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const counts = new Array(7).fill(0);
        activities.forEach(a => {
            const dayIndex = new Date(a.start_date).getDay();
            counts[dayIndex] += (a.moving_time / 3600);
        });
        return {
            labels: days,
            datasets: [{
                label: 'Heures par jour',
                data: counts,
                backgroundColor: 'rgba(249, 115, 22, 0.2)',
                borderColor: '#f97316',
                borderWidth: 2,
            }]
        };
    }, [activities, type]);

    const radarOptions = {
        scales: {
            r: { 
                grid: { color: 'rgba(255,255,255,0.1)' },
                angleLines: { color: 'rgba(255,255,255,0.1)' },
                pointLabels: { color: 'white', font: { size: 12 } },
                ticks: { display: false, backdropColor: 'transparent' }
            }
        },
        plugins: { legend: { display: false } }
    };


    // ==========================================
    // 2. ANALYSES PRINCIPALES (Stats + Graphique Historique)
    // ==========================================

    // --- ANALYSE DISTANCE ---
    const distAnalysis = useMemo(() => {
        if (type !== 'dist') return null;
        
        const monthlyData = new Array(12).fill(0);
        const today = new Date();
        const months = [];
        let maxRide = 0;
        let totalSorties = 0;
        let totalKm12m = 0;

        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(d.toLocaleString('fr-FR', { month: 'short' }));
        }

        activities.forEach(a => {
            const km = a.distance / 1000;
            const date = new Date(a.start_date);
            const monthDiff = (today.getFullYear() - date.getFullYear()) * 12 + (today.getMonth() - date.getMonth());
            
            if (monthDiff >= 0 && monthDiff < 12) {
                if (km > maxRide) maxRide = km;
                totalSorties++;
                totalKm12m += km;
                monthlyData[11 - monthDiff] += km;
            }
        });

        const avgRide = totalSorties > 0 ? totalKm12m / totalSorties : 0;

        return {
            stats: [
                { label: 'Plus longue (12 mois)', val: Math.round(maxRide) + ' km', icon: <FaTrophy />, color: 'gold' },
                { label: 'Moyenne / sortie', val: Math.round(avgRide) + ' km', icon: <FaRoute />, color: 'blue' },
                { label: 'Sorties (12 mois)', val: totalSorties, icon: <FaCalendarDay />, color: 'blue' }
            ],
            chartData: {
                labels: months,
                datasets: [{ label: 'Km', data: monthlyData, backgroundColor: '#3b82f6', borderRadius: 4, barThickness: 12 }]
            }
        };
    }, [activities, type]);

    // --- ANALYSE DÉNIVELÉ ---
    const elevAnalysis = useMemo(() => {
        if (type !== 'elev') return null;

        const monthlyData = new Array(12).fill(0);
        const today = new Date();
        const months = [];
        let maxElev = 0;
        let totalDist = 0;
        let totalElev = 0;

        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(d.toLocaleString('fr-FR', { month: 'short' }));
        }

        activities.forEach(a => {
            const date = new Date(a.start_date);
            const monthDiff = (today.getFullYear() - date.getFullYear()) * 12 + (today.getMonth() - date.getMonth());

            if (monthDiff >= 0 && monthDiff < 12) {
                const elev = a.total_elevation_gain || 0;
                const km = a.distance / 1000;

                if (elev > maxElev) maxElev = elev;
                totalDist += km;
                totalElev += elev;
                monthlyData[11 - monthDiff] += elev;
            }
        });

        const ratio = totalDist > 0 ? (totalElev / totalDist).toFixed(1) : 0;

        return {
            stats: [
                { label: 'Max D+ (12 mois)', val: maxElev + ' m', icon: <FaArrowUp />, color: 'purple' },
                { label: 'Profil Moyen', val: ratio + ' m/km', icon: <FaRoute />, color: 'purple' },
                { label: 'Everest Equivalents', val: (totalElev / 8848).toFixed(1) + ' x', icon: <FaMountain />, color: 'gold' }
            ],
            chartData: {
                labels: months,
                datasets: [{ label: 'D+ (m)', data: monthlyData, borderColor: '#d946ef', backgroundColor: 'rgba(217, 70, 239, 0.1)', fill: true, tension: 0.4, pointRadius: 2 }]
            }
        };
    }, [activities, type]);

    // --- ANALYSE TEMPS ---
    const timeAnalysis = useMemo(() => {
        if (type !== 'time') return null;

        const monthlyData = new Array(12).fill(0);
        const today = new Date();
        const months = [];
        let totalSeconds = 0;
        let maxDuration = 0;

        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(d.toLocaleString('fr-FR', { month: 'short' }));
        }

        activities.forEach(a => {
            const date = new Date(a.start_date);
            const monthDiff = (today.getFullYear() - date.getFullYear()) * 12 + (today.getMonth() - date.getMonth());

            if (monthDiff >= 0 && monthDiff < 12) {
                const seconds = a.moving_time || 0;
                if (seconds > maxDuration) maxDuration = seconds;
                totalSeconds += seconds;
                monthlyData[11 - monthDiff] += (seconds / 3600);
            }
        });

        const hours = Math.floor(totalSeconds / 3600);
        const maxHours = (maxDuration / 3600).toFixed(1);
        const approxKcal = Math.round(hours * 500); 

        return {
            stats: [
                { label: 'Heures (12 mois)', val: hours + ' h', icon: <FaStopwatch />, color: 'orange' },
                { label: 'Plus longue (12 mois)', val: maxHours + ' h', icon: <FaTrophy />, color: 'gold' },
                { label: 'Calories (Est.)', val: approxKcal.toLocaleString() + ' kcal', icon: <FaHeartbeat />, color: 'orange' }
            ],
            chartData: {
                labels: months,
                datasets: [{ label: 'Heures', data: monthlyData, backgroundColor: '#f97316', borderRadius: 4 }]
            }
        };
    }, [activities, type]);

    // --- ANALYSE FLOTTE ---
    const fleetAnalysis = useMemo(() => {
        if (type !== 'fleet') return null;

        const myBikes = bikes.filter(b => b.user_id === user?.id);

        const bikeStats = myBikes.map(b => ({
            name: b.name,
            km: Math.round(b.total_km),
            type: b.type
        }));

        bikeStats.sort((a, b) => b.km - a.km);

        const labels = bikeStats.map(b => b.name);
        const data = bikeStats.map(b => b.km);
        const favoriteBike = bikeStats.length > 0 ? bikeStats[0].name : "Aucun";
        const totalFleetKm = bikeStats.reduce((acc, b) => acc + b.km, 0);

        return {
            stats: [
                { label: 'Vélo Favori', val: favoriteBike, icon: <FaBicycle />, color: 'green' },
                { label: 'Km Total Parc', val: totalFleetKm.toLocaleString() + ' km', icon: <FaRoute />, color: 'green' },
                { label: 'Mon Garage', val: myBikes.length + ' vélos', icon: <FaWrench />, color: 'green' }
            ],
            chartData: {
                labels: labels,
                indexAxis: 'y',
                datasets: [{ label: 'Km Parcourus', data: data, backgroundColor: ['#10b981', '#34d399', '#6ee7b7'], borderRadius: 4, barThickness: 20 }]
            }
        };
    }, [bikes, type, user]);

    // ==========================================
    // 3. RENDERER
    // ==========================================
    const renderContent = () => {
        let data = null;
        let ChartComponent = Bar;
        let ExtraChart = null;
        let extraTitle = "";

        if (type === 'dist') {
            data = distAnalysis;
            ExtraChart = <Scatter data={scatterData} options={scatterOptions} />;
            extraTitle = "Corrélation Distance / Dénivelé";
        }
        else if (type === 'elev') {
            data = elevAnalysis; 
            ChartComponent = Line;
            ExtraChart = <Scatter data={scatterData} options={scatterOptions} />;
            extraTitle = "Profil des Sorties (Plat vs Montagne)";
        }
        else if (type === 'time') {
            data = timeAnalysis;
            ExtraChart = <Radar data={weekRadarData} options={radarOptions} />;
            extraTitle = "Répartition Hebdomadaire";
        }
        else if (type === 'fleet') {
            data = fleetAnalysis;
        }

        if (!data) return <div style={{padding:'20px', textAlign:'center'}}>Chargement...</div>;

        return (
            <div className="kpi-analysis-content">
                <div className="analysis-stats-row">
                    {data.stats.map((stat, i) => (
                        <div key={i} className="analysis-stat-card glass-panel">
                            <div className={`stat-icon-circle ${stat.color}`}>{stat.icon}</div>
                            <div className="stat-text">
                                <span className="val">{stat.val}</span>
                                <span className="lbl">{stat.label}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={`charts-split-row ${ExtraChart ? 'grid-2' : ''}`}>
                    <div className="analysis-chart-container glass-panel">
                        <h4>{type === 'fleet' ? 'Utilisation de mes vélos' : 'Évolution sur 12 mois'}</h4>
                        <div className="chart-box">
                            <ChartComponent data={data.chartData} options={commonOptions} />
                        </div>
                    </div>

                    {ExtraChart && (
                        <div className="analysis-chart-container glass-panel">
                            <h4>{extraTitle}</h4>
                            <div className="chart-box">
                                {ExtraChart}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const getTitle = () => {
        if (type === 'dist') return { text: "Analyse Volume", icon: <FaRoute /> };
        if (type === 'elev') return { text: "Analyse Grimpeur", icon: <FaMountain /> };
        if (type === 'time') return { text: "Analyse Endurance", icon: <FaStopwatch /> };
        if (type === 'fleet') return { text: "État du Garage", icon: <FaBicycle /> };
        return { text: "Détails", icon: null };
    };

    const titleInfo = getTitle();

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="glass-panel modal-content kpi-modal-lg" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 style={{display:'flex', alignItems:'center', gap:'10px', color:'white'}}>
                        {titleInfo.icon} {titleInfo.text}
                    </h2>
                    <button onClick={onClose} className="close-btn"><FaTimes /></button>
                </div>
                {renderContent()}
            </div>
        </div>
    );
}

export default KpiDetailModal;