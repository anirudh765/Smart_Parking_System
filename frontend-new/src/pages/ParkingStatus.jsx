import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ParkingCircle, Car, Bike, Truck, Zap, 
  Filter, RefreshCw, Layers, MapPin
} from 'lucide-react';
import { slotService } from '../services/api';
import toast from 'react-hot-toast';
import './ParkingStatus.css';

const ParkingStatus = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slots, setSlots] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState({
    type: 'all',
    status: 'all',
    floor: 'all'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [slotsRes, summaryRes] = await Promise.all([
        slotService.getAll(),
        slotService.getSummary()
      ]);
      setSlots(slotsRes.data.data);
      setSummary(summaryRes.data.data);
    } catch (error) {
      toast.error('Failed to load parking data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'car': return <Car size={18} />;
      case 'bike': return <Bike size={18} />;
      case 'truck': return <Truck size={18} />;
      case 'electric': return <Zap size={18} />;
      default: return <Car size={18} />;
    }
  };

  const filteredSlots = slots.filter(slot => {
    if (filter.type !== 'all' && slot.type !== filter.type) return false;
    if (filter.status !== 'all') {
      if (filter.status === 'available' && slot.status !== 'available') return false;
      if (filter.status === 'occupied' && slot.status !== 'occupied') return false;
    }
    if (filter.floor !== 'all' && slot.floor !== parseInt(filter.floor)) return false;
    return true;
  });

  const groupedByFloor = filteredSlots.reduce((acc, slot) => {
    const floor = slot.floor || 1;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(slot);
    return acc;
  }, {});

  const floors = Object.keys(groupedByFloor).map(Number).sort();

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Loading parking status...</p>
      </div>
    );
  }

  return (
    <div className="parking-status-page">
      {/* Summary Cards */}
      <div className="status-summary">
        <motion.div 
          className="summary-card total"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ParkingCircle size={28} />
          <div className="summary-info">
            <span className="summary-value">{summary?.overall?.total || 0}</span>
            <span className="summary-label">Total Slots</span>
          </div>
        </motion.div>

        <motion.div 
          className="summary-card available"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="summary-icon available">
            <div className="slot-indicator available"></div>
          </div>
          <div className="summary-info">
            <span className="summary-value">{summary?.overall?.available || 0}</span>
            <span className="summary-label">Available</span>
          </div>
        </motion.div>

        <motion.div 
          className="summary-card occupied"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="summary-icon occupied">
            <div className="slot-indicator occupied"></div>
          </div>
          <div className="summary-info">
            <span className="summary-value">{summary?.overall?.occupied || 0}</span>
            <span className="summary-label">Occupied</span>
          </div>
        </motion.div>

        <motion.div 
          className="summary-card rate"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="occupancy-ring">
            <svg viewBox="0 0 36 36">
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="3"
                strokeDasharray={`${summary?.overall?.occupancyRate || 0}, 100`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <span className="rate-value">{summary?.overall?.occupancyRate || 0}%</span>
          </div>
          <span className="summary-label">Occupancy</span>
        </motion.div>
      </div>

      {/* Slot Type Breakdown */}
      <motion.div 
        className="type-breakdown"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {summary?.byType && Object.entries(summary.byType).map(([type, data]) => (
          <div key={type} className={`type-card ${type}`}>
            <div className="type-icon">{getVehicleIcon(type)}</div>
            <div className="type-info">
              <span className="type-name">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
              <div className="type-stats">
                <span className="available">{data.available} free</span>
                <span className="divider">/</span>
                <span className="total">{data.total}</span>
              </div>
            </div>
            <div className="type-bar">
              <div 
                className="type-bar-fill" 
                style={{ width: `${(data.occupied / data.total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filters and Actions */}
      <div className="status-toolbar">
        <div className="filters">
          <div className="filter-group">
            <Filter size={18} />
            <select 
              value={filter.type} 
              onChange={(e) => setFilter(f => ({ ...f, type: e.target.value }))}
            >
              <option value="all">All Types</option>
              <option value="car">Cars</option>
              <option value="bike">Bikes</option>
              <option value="truck">Trucks</option>
              <option value="electric">Electric</option>
            </select>
          </div>

          <div className="filter-group">
            <div className="slot-indicator small available"></div>
            <select 
              value={filter.status} 
              onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))}
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
            </select>
          </div>

          <div className="filter-group">
            <Layers size={18} />
            <select 
              value={filter.floor} 
              onChange={(e) => setFilter(f => ({ ...f, floor: e.target.value }))}
            >
              <option value="all">All Floors</option>
              {[1, 2, 3, 4].map(f => (
                <option key={f} value={f}>Floor {f}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {/* Slot Grid by Floor */}
      <div className="floor-sections">
        {floors.map(floor => (
          <motion.div 
            key={floor}
            className="floor-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="floor-header">
              <Layers size={20} />
              <h3>Floor {floor}</h3>
              <span className="floor-stats">
                {groupedByFloor[floor].filter(s => s.status === 'available').length} available
              </span>
            </div>

            {['car', 'bike', 'truck', 'electric'].map(type => {
              const typeSlots = groupedByFloor[floor].filter(s => s.type === type);
              if (typeSlots.length === 0) return null;
              return (
                <div key={type} className={`type-section type-section-${type}`}>
                  <div className="type-section-header">
                    {getVehicleIcon(type)}
                    <span>{type.charAt(0).toUpperCase() + type.slice(1)} Slots</span>
                    <span className="type-section-count">
                      {typeSlots.filter(s => s.status === 'available').length}/{typeSlots.length} free
                    </span>
                  </div>
                  <div className="slots-grid">
                    {typeSlots.map((slot, index) => (
                      <motion.div
                        key={slot._id || slot.slotCode}
                        className={`slot-card ${slot.status === 'occupied' ? 'occupied' : slot.status === 'reserved' ? 'reserved' : slot.status === 'maintenance' ? 'maintenance' : 'available'} ${slot.type}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.02 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="slot-type-icon">
                          {getVehicleIcon(slot.type)}
                        </div>
                        <span className="slot-number">{slot.slotCode}</span>
                        <div className="slot-status">
                          <div className={`status-dot ${slot.status}`}></div>
                        </div>
                        {slot.status === 'occupied' && slot.currentVehicle?.vehicleId && (
                          <span className="slot-vehicle">{slot.currentVehicle.vehicleId}</span>
                        )}
                        {slot.isVIP && <span className="vip-badge">VIP</span>}
                        {slot.hasCharger && <span className="charger-badge"><Zap size={10} /></span>}
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="status-legend">
        <div className="legend-item">
          <div className="slot-indicator available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="slot-indicator occupied"></div>
          <span>Occupied</span>
        </div>
        <div className="legend-item car">
          <Car size={16} />
          <span>Car</span>
        </div>
        <div className="legend-item bike">
          <Bike size={16} />
          <span>Bike</span>
        </div>
        <div className="legend-item truck">
          <Truck size={16} />
          <span>Truck</span>
        </div>
        <div className="legend-item electric">
          <Zap size={16} />
          <span>Electric</span>
        </div>
      </div>
    </div>
  );
};

export default ParkingStatus;
