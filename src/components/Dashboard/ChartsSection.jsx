import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import './ChartsSection.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const ChartsSection = ({ activities, allActivities, period, bikes }) => {
    
    if (!activities || activities.length === 0) {
        return <div className="empty-charts">Pas assez de données sur cette période.</div>;
    }

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