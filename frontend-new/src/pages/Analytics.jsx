import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, DollarSign, Car, 
  Calendar, Download, Filter, Clock,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { analyticsService } from '../services/api';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import './Analytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [revenueData, setRevenueData] = useState(null);
  const [occupancyData, setOccupancyData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [revenueRes, occupancyRes, dashboardRes] = await Promise.all([
        analyticsService.getRevenue(period),
        analyticsService.getOccupancy(period),
        analyticsService.getDashboard()
      ]);
      
      setRevenueData(revenueRes.data.data);
      setOccupancyData(occupancyRes.data.data);
      setDashboardData(dashboardRes.data.data);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await analyticsService.exportData(period);
      // Create download link
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `parking-analytics-${period}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  // Chart configurations
  const revenueChartData = {
    labels: revenueData?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Revenue',
        data: revenueData?.values || [1200, 1900, 1500, 2200, 2800, 3200, 2900],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
      }
    ]
  };

  const occupancyChartData = {
    labels: occupancyData?.labels || ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
    datasets: [
      {
        label: 'Occupancy %',
        data: occupancyData?.values || [20, 65, 85, 75, 90, 45],
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderRadius: 8,
      }
    ]
  };

  const vehicleDistributionData = {
    labels: ['Cars', 'Bikes', 'Trucks', 'Electric'],
    datasets: [{
      data: [
        dashboardData?.vehicleTypeDistribution?.car || 45,
        dashboardData?.vehicleTypeDistribution?.bike || 30,
        dashboardData?.vehicleTypeDistribution?.truck || 15,
        dashboardData?.vehicleTypeDistribution?.electric || 10
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(139, 92, 246, 0.8)'
      ],
      borderWidth: 0,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8' }
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#94a3b8' }
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-info">
          <h1>Analytics</h1>
          <p>Track revenue, occupancy, and performance metrics</p>
        </div>
        <div className="header-actions">
          <div className="period-selector">
            {['day', 'week', 'month', 'year'].map(p => (
              <button
                key={p}
                className={`period-btn ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button className="export-btn" onClick={handleExport}>
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <motion.div 
          className="kpi-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="kpi-icon revenue">
            <DollarSign size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Revenue</span>
            <span className="kpi-value">₹{revenueData?.total || dashboardData?.todayStats?.revenue || 0}</span>
            <div className="kpi-trend up">
              <ArrowUpRight size={16} />
              <span>+18.2%</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="kpi-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="kpi-icon vehicles">
            <Car size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Vehicles</span>
            <span className="kpi-value">{revenueData?.totalVehicles || dashboardData?.todayStats?.vehiclesEntered || 0}</span>
            <div className="kpi-trend up">
              <ArrowUpRight size={16} />
              <span>+12.5%</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="kpi-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="kpi-icon occupancy">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Avg Occupancy</span>
            <span className="kpi-value">{occupancyData?.average || 72}%</span>
            <div className="kpi-trend down">
              <ArrowDownRight size={16} />
              <span>-3.1%</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="kpi-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="kpi-icon duration">
            <Clock size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Avg Duration</span>
            <span className="kpi-value">{revenueData?.avgDuration || 2.5} hrs</span>
            <div className="kpi-trend up">
              <ArrowUpRight size={16} />
              <span>+5.8%</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Revenue Chart */}
        <motion.div 
          className="chart-card large"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="chart-header">
            <div>
              <h3>Revenue Trend</h3>
              <p className="chart-subtitle">Daily revenue over time</p>
            </div>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color blue"></span>
                Revenue (₹)
              </span>
            </div>
          </div>
          <div className="chart-body">
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Occupancy Chart */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="chart-header">
            <div>
              <h3>Hourly Occupancy</h3>
              <p className="chart-subtitle">Average by hour</p>
            </div>
          </div>
          <div className="chart-body">
            <Bar data={occupancyChartData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Vehicle Distribution */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="chart-header">
            <div>
              <h3>Vehicle Types</h3>
              <p className="chart-subtitle">Distribution breakdown</p>
            </div>
          </div>
          <div className="chart-body doughnut">
            <Doughnut 
              data={vehicleDistributionData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { padding: 20, usePointStyle: true }
                  }
                }
              }} 
            />
          </div>
        </motion.div>
      </div>

      {/* Peak Hours Analysis */}
      <motion.div 
        className="peak-hours-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="card-header">
          <h3>Peak Hours Analysis</h3>
          <p>Busiest times during the day</p>
        </div>
        <div className="peak-hours-grid">
          <div className="peak-slot morning">
            <div className="peak-time">8:00 AM - 10:00 AM</div>
            <div className="peak-label">Morning Rush</div>
            <div className="peak-bar">
              <div className="peak-fill" style={{ width: '85%' }}></div>
            </div>
            <div className="peak-value">85% occupancy</div>
          </div>
          <div className="peak-slot afternoon">
            <div className="peak-time">12:00 PM - 2:00 PM</div>
            <div className="peak-label">Lunch Hours</div>
            <div className="peak-bar">
              <div className="peak-fill" style={{ width: '70%' }}></div>
            </div>
            <div className="peak-value">70% occupancy</div>
          </div>
          <div className="peak-slot evening">
            <div className="peak-time">5:00 PM - 8:00 PM</div>
            <div className="peak-label">Evening Peak</div>
            <div className="peak-bar">
              <div className="peak-fill" style={{ width: '95%' }}></div>
            </div>
            <div className="peak-value">95% occupancy</div>
          </div>
        </div>
      </motion.div>

      {/* Revenue by Vehicle Type */}
      <motion.div 
        className="revenue-breakdown"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="card-header">
          <h3>Revenue by Vehicle Type</h3>
        </div>
        <div className="breakdown-grid">
          <div className="breakdown-item car">
            <div className="breakdown-icon">
              <Car size={24} />
            </div>
            <div className="breakdown-info">
              <span className="breakdown-type">Cars</span>
              <span className="breakdown-amount">₹{Math.round((revenueData?.total || 10000) * 0.55)}</span>
            </div>
            <span className="breakdown-percent">55%</span>
          </div>
          <div className="breakdown-item bike">
            <div className="breakdown-icon">
              <Car size={24} />
            </div>
            <div className="breakdown-info">
              <span className="breakdown-type">Bikes</span>
              <span className="breakdown-amount">₹{Math.round((revenueData?.total || 10000) * 0.20)}</span>
            </div>
            <span className="breakdown-percent">20%</span>
          </div>
          <div className="breakdown-item truck">
            <div className="breakdown-icon">
              <Car size={24} />
            </div>
            <div className="breakdown-info">
              <span className="breakdown-type">Trucks</span>
              <span className="breakdown-amount">₹{Math.round((revenueData?.total || 10000) * 0.18)}</span>
            </div>
            <span className="breakdown-percent">18%</span>
          </div>
          <div className="breakdown-item electric">
            <div className="breakdown-icon">
              <Car size={24} />
            </div>
            <div className="breakdown-info">
              <span className="breakdown-type">Electric</span>
              <span className="breakdown-amount">₹{Math.round((revenueData?.total || 10000) * 0.07)}</span>
            </div>
            <span className="breakdown-percent">7%</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;
