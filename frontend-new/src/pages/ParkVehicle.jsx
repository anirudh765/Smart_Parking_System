import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, Bike, Truck, Zap, ParkingCircle, 
  User, Phone, Clock, MapPin, CheckCircle2,
  AlertCircle, ArrowRight, Sparkles
} from 'lucide-react';
import { vehicleService, slotService, pricingService } from '../services/api';
import toast from 'react-hot-toast';
import './ParkVehicle.css';

const ParkVehicle = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [slotSummary, setSlotSummary] = useState(null);
  const [estimatedPrice, setEstimatedPrice] = useState(null);
  const [result, setResult] = useState(null);
  const [lastVehicle, setLastVehicle] = useState(null);
  
  const [formData, setFormData] = useState({
    vehicleId: '',
    vehicleType: 'car',
    ownerName: '',
    ownerPhone: '',
    duration: 2, // estimated hours
    isVIP: false,
    needsCharger: false
  });

  const vehicleTypes = [
    { id: 'car', label: 'Car', icon: Car, color: 'blue' },
    { id: 'bike', label: 'Bike', icon: Bike, color: 'green' },
    { id: 'truck', label: 'Truck', icon: Truck, color: 'orange' },
    { id: 'electric', label: 'Electric', icon: Zap, color: 'purple' }
  ];

  useEffect(() => {
    fetchSlotSummary();
    const saved = localStorage.getItem('parkease_last_vehicle');
    if (saved) {
      try { setLastVehicle(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (formData.vehicleType && formData.duration) {
      fetchPriceEstimate();
    }
  }, [formData.vehicleType, formData.duration]);

  const fetchSlotSummary = async () => {
    try {
      const res = await slotService.getSummary();
      setSlotSummary(res.data.data);
    } catch (error) {
      console.error('Failed to fetch slot summary:', error);
    }
  };

  const fetchPriceEstimate = async () => {
    try {
      const res = await pricingService.getEstimate(formData.vehicleType, formData.duration);
      setEstimatedPrice(res.data.data);
    } catch (error) {
      console.error('Failed to fetch price estimate:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const selectVehicleType = (type) => {
    setFormData(prev => ({ ...prev, vehicleType: type }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.vehicleType) {
        toast.error('Please select a vehicle type');
        return false;
      }
      const typeData = slotSummary?.byType?.[formData.vehicleType];
      if (typeData && typeData.available === 0) {
        toast.error(`No ${formData.vehicleType} slots available`);
        return false;
      }
    }
    
    if (step === 2) {
      if (!formData.vehicleId || formData.vehicleId.length < 4) {
        toast.error('Please enter a valid vehicle number');
        return false;
      }
      if (!formData.ownerName) {
        toast.error('Please enter owner name');
        return false;
      }
    }
    
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      const res = await vehicleService.park({
        vehicleId: formData.vehicleId.toUpperCase(),
        vehicleType: formData.vehicleType,
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone
      });

      setResult(res.data.data);
      setStep(4); // Success step
      toast.success('Vehicle parked successfully!');
      fetchSlotSummary(); // Refresh slot data
      // Save for one-tap booking next time
      const toSave = {
        vehicleId: formData.vehicleId.toUpperCase(),
        vehicleType: formData.vehicleType,
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone
      };
      localStorage.setItem('parkease_last_vehicle', JSON.stringify(toSave));
      setLastVehicle(toSave);
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to park vehicle');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      vehicleType: 'car',
      ownerName: '',
      ownerPhone: '',
      duration: 2,
      isVIP: false,
      needsCharger: false
    });
    setStep(1);
    setResult(null);
  };

  const getAvailability = (type) => {
    const data = slotSummary?.byType?.[type];
    if (!data) return { available: 0, total: 0 };
    return data;
  };

  const handleQuickPark = () => {
    if (!lastVehicle) return;
    setFormData(prev => ({
      ...prev,
      vehicleId: lastVehicle.vehicleId,
      vehicleType: lastVehicle.vehicleType,
      ownerName: lastVehicle.ownerName,
      ownerPhone: lastVehicle.ownerPhone || ''
    }));
    setStep(3);
  };

  return (
    <div className="park-vehicle-page">
      {/* Progress Steps */}
      <div className="steps-container">
        <div className="steps-progress">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div className={`step ${step >= s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
                {step > s ? <CheckCircle2 size={20} /> : <span>{s}</span>}
              </div>
              {s < 4 && <div className={`step-line ${step > s ? 'completed' : ''}`} />}
            </React.Fragment>
          ))}
        </div>
        <div className="steps-labels">
          <span className={step >= 1 ? 'active' : ''}>Vehicle Type</span>
          <span className={step >= 2 ? 'active' : ''}>Details</span>
          <span className={step >= 3 ? 'active' : ''}>Confirm</span>
          <span className={step >= 4 ? 'active' : ''}>Complete</span>
        </div>
      </div>

      <div className="park-vehicle-content">
        <AnimatePresence mode="wait">
          {/* Step 1: Select Vehicle Type */}
          {step === 1 && (
            <motion.div
              key="step1"
              className="step-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="step-header">
                <h2>Select Vehicle Type</h2>
                <p>Choose the type of vehicle you want to park</p>
              </div>

              {/* One-Tap Quick Park */}
              {lastVehicle && (
                <motion.div
                  className="quick-park-card"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="quick-park-info">
                    <Sparkles size={20} />
                    <div>
                      <span className="quick-park-label">Quick Park</span>
                      <span className="quick-park-detail">
                        {lastVehicle.vehicleId} &bull; {lastVehicle.vehicleType} &bull; {lastVehicle.ownerName}
                      </span>
                    </div>
                  </div>
                  <button className="btn btn-primary quick-park-btn" onClick={handleQuickPark}>
                    One-Tap Park <ArrowRight size={16} />
                  </button>
                </motion.div>
              )}

              <div className="vehicle-type-grid">
                {vehicleTypes.map((type) => {
                  const Icon = type.icon;
                  const availability = getAvailability(type.id);
                  const isUnavailable = availability.available === 0;
                  
                  return (
                    <motion.div
                      key={type.id}
                      className={`vehicle-type-card ${type.color} ${formData.vehicleType === type.id ? 'selected' : ''} ${isUnavailable ? 'unavailable' : ''}`}
                      onClick={() => !isUnavailable && selectVehicleType(type.id)}
                      whileHover={{ scale: isUnavailable ? 1 : 1.02 }}
                      whileTap={{ scale: isUnavailable ? 1 : 0.98 }}
                    >
                      <div className={`vehicle-type-icon ${type.color}`}>
                        <Icon size={32} />
                      </div>
                      <h3>{type.label}</h3>
                      <div className="availability">
                        <span className={`availability-count ${isUnavailable ? 'empty' : ''}`}>
                          {availability.available} available
                        </span>
                        <span className="availability-total">of {availability.total}</span>
                      </div>
                      {formData.vehicleType === type.id && (
                        <div className="selected-badge">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <div className="step-actions">
                <button className="btn btn-primary" onClick={nextStep}>
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Vehicle Details */}
          {step === 2 && (
            <motion.div
              key="step2"
              className="step-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="step-header">
                <h2>Vehicle Details</h2>
                <p>Enter the vehicle and owner information</p>
              </div>

              <div className="form-card">
                <div className="form-group">
                  <label htmlFor="vehicleId">
                    <Car size={18} />
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    id="vehicleId"
                    name="vehicleId"
                    value={formData.vehicleId}
                    onChange={handleChange}
                    placeholder="e.g., KA01AB1234"
                    className="form-input uppercase"
                    maxLength={12}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ownerName">
                      <User size={18} />
                      Owner Name *
                    </label>
                    <input
                      type="text"
                      id="ownerName"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleChange}
                      placeholder="Enter owner name"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ownerPhone">
                      <Phone size={18} />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="ownerPhone"
                      name="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={handleChange}
                      placeholder="Enter phone number"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="duration">
                    <Clock size={18} />
                    Estimated Duration (hours)
                  </label>
                  <input
                    type="number"
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    min={1}
                    max={24}
                    className="form-input"
                  />
                </div>

                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isVIP"
                      checked={formData.isVIP}
                      onChange={handleChange}
                    />
                    <span className="checkbox-custom"></span>
                    <span className="checkbox-text">
                      <Sparkles size={16} />
                      Request VIP Slot
                    </span>
                  </label>

                  {formData.vehicleType === 'electric' && (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="needsCharger"
                        checked={formData.needsCharger}
                        onChange={handleChange}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-text">
                        <Zap size={16} />
                        Need Charging Station
                      </span>
                    </label>
                  )}
                </div>
              </div>

              <div className="step-actions">
                <button className="btn btn-secondary" onClick={prevStep}>
                  Back
                </button>
                <button className="btn btn-primary" onClick={nextStep}>
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <motion.div
              key="step3"
              className="step-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="step-header">
                <h2>Confirm Details</h2>
                <p>Review and confirm the parking details</p>
              </div>

              <div className="confirmation-card">
                <div className="confirmation-section">
                  <h4>Vehicle Information</h4>
                  <div className="confirmation-grid">
                    <div className="confirmation-item">
                      <span className="label">Vehicle Number</span>
                      <span className="value">{formData.vehicleId.toUpperCase()}</span>
                    </div>
                    <div className="confirmation-item">
                      <span className="label">Vehicle Type</span>
                      <span className="value capitalize">{formData.vehicleType}</span>
                    </div>
                    <div className="confirmation-item">
                      <span className="label">Owner Name</span>
                      <span className="value">{formData.ownerName}</span>
                    </div>
                    {formData.ownerPhone && (
                      <div className="confirmation-item">
                        <span className="label">Phone</span>
                        <span className="value">{formData.ownerPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="confirmation-section pricing">
                  <h4>Estimated Pricing</h4>
                  <div className="price-breakdown">
                    <div className="price-row">
                      <span>Base Rate ({formData.vehicleType})</span>
                      <span>₹{estimatedPrice?.baseRate || 0}/hr</span>
                    </div>
                    {estimatedPrice?.isPeakHour && (
                      <div className="price-row peak">
                        <span>Peak Hour Applied Rate</span>
                        <span>₹{estimatedPrice.appliedRate}/hr</span>
                      </div>
                    )}
                    <div className="price-row">
                      <span>Duration</span>
                      <span>{formData.duration} hour(s)</span>
                    </div>
                    <div className="price-row total">
                      <span>Estimated Total (incl. GST)</span>
                      <span>₹{estimatedPrice?.estimatedCost || 0}</span>
                    </div>
                  </div>
                  <p className="price-note">
                    * Final bill will be calculated based on actual parking duration
                  </p>
                </div>
              </div>

              <div className="step-actions">
                <button className="btn btn-secondary" onClick={prevStep}>
                  Back
                </button>
                <button 
                  className="btn btn-primary btn-lg" 
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="btn-loading">
                      <div className="spinner"></div>
                      Parking...
                    </span>
                  ) : (
                    <>
                      <ParkingCircle size={20} />
                      Confirm & Park
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 4 && result && (
            <motion.div
              key="step4"
              className="step-content success-step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="success-card">
                <div className="success-icon">
                  <CheckCircle2 size={48} />
                </div>
                <h2>Vehicle Parked Successfully!</h2>
                <p>Your vehicle has been assigned a parking slot</p>

                <div className="parking-token">
                  <div className="token-header">
                    <ParkingCircle size={24} />
                    <span>Parking Token</span>
                  </div>
                  <div className="token-details">
                    <div className="token-main">
                      <span className="slot-number">{result.slot?.slotNumber || 'A-1'}</span>
                      <span className="slot-floor">Floor {result.slot?.floor || 1}</span>
                    </div>
                    <div className="token-info">
                      <div className="info-item">
                        <Car size={18} />
                        <span>{result.vehicleId}</span>
                      </div>
                      <div className="info-item">
                        <Clock size={18} />
                        <span>{new Date(result.entryTime).toLocaleTimeString()}</span>
                      </div>
                      <div className="info-item">
                        <MapPin size={18} />
                        <span>Zone {result.slot?.zone || 'A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="success-actions">
                  <button className="btn btn-primary" onClick={resetForm}>
                    Park Another Vehicle
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ParkVehicle;
