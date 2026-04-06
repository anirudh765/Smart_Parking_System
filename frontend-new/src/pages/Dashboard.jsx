import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Car, Bike, Truck, Zap, TrendingUp, TrendingDown, 
  DollarSign, Clock, ParkingCircle, Users, Activity,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { analyticsService, slotService } from '../services/api';
import toast from 'react-hot-toast';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [slotSummary, setSlotSummary] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, slotRes] = await Promise.all([
        analyticsService.getDashboard().catch(() => null),
        slotService.getSummary()
      ]);
      
      if (dashboardRes) {
        setDashboardData(dashboardRes.data.data);
      }
      setSlotSummary(slotRes.data.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Active Vehicles',
      value: dashboardData?.currentStats?.activeVehicles || slotSummary?.overall?.occupied || 0,
      icon: Car,
      color: 'blue',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Available Slots',
      value: dashboardData?.currentStats?.availableSlots || slotSummary?.overall?.available || 0,
      icon: ParkingCircle,
      color: 'green',
      trend: slotSummary?.overall?.occupancyRate ? `${slotSummary.overall.occupancyRate}% full` : '',
      trendUp: false
    },
    {
      title: "Today's Revenue",
      value: `₹${(dashboardData?.todayStats?.revenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'purple',
      trend: '+18%',
      trendUp: true
    },
    {
      title: 'Reservations',
      value: dashboardData?.currentStats?.todayReservations || 0,
      icon: Clock,
      color: 'orange',
      trend: 'Today',
      trendUp: true
    }
  ];

  const vehicleTypeData = {
    labels: ['Cars', 'Bikes', 'Trucks', 'Electric'],
    datasets: [{
      data: [
        dashboardData?.vehicleTypeDistribution?.car || 0,
        dashboardData?.vehicleTypeDistribution?.bike || 0,
        dashboardData?.vehicleTypeDistribution?.truck || 0,
        dashboardData?.vehicleTypeDistribution?.electric || 0
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(139, 92, 246, 0.8)'
      ],
      borderWidth: 0,
      cutout: '70%'
    }]
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'car': return <Car size={20} />;
      case 'bike': return <Bike size={20} />;
      case 'truck': return <Truck size={20} />;
      case 'electric': return <Zap size={20} />;
      default: return <Car size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Stats Cards */}
      <div className="stats-grid">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              className={`stat-card ${stat.color}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="stat-header">
                <div className={`stat-icon ${stat.color}`}>
                  <Icon size={24} />
                </div>
                <div className={`stat-trend ${stat.trendUp ? 'up' : 'down'}`}>
                  {stat.trendUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  <span>{stat.trend}</span>
                </div>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-title">{stat.title}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="dashboard-grid">
        {/* Slot Summary */}
        <motion.div 
          className="dashboard-card slot-summary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="card-header">
            <h3>Slot Availability</h3>
            <span className="card-badge">{slotSummary?.overall?.total || 0} Total</span>
          </div>
          <div className="slot-type-grid">
            {slotSummary?.byType && Object.entries(slotSummary.byType).map(([type, data]) => (
              <div key={type} className={`slot-type-card ${type}`}>
                <div className="slot-type-icon">
                  {getVehicleIcon(type)}
                </div>
                <div className="slot-type-info">
                  <span className="slot-type-name">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  <span className="slot-type-count">
                    <strong>{data.available}</strong> / {data.total}
                  </span>
                </div>
                <div className="slot-progress-bar">
                  <div 
                    className="slot-progress-fill"
                    style={{ width: `${(data.occupied / data.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Vehicle Distribution Chart */}
        <motion.div 
          className="dashboard-card chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="card-header">
            <h3>Vehicle Distribution</h3>
            <span className="card-subtitle">Currently Parked</span>
          </div>
          <div className="chart-container">
            <Doughnut 
              data={vehicleTypeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      padding: 20,
                      usePointStyle: true,
                      pointStyle: 'circle'
                    }
                  }
                }
              }}
            />
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div 
          className="dashboard-card transactions-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="card-header">
            <h3>Recent Transactions</h3>
            <button className="view-all-btn" onClick={() => navigate('/transactions')}>View All</button>
          </div>
          <div className="transactions-list">
            {dashboardData?.recentTransactions?.length > 0 ? (
              dashboardData.recentTransactions.map((tx, index) => (
                <div key={tx.transactionId || index} className="transaction-item">
                  <div className="transaction-icon">
                    <DollarSign size={18} />
                  </div>
                  <div className="transaction-info">
                    <span className="transaction-id">{tx.vehicleId}</span>
                    <span className="transaction-type">{tx.type}</span>
                  </div>
                  <div className="transaction-amount">₹{tx.totalAmount}</div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Activity size={40} />
                <p>No recent transactions</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          className="dashboard-card quick-stats"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="card-header">
            <h3>Today's Summary</h3>
          </div>
          <div className="quick-stats-grid">
            <div className="quick-stat">
              <span className="quick-stat-value">{dashboardData?.todayStats?.vehiclesEntered || 0}</span>
              <span className="quick-stat-label">Vehicles Entered</span>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-value">{dashboardData?.todayStats?.vehiclesExited || 0}</span>
              <span className="quick-stat-label">Vehicles Exited</span>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-value">{dashboardData?.todayStats?.transactions || 0}</span>
              <span className="quick-stat-label">Transactions</span>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-value">{slotSummary?.overall?.occupancyRate || 0}%</span>
              <span className="quick-stat-label">Occupancy Rate</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
