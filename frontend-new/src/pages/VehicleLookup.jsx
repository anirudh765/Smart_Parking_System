import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Car, Bike, Truck, Zap, Clock, MapPin, 
  User, Phone, History, DollarSign, AlertCircle,
  ChevronRight, Calendar
} from 'lucide-react';
import { vehicleService } from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import './VehicleLookup.css';

const VehicleLookup = () => {
  const [loading, setLoading] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleData, setVehicleData] = useState(null);
  const [currentCharges, setCurrentCharges] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!vehicleId || vehicleId.length < 4) {
      toast.error('Please enter a valid vehicle number');
      return;
    }

    setLoading(true);
    setNotFound(false);
    setVehicleData(null);
    setCurrentCharges(null);

    try {
      const res = await vehicleService.lookup(vehicleId.toUpperCase());
      setVehicleData(res.data.data);

      // Also fetch current charges
      try {
        const billRes = await vehicleService.getBill(vehicleId.toUpperCase());
        setCurrentCharges(billRes.data.data);
      } catch (e) {
        // Bill might not be available for all vehicles
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error(error.response?.data?.error || 'Failed to find vehicle');
      }
    } finally {
      setLoading(false);
    }
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'car': return <Car size={24} />;
      case 'bike': return <Bike size={24} />;
      case 'truck': return <Truck size={24} />;
      case 'electric': return <Zap size={24} />;
      default: return <Car size={24} />;
    }
  };

  const getVehicleColor = (type) => {
    switch (type) {
      case 'car': return 'blue';
      case 'bike': return 'green';
      case 'truck': return 'orange';
      case 'electric': return 'purple';
      default: return 'blue';
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  return (
    <div className="vehicle-lookup-page">
      {/* Search Section */}
      <motion.div 
        className="lookup-search-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="search-header">
          <Search size={28} className="search-header-icon" />
          <div>
            <h2>Vehicle Lookup</h2>
            <p>Find parked vehicles and view their current status</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="lookup-form">
          <div className="search-input-group">
            <div className="input-with-icon">
              <Car size={22} className="input-icon" />
              <input
                type="text"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value.toUpperCase())}
                placeholder="Enter Vehicle Number"
                className="lookup-input"
                maxLength={12}
              />
            </div>
            <button 
              type="submit" 
              className="search-btn"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner-sm"></div>
              ) : (
                <Search size={22} />
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {/* Not Found */}
        {notFound && (
          <motion.div 
            className="not-found-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AlertCircle size={48} />
            <h3>Vehicle Not Found</h3>
            <p>No vehicle with number <strong>{vehicleId}</strong> is currently parked.</p>
          </motion.div>
        )}

        {/* Vehicle Found */}
        {vehicleData && (
          <motion.div 
            className="vehicle-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Vehicle Header */}
            <div className="vehicle-header-card">
              <div className={`vehicle-icon-lg ${getVehicleColor(vehicleData.vehicleType)}`}>
                {getVehicleIcon(vehicleData.vehicleType)}
              </div>
              <div className="vehicle-main-info">
                <h3 className="vehicle-plate">{vehicleData.vehicleId}</h3>
                <span className="vehicle-type-label">{vehicleData.vehicleType}</span>
              </div>
              <div className="vehicle-status">
                <span className="status-badge active">
                  <span className="status-dot"></span>
                  Currently Parked
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="info-grid">
              {/* Parking Location */}
              <div className="info-card">
                <div className="info-card-header">
                  <MapPin size={20} />
                  <span>Parking Location</span>
                </div>
                <div className="info-card-body">
                  <div className="location-display">
                    <span className="slot-number">{vehicleData.slotNumber || 'A-1'}</span>
                    <div className="location-details">
                      <span>Floor {vehicleData.floor || 1}</span>
                      <span className="separator">•</span>
                      <span>Zone {vehicleData.zone || 'A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Information */}
              <div className="info-card">
                <div className="info-card-header">
                  <Clock size={20} />
                  <span>Time Information</span>
                </div>
                <div className="info-card-body">
                  <div className="time-info">
                    <div className="time-row">
                      <span className="time-label">Entry Time</span>
                      <span className="time-value">
                        {format(new Date(vehicleData.entryTime), 'MMM dd, hh:mm a')}
                      </span>
                    </div>
                    <div className="time-row">
                      <span className="time-label">Duration</span>
                      <span className="time-value duration">
                        {formatDistanceToNow(new Date(vehicleData.entryTime))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Information */}
              {vehicleData.ownerName && (
                <div className="info-card">
                  <div className="info-card-header">
                    <User size={20} />
                    <span>Owner Details</span>
                  </div>
                  <div className="info-card-body">
                    <div className="owner-info">
                      <div className="owner-row">
                        <User size={18} />
                        <span>{vehicleData.ownerName}</span>
                      </div>
                      {vehicleData.ownerPhone && (
                        <div className="owner-row">
                          <Phone size={18} />
                          <span>{vehicleData.ownerPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Current Charges */}
              {currentCharges && (
                <div className="info-card charges-card">
                  <div className="info-card-header">
                    <DollarSign size={20} />
                    <span>Current Charges</span>
                  </div>
                  <div className="info-card-body">
                    <div className="charges-display">
                      <div className="current-amount">
                        <span className="currency">₹</span>
                        <span className="amount">{currentCharges.totalAmount}</span>
                      </div>
                      <div className="charges-breakdown">
                        <div className="charge-row">
                          <span>Base ({formatDuration(currentCharges.duration)})</span>
                          <span>₹{currentCharges.breakdown?.baseCharge || currentCharges.baseAmount}</span>
                        </div>
                        {currentCharges.breakdown?.gst > 0 && (
                          <div className="charge-row">
                            <span>GST</span>
                            <span>₹{currentCharges.breakdown.gst}</span>
                          </div>
                        )}
                      </div>
                      <p className="charges-note">* Charges update in real-time</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Parking History */}
            {vehicleData.parkingHistory && vehicleData.parkingHistory.length > 0 && (
              <div className="history-section">
                <div className="history-header">
                  <History size={20} />
                  <h4>Previous Visits</h4>
                </div>
                <div className="history-list">
                  {vehicleData.parkingHistory.slice(0, 5).map((visit, index) => (
                    <div key={index} className="history-item">
                      <div className="history-date">
                        <Calendar size={16} />
                        <span>{format(new Date(visit.entryTime), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="history-duration">
                        <Clock size={16} />
                        <span>{formatDuration(visit.duration)}</span>
                      </div>
                      <div className="history-amount">₹{visit.totalAmount}</div>
                      <ChevronRight size={16} className="history-arrow" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!vehicleData && !notFound && !loading && (
        <motion.div 
          className="empty-state-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="empty-illustration">
            <Search size={64} />
          </div>
          <h3>Search for a Vehicle</h3>
          <p>Enter a vehicle number above to view its parking status, location, and current charges.</p>
        </motion.div>
      )}
    </div>
  );
};

export default VehicleLookup;
