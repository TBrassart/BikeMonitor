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

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await bikeService.getAll();
        setBikes(data || []);
      } catch (error) {
        console.error("Erreur graphiques:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div>Chargement...</div>;
  if (!bikes.length) return null;

  // 1. Barres (KM)
  const sortedBikes = [...bikes].sort((a, b) => (b.total_km || 0) - (a.total_km || 0));
  const barData = {
    labels: sortedBikes.map(b => b.name),
    datasets: [{
      label: 'Kilomètres',
      data: sortedBikes.map(b => b.total_km || 0),
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    }],
  };
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: { color: '#fff', anchor: 'end', align: 'start', offset: -20 }
    }
  };

  // 2. Doughnut (Propriétaires)
  const owners = {};
  bikes.forEach(b => {
    const name = b.profiles?.name || 'Moi';
    owners[name] = (owners[name] || 0) + 1;
  });
  const doughnutData = {
    labels: Object.keys(owners),
    datasets: [{
      data: Object.values(owners),
      backgroundColor: ['#10b981', '#f59e0b', '#6366f1', '#ec4899'],
      borderWidth: 2,
    }]
  };

  return (
    <div className="charts-section">
      <h3>Statistiques de l'écurie 📊</h3>
      <div className="charts-container">
        <div className="chart-card">
          <div className="chart-wrapper">
            <Bar options={barOptions} data={barData} />
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-wrapper">
            <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartsSection;