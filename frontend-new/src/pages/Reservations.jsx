import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Car, Bike, Truck, Zap, 
  Plus, X, CheckCircle2, AlertCircle, 
  ChevronLeft, ChevronRight, MapPin, User
} from 'lucide-react';
import { reservationService, slotService, pricingService } from '../services/api';
import { format, addHours, startOfDay, addDays, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';
import './Reservations.css';

const Reservations = () => {
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slotSummary, setSlotSummary] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    vehicleId: '',
    vehicleType: 'car',
    startTime: '',
    endTime: '',
    ownerName: '',
    ownerPhone: ''
  });

  const vehicleTypes = [
    { id: 'car', label: 'Car', icon: Car },
    { id: 'bike', label: 'Bike', icon: Bike },
    { id: 'truck', label: 'Truck', icon: Truck },
    { id: 'electric', label: 'Electric', icon: Zap }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reservationsRes, summaryRes] = await Promise.all([
        reservationService.getAll(),
        slotService.getSummary()
      ]);
      setReservations(reservationsRes.data.data || []);
      setSlotSummary(summaryRes.data.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.vehicleId || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setFormLoading(true);
    try {
      await reservationService.create({
        vehicleId: formData.vehicleId.toUpperCase(),
        vehicleType: formData.vehicleType,
        startTime: formData.startTime,
        endTime: formData.endTime,
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone
      });
      
      toast.success('Reservation created successfully!');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create reservation');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;

    try {
      await reservationService.cancel(id);
      toast.success('Reservation cancelled');
      fetchData();
    } catch (error) {
      toast.error('Failed to cancel reservation');
    }
  };

  const handleCheckIn = async (id) => {
    try {
      await reservationService.checkIn(id);
      toast.success('Check-in successful! Vehicle parked.');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to check in');
    }
  };

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      vehicleType: 'car',
      startTime: '',
      endTime: '',
      ownerName: '',
      ownerPhone: ''
    });
  };

  const getVehicleIcon = (type) => {
    const icons = { car: Car, bike: Bike, truck: Truck, electric: Zap };
    const Icon = icons[type] || Car;
    return <Icon size={18} />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'blue';
      case 'checked-in': return 'green';
      case 'completed': return 'gray';
      case 'cancelled': return 'red';
      case 'expired': return 'orange';
      default: return 'gray';
    }
  };

  const filteredReservations = reservations.filter(r => 
    isSameDay(new Date(r.startTime), selectedDate)
  );

  const navigateDate = (direction) => {
    setSelectedDate(prev => addDays(prev, direction));
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Loading reservations...</p>
      </div>
    );
  }

  return (
    <div className="reservations-page">
      {/* Header */}
      <div className="reservations-header">
        <div className="header-left">
          <h1>Reservations</h1>
          <p>Manage parking slot reservations</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={20} />
          New Reservation
        </button>
      </div>

      {/* Date Navigator */}
      <motion.div 
        className="date-navigator"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button className="nav-btn" onClick={() => navigateDate(-1)}>
          <ChevronLeft size={20} />
        </button>
        <div className="date-display">
          <Calendar size={20} />
          <span>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
          {isSameDay(selectedDate, new Date()) && (
            <span className="today-badge">Today</span>
          )}
        </div>
        <button className="nav-btn" onClick={() => navigateDate(1)}>
          <ChevronRight size={20} />
        </button>
      </motion.div>

      {/* Stats */}
      <div className="reservation-stats">
        <div className="stat-box">
          <span className="stat-number">{reservations.filter(r => r.status === 'confirmed').length}</span>
          <span className="stat-label">Confirmed</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{reservations.filter(r => r.status === 'checked-in').length}</span>
          <span className="stat-label">Checked In</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{filteredReservations.length}</span>
          <span className="stat-label">Today</span>
        </div>
      </div>

      {/* Reservations List */}
      <div className="reservations-list">
        {filteredReservations.length > 0 ? (
          filteredReservations.map((reservation, index) => (
            <motion.div
              key={reservation._id}
              className="reservation-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="reservation-vehicle">
                <div className={`vehicle-type-icon ${reservation.vehicleType}`}>
                  {getVehicleIcon(reservation.vehicleType)}
                </div>
                <div className="vehicle-info">
                  <span className="vehicle-id">{reservation.vehicleId}</span>
                  <span className="vehicle-type">{reservation.vehicleType}</span>
                </div>
              </div>

              <div className="reservation-time">
                <Clock size={16} />
                <span>
                  {format(new Date(reservation.startTime), 'hh:mm a')} - {format(new Date(reservation.endTime), 'hh:mm a')}
                </span>
              </div>

              {reservation.slot && (
                <div className="reservation-slot">
                  <MapPin size={16} />
                  <span>{reservation.slot.slotNumber}</span>
                </div>
              )}

              <div className={`reservation-status ${getStatusColor(reservation.status)}`}>
                <span>{reservation.status}</span>
              </div>

              <div className="reservation-actions">
                {reservation.status === 'confirmed' && (
                  <>
                    <button 
                      className="action-btn check-in"
                      onClick={() => handleCheckIn(reservation._id)}
                    >
                      <CheckCircle2 size={16} />
                      Check In
                    </button>
                    <button 
                      className="action-btn cancel"
                      onClick={() => handleCancel(reservation._id)}
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="empty-state">
            <Calendar size={48} />
            <h3>No Reservations</h3>
            <p>No reservations found for this date.</p>
          </div>
        )}
      </div>

      {/* All Reservations Table */}
      <motion.div 
        className="all-reservations"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3>All Upcoming Reservations</h3>
        <div className="reservations-table">
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Date & Time</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.filter(r => r.status !== 'cancelled' && r.status !== 'completed').map(reservation => (
                <tr key={reservation._id}>
                  <td className="vehicle-cell">
                    <div className={`mini-icon ${reservation.vehicleType}`}>
                      {getVehicleIcon(reservation.vehicleType)}
                    </div>
                    <span>{reservation.vehicleId}</span>
                  </td>
                  <td className="capitalize">{reservation.vehicleType}</td>
                  <td>
                    <div className="datetime">
                      <span>{format(new Date(reservation.startTime), 'MMM dd, yyyy')}</span>
                      <span className="time">{format(new Date(reservation.startTime), 'hh:mm a')}</span>
                    </div>
                  </td>
                  <td>
                    {Math.round((new Date(reservation.endTime) - new Date(reservation.startTime)) / (1000 * 60 * 60))} hrs
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusColor(reservation.status)}`}>
                      {reservation.status}
                    </span>
                  </td>
                  <td>
                    {reservation.status === 'confirmed' && (
                      <button 
                        className="table-action cancel"
                        onClick={() => handleCancel(reservation._id)}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* New Reservation Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>New Reservation</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="reservation-form">
                <div className="form-group">
                  <label>Vehicle Number *</label>
                  <input
                    type="text"
                    name="vehicleId"
                    value={formData.vehicleId}
                    onChange={handleInputChange}
                    placeholder="e.g., KA01AB1234"
                    className="form-input uppercase"
                    maxLength={12}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Vehicle Type *</label>
                  <div className="vehicle-type-selector">
                    {vehicleTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          className={`type-btn ${formData.vehicleType === type.id ? 'selected' : ''}`}
                          onClick={() => setFormData(p => ({ ...p, vehicleType: type.id }))}
                        >
                          <Icon size={20} />
                          <span>{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time *</label>
                    <input
                      type="datetime-local"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time *</label>
                    <input
                      type="datetime-local"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Owner Name</label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      placeholder="Enter name"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={handleInputChange}
                      placeholder="Enter phone"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <span className="btn-loading">
                        <div className="spinner"></div>
                        Creating...
                      </span>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Create Reservation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reservations;
