import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { bikeService } from '../../services/api';
import './ChartsSection.css';

// Enregistrement des composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartDataLabels
);

const ChartsSection = () => {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chargement des données
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await bikeService.getAll();
        setBikes(data || []);
      } catch (error) {
        console.error("Erreur chargement graphiques", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div className="charts-loading">Chargement des graphiques...</div>;
  if (!bikes || bikes.length === 0) return null;

  // --- PRÉPARATION DES DONNÉES ---

  // 1. Graphique Barres : KM par Vélo
  const sortedBikes = [...bikes].sort((a, b) => (b.total_km || 0) - (a.total_km || 0));
  
  const barData = {
    labels: sortedBikes.map(b => b.name),
    datasets: [
      {
        label: 'Kilomètres parcourus',
        data: sortedBikes.map(b => b.total_km || 0),
        backgroundColor: '#3b82f6', // Bleu moderne
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Kilométrage par vélo' },
      datalabels: {
        color: '#fff',
        anchor: 'end',
        align: 'start',
        offset: -20,
        formatter: (value) => value > 0 ? value : ''
      }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  // 2. Graphique Doughnut : Répartition par Propriétaire (Turlag)
  const ownerStats = {};
  bikes.forEach(bike => {
    // Sécurité si profiles est null
    const ownerName = bike.profiles?.name || 'Moi';
    if (!ownerStats[ownerName]) ownerStats[ownerName] = 0;
    ownerStats[ownerName] += 1; 
  });

  const doughnutData = {
    labels: Object.keys(ownerStats),
    datasets: [
      {
        label: 'Vélos possédés',
        data: Object.values(ownerStats),
        backgroundColor: [
          '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6',
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' },
      title: { display: true, text: 'Répartition du garage' },
      datalabels: {
        color: '#fff',
        formatter: (value) => value
      }
    },
  };

  return (
    <div className="charts-section">
      <h3>Statistiques de l'écurie 📊</h3>
      <div className="charts-container">
        
        {/* Graphique Barres */}
        <div className="chart-card">
          <div className="chart-wrapper">
            <Bar options={barOptions} data={barData} />
          </div>
        </div>

        {/* Graphique Doughnut */}
        <div className="chart-card">
          <div className="chart-wrapper">
            <Doughnut options={doughnutOptions} data={doughnutData} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChartsSection;