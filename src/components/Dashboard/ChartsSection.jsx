import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale, // <--- NOUVEAU POUR RADAR
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Radar } from 'react-chartjs-2';
import './ChartsSection.css';

// Enregistrement des composants
ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement, 
  RadialLinearScale, Title, Tooltip, Legend, Filler
);

const ChartsSection = ({ activities, allActivities, period, bikes }) => {
    
    if (!activities || activities.length === 0) {
        return <div className="empty-charts">Pas assez de données pour l'analyse.</div>;
    }

    // --- 1. HEATMAP CALENDRIER (6 derniers mois) ---
    const heatmapData = useMemo(() => {
        const days = [];
        const today = new Date();
        // On remonte 6 mois en arrière
        const startDate = new Date();
        startDate.setMonth(today.getMonth() - 5);
        startDate.setDate(1);

        // Création de la map des activités par date (YYYY-MM-DD)
        const activityMap = {};
        allActivities.forEach(act => {
            const d = new Date(act.start_date).toISOString().split('T')[0];
            const dist = act.distance > 1000 ? act.distance/1000 : act.distance;
            activityMap[d] = (activityMap[d] || 0) + dist;
        });

        // Génération de la grille
        let current = new Date(startDate);
        while (current <= today) {
            const dateStr = current.toISOString().split('T')[0];
            const km = activityMap[dateStr] || 0;
            
            // Intensité pour la couleur (0 à 4)
            let intensity = 0;
            if (km > 0) intensity = 1;
            if (km > 30) intensity = 2;
            if (km > 60) intensity = 3;
            if (km > 100) intensity = 4;

            days.push({ date: dateStr, intensity, km });
            current.setDate(current.getDate() + 1);
        }
        return days;
    }, [allActivities]);

    // --- 2. RADAR CHART (PROFIL CYCLISTE) ---
    const radarData = useMemo(() => {
        // On analyse tout l'historique pour définir le profil
        const totalKm = allActivities.reduce((acc, a) => acc + (a.distance > 1000 ? a.distance/1000 : a.distance), 0);
        const totalElev = allActivities.reduce((acc, a) => acc + a.total_elevation_gain, 0);
        const count = allActivities.length;
        
        if (count === 0) return null;

        // Calculs heuristiques (Scores sur 100)
        
        // 1. Volume : Basé sur une moyenne de 500km/mois pour 100pts
        // (C'est arbitraire, à ajuster selon ton niveau)
        const monthsActive = Math.max(1, (new Date() - new Date(allActivities[allActivities.length-1].start_date)) / (1000 * 60 * 60 * 24 * 30));
        const avgKmPerMonth = totalKm / monthsActive;
        const scoreVolume = Math.min(100, (avgKmPerMonth / 500) * 100);

        // 2. Régularité : Basé sur sorties / semaine (3 sorties = 100pts)
        const scoreRegularity = Math.min(100, ((count / monthsActive) / 12) * 100); 

        // 3. Grimpeur : Ratio D+ / Distance (1000m D+ pour 100km = "normal", 2000m = pur grimpeur)
        const ratioClimb = (totalElev / totalKm) * 100; // m par 100km
        const scoreClimber = Math.min(100, (ratioClimb / 2000) * 100 * 1.5);

        // 4. Endurance : Max distance en une sortie (200km = 100pts)
        const maxDist = Math.max(...allActivities.map(a => a.distance > 1000 ? a.distance/1000 : a.distance));
        const scoreEndurance = Math.min(100, (maxDist / 200) * 100);

        // 5. Sprint : Faute de capteur de puissance, on utilise la Vmax moyenne des sorties
        // (C'est imprécis, mais ça remplit le graphe)
        const avgSpeed = allActivities.reduce((acc, a) => acc + (a.average_speed || 25), 0) / count;
        const scoreSprint = Math.min(100, (avgSpeed / 35) * 100); // 35km/h moy = 100pts

        return {
            labels: ['Endurance', 'Sprint', 'Grimpeur', 'Régularité', 'Volume'],
            datasets: [{
                label: 'Mon Profil',
                data: [
                    Math.round(scoreEndurance), 
                    Math.round(scoreSprint), 
                    Math.round(scoreClimber), 
                    Math.round(scoreRegularity), 
                    Math.round(scoreVolume)
                ],
                backgroundColor: 'rgba(14, 165, 233, 0.2)', // Bleu néon transparent
                borderColor: '#0ea5e9',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#0ea5e9'
            }]
        };
    }, [allActivities]);

    // Options Radar
    const radarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                pointLabels: { color: '#fff', font: { size: 12, weight: 'bold' } },
                ticks: { display: false, backdropColor: 'transparent' },
                suggestedMin: 0,
                suggestedMax: 100
            }
        },
        plugins: { legend: { display: false } }
    };

    // --- GRAPH 1 : ACTIVITÉS PAR VÉLO ---
    const barChartData = useMemo(() => {
        const grouped = {};
        const labels = [];
        const sorted = [...activities].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        sorted.forEach(act => {
            const date = new Date(act.start_date);
            let key;
            if (period === 'year') key = date.toLocaleDateString('fr-FR', { month: 'short' });
            else key = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
            
            if (!labels.includes(key)) labels.push(key);
            if (!grouped[key]) grouped[key] = {};

            const bikeObj = bikes.find(b => b.id === act.bike_id);
            const bikeName = bikeObj ? bikeObj.name : "Sans vélo";
            const distKm = act.distance > 1000 ? act.distance / 1000 : act.distance;
            
            grouped[key][bikeName] = (grouped[key][bikeName] || 0) + distKm;
        });

        const uniqueBikeNames = [...new Set(bikes.map(b => b.name)), "Sans vélo"];
        const activeBikes = uniqueBikeNames.filter(name => labels.some(label => grouped[label][name] > 0));

        const datasets = activeBikes.map((bike, index) => ({
            label: bike,
            data: labels.map(lbl => Math.round(grouped[lbl][bike] || 0)),
            backgroundColor: `hsl(${index * 60 + 200}, 70%, 60%)`,
            borderRadius: 4,
            stack: 'Stack 0',
        }));

        return { labels, datasets };
    }, [activities, period, bikes]);

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: '#fff' } } },
        scales: {
            x: { stacked: true, ticks: { color: '#9ca3af' }, grid: { display: false } },
            y: { stacked: true, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
    };

    // --- GRAPH 2 : FITNESS & INFO FORME ---
    const { fitnessData, currentForm } = useMemo(() => {
        const sortedAll = [...allActivities].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        if(sortedAll.length === 0) return { fitnessData: null, currentForm: null };

        const rawPoints = [];
        let atl = 0, ctl = 0;
        const viewStart = activities.length > 0 
            ? new Date([...activities].sort((a,b)=>new Date(a.start_date)-new Date(b.start_date))[0].start_date) 
            : new Date();

        sortedAll.forEach(act => {
            const distKm = act.distance > 1000 ? act.distance/1000 : act.distance;
            const load = act.external_data?.suffer_score || (act.total_elevation_gain / 10 + distKm); 
            
            ctl = ctl + (load - ctl) / 42;
            atl = atl + (load - atl) / 7;
            const tsb = ctl - atl;

            const date = new Date(act.start_date);
            if (date >= viewStart) {
                rawPoints.push({
                    dateLabel: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                    ctl: Math.round(ctl),
                    atl: Math.round(atl),
                    tsb: Math.round(tsb)
                });
            }
        });

        // Dernière valeur TSB calculée (Forme actuelle)
        const lastPoint = rawPoints[rawPoints.length - 1];
        const formValue = lastPoint ? lastPoint.tsb : 0;

        let displayPoints = rawPoints;
        if (period === 'year') {
            displayPoints = rawPoints.filter((p, index) => index % 7 === 0); 
        }

        const data = {
            labels: displayPoints.map(d => d.dateLabel),
            datasets: [
                {
                    label: 'Forme (CTL)',
                    data: displayPoints.map(d => d.ctl),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Fatigue (ATL)',
                    data: displayPoints.map(d => d.atl),
                    borderColor: '#ec4899', // Rose
                    borderWidth: 2, // Ligne solide bien visible
                    pointRadius: 0,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Balance (TSB)',
                    data: displayPoints.map(d => d.tsb),
                    type: 'bar',
                    backgroundColor: (ctx) => ctx.raw >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                    yAxisID: 'y1',
                    barThickness: period === 'year' ? 2 : 5
                }
            ]
        };

        return { fitnessData: data, currentForm: formValue };

    }, [allActivities, activities, period]);

    const fitnessOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: '#fff' } } },
        scales: {
            x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
            y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#3b82f6' } },
            y1: { type: 'linear', display: false, position: 'right', grid: { display: false } },
        }
    };

    // Couleur et texte pour la forme
    const formColor = currentForm >= 0 ? '#10b981' : '#ef4444';
    const formText = currentForm > 20 ? 'Très Frais' : currentForm > 0 ? 'Frais' : currentForm > -10 ? 'Productif' : currentForm > -30 ? 'Fatigué' : 'Épuisé';

    return (
        <div className="charts-section">
            {/* LIGNE 1 : HEATMAP & RADAR */}
            <div className="charts-row-top">
                <div className="chart-card glass-panel heatmap-card">
                    <h3>Régularité (6 derniers mois)</h3>
                    <div className="heatmap-grid">
                        {heatmapData.map((day, i) => (
                            <div 
                                key={i} 
                                className={`heatmap-cell intensity-${day.intensity}`}
                                title={`${day.date} : ${Math.round(day.km)} km`}
                            ></div>
                        ))}
                    </div>
                    <div className="heatmap-legend">
                        <span>Moins</span>
                        <div className="legend-scale">
                            <div className="cell intensity-0"></div>
                            <div className="cell intensity-1"></div>
                            <div className="cell intensity-2"></div>
                            <div className="cell intensity-3"></div>
                            <div className="cell intensity-4"></div>
                        </div>
                        <span>Plus</span>
                    </div>
                </div>

                <div className="chart-card glass-panel radar-card">
                    <h3>Profil Cycliste</h3>
                    <div className="chart-wrapper radar-wrapper">
                        {radarData && <Radar data={radarData} options={radarOptions} />}
                    </div>
                </div>
            </div>
            <div className="chart-card glass-panel">
                <h3>Activités & Matériel (km)</h3>
                <div className="chart-wrapper">
                    <Bar data={barChartData} options={barOptions} />
                </div>
            </div>

            <div className="chart-card glass-panel">
                <div className="chart-header-row">
                    <h3>Courbe de Forme</h3>
                    {currentForm !== null && (
                        <div className="form-badge" style={{borderColor: formColor, color: formColor}}>
                            Forme: {currentForm > 0 ? '+' : ''}{currentForm} ({formText})
                        </div>
                    )}
                </div>
                <div className="chart-wrapper">
                    {fitnessData && <Line data={fitnessData} options={fitnessOptions} />}
                </div>
            </div>
        </div>
    );
};

export default ChartsSection;