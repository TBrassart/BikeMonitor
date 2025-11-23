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

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
);

// --- PROPS : activities (filtrées), allActivities (historique pour le calcul CTL)
const ChartsSection = ({ activities, allActivities, period }) => {
    
    if (!activities || activities.length === 0) {
        return <div className="empty-charts">Pas assez de données sur cette période.</div>;
    }

    // --- GRAPH 1 : ACTIVITÉS PAR VÉLO (STACKED BAR) ---
    const barChartData = useMemo(() => {
        // 1. Grouper par date (Jour ou Mois selon période)
        const grouped = {};
        const labels = [];
        
        // On trie les activités par date croissante
        const sorted = [...activities].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        sorted.forEach(act => {
            const date = new Date(act.start_date);
            // Label : Jour/Mois ou Mois/Année
            const key = period === 'year' 
                ? date.toLocaleDateString('fr-FR', { month: 'short' }) 
                : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
            
            if (!labels.includes(key)) labels.push(key);
            if (!grouped[key]) grouped[key] = {};

            // Clé vélo
            const bikeName = act.external_data?.gear_name || "Autre"; // Fallback si pas de nom de vélo
            grouped[key][bikeName] = (grouped[key][bikeName] || 0) + (act.distance > 1000 ? act.distance/1000 : act.distance);
        });

        // 2. Identifier tous les vélos uniques pour faire les séries
        const bikeNames = [...new Set(sorted.map(a => a.external_data?.gear_name || "Autre"))];
        
        // 3. Créer les datasets
        const datasets = bikeNames.map((bike, index) => ({
            label: bike,
            data: labels.map(lbl => grouped[lbl][bike] || 0),
            backgroundColor: `hsl(${index * 60 + 200}, 70%, 60%)`, // Génération de couleur (teintes bleues/violettes)
            stack: 'Stack 0',
            borderRadius: 4,
        }));

        return { labels, datasets };
    }, [activities, period]);

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', labels: { color: '#fff', boxWidth: 10 } },
            title: { display: false },
        },
        scales: {
            x: { stacked: true, ticks: { color: '#9ca3af' }, grid: { display: false } },
            y: { stacked: true, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
    };

    // --- GRAPH 2 : FITNESS (ATL / CTL / TSB) ---
    // Note: Pour être précis, ce calcul devrait être fait sur TOUT l'historique depuis le début,
    // puis croppé à la période sélectionnée.
    const fitnessData = useMemo(() => {
        // 1. Trier tout l'historique
        const sortedAll = [...allActivities].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        if(sortedAll.length === 0) return null;

        const dataPoints = [];
        let atl = 0; // Fatigue (7j)
        let ctl = 0; // Forme (42j)
        
        // Date de départ pour le graphe (pour filtrer à la fin)
        const viewStartDate = activities.length > 0 
            ? new Date([...activities].sort((a,b)=>new Date(a.start_date)-new Date(b.start_date))[0].start_date) 
            : new Date();

        sortedAll.forEach(act => {
            // Calcul de la charge (TSS approximatif si non dispo)
            // Formule simple : (Durée en h * RPE estimé) ou juste distance/dénivelé pour l'exemple
            // Si Strava envoie 'suffer_score', on l'utilise.
            const load = act.external_data?.suffer_score || (act.total_elevation_gain / 10 + (act.distance > 1000 ? act.distance/1000 : act.distance)); 
            
            // Formules Coggan (simplifiées)
            // CTL_today = CTL_yesterday + (Load - CTL_yesterday) / 42
            // ATL_today = ATL_yesterday + (Load - ATL_yesterday) / 7
            ctl = ctl + (load - ctl) / 42;
            atl = atl + (load - atl) / 7;
            const tsb = ctl - atl; // Forme

            const date = new Date(act.start_date);
            
            // On ne garde que les points qui sont dans la période sélectionnée
            if (date >= viewStartDate) {
                dataPoints.push({
                    date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                    ctl: Math.round(ctl),
                    atl: Math.round(atl),
                    tsb: Math.round(tsb)
                });
            }
        });

        return {
            labels: dataPoints.map(d => d.date),
            datasets: [
                {
                    label: 'Forme (CTL)',
                    data: dataPoints.map(d => d.ctl),
                    borderColor: '#3b82f6', // Bleu
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Fatigue (ATL)',
                    data: dataPoints.map(d => d.atl),
                    borderColor: '#ec4899', // Rose
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    pointRadius: 0,
                    yAxisID: 'y'
                },
                {
                    label: 'Balance (TSB)',
                    data: dataPoints.map(d => d.tsb),
                    type: 'bar',
                    backgroundColor: (ctx) => {
                        const val = ctx.raw;
                        return val >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'; // Vert ou Rouge
                    },
                    yAxisID: 'y1',
                    barThickness: 4
                }
            ]
        };

    }, [allActivities, activities]); // Dépendances

    const fitnessOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { labels: { color: '#fff' } },
            title: { display: true, text: 'Forme & Fatigue', color: '#fff' }
        },
        scales: {
            x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
            y: { 
                type: 'linear', display: true, position: 'left', 
                ticks: { color: '#3b82f6' }, grid: { color: 'rgba(255,255,255,0.05)' } 
            },
            y1: { 
                type: 'linear', display: true, position: 'right', 
                grid: { drawOnChartArea: false }, ticks: { color: '#9ca3af' } 
            },
        }
    };

    return (
        <div className="charts-section">
            {/* GRAPHIQUE 1 : STACKED BAR */}
            <div className="chart-card glass-panel">
                <h3>Activités & Matériel</h3>
                <div className="chart-wrapper">
                    <Bar data={barChartData} options={barOptions} />
                </div>
            </div>

            {/* GRAPHIQUE 2 : FITNESS */}
            <div className="chart-card glass-panel">
                <h3>Courbe de Forme</h3>
                <div className="chart-wrapper">
                    {fitnessData && <Line data={fitnessData} options={fitnessOptions} />}
                </div>
            </div>
        </div>
    );
};

export default ChartsSection;