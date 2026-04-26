import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { getLogLevelsDistribution, getLogStatistics } from '../services/api';
import './Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function Dashboard({ isServerConnected }) {
  const [statsData, setStatsData] = useState(null);
  const [levelsData, setLevelsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isServerConnected) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      // Fetch log levels distribution
      const levelsResult = await getLogLevelsDistribution();
      if (levelsResult.success) {
        setLevelsData(levelsResult.data);
      }

      // Fetch statistics (placeholder)
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const statsResult = await getLogStatistics(weekAgo.toISOString(), today.toISOString());
      if (statsResult.success) {
        setStatsData(statsResult.data);
      }

      setLoading(false);
    };

    fetchData();
  }, [isServerConnected]);

  const mockStatsData = {
    totalLogs: 15240,
    todayLogs: 1250,
    errorLogs: 342,
    warningLogs: 789,
  };

  const mockChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Total Logs',
        data: [2100, 2250, 2180, 2400, 2200, 1800, 1500],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const mockLevelData = {
    labels: ['Info', 'Warning', 'Error', 'Debug', 'Critical'],
    datasets: [
      {
        label: 'Log Count by Level',
        data: [5200, 3100, 2500, 2200, 1240],
        backgroundColor: [
          'rgba(52, 152, 219, 0.8)',
          'rgba(243, 156, 18, 0.8)',
          'rgba(231, 76, 60, 0.8)',
          'rgba(149, 165, 166, 0.8)',
          'rgba(39, 174, 96, 0.8)',
        ],
      },
    ],
  };

  if (!isServerConnected) {
    return (
      <div className="dashboard">
        <div className="error-message">
          ⚠️ Backend server is not connected. Please ensure the server is running at http://localhost:8000
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Statistics Cards */}
      <div className="dashboard-grid">
        <div className="stats-card info">
          <div className="label">Total Logs</div>
          <div className="value">{mockStatsData.totalLogs.toLocaleString()}</div>
        </div>
        <div className="stats-card success">
          <div className="label">Today's Logs</div>
          <div className="value">{mockStatsData.todayLogs.toLocaleString()}</div>
        </div>
        <div className="stats-card danger">
          <div className="label">Error Logs</div>
          <div className="value">{mockStatsData.errorLogs.toLocaleString()}</div>
        </div>
        <div className="stats-card warning">
          <div className="label">Warning Logs</div>
          <div className="value">{mockStatsData.warningLogs.toLocaleString()}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Line Chart */}
        <div className="card">
          <h2>📈 Logs Over Time (Last 7 Days)</h2>
          <div className="chart-container">
            <Line
              data={mockChartData}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <h2>📊 Distribution by Level</h2>
          <div className="chart-container">
            <Pie
              data={mockLevelData}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="card">
        <h2>📌 Summary</h2>
        <table>
          <tbody>
            <tr>
              <td>Total Logs Collected</td>
              <td>{mockStatsData.totalLogs.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Logs Today</td>
              <td>{mockStatsData.todayLogs.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Average Logs per Day</td>
              <td>{(mockStatsData.totalLogs / 30).toFixed(0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Error Rate</td>
              <td>{((mockStatsData.errorLogs / mockStatsData.totalLogs) * 100).toFixed(2)}%</td>
            </tr>
            <tr>
              <td>Critical Issues</td>
              <td>12</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
