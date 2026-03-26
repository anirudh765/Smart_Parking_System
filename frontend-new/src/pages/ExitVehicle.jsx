import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Car, Clock, MapPin, DollarSign, 
  LogOut, Receipt, Wallet, CheckCircle2,
  AlertTriangle, ArrowRight
} from 'lucide-react';
import { vehicleService, paymentService } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './ExitVehicle.css';

const ExitVehicle = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleData, setVehicleData] = useState(null);
  const [billData, setBillData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [exitResult, setExitResult] = useState(null);
  const [paying, setPaying] = useState(false);

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: Wallet },
    { id: 'online', label: 'Online Payment', icon: DollarSign }
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!vehicleId || vehicleId.length < 4) {
      toast.error('Please enter a valid vehicle number');
      return;
    }

    setSearching(true);
    try {
      // First lookup the vehicle
      const lookupRes = await vehicleService.lookup(vehicleId.toUpperCase());
      setVehicleData(lookupRes.data.data);

      // Then get the bill
      const billRes = await vehicleService.getBill(vehicleId.toUpperCase());
      setBillData(billRes.data.data);

      setStep(2);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Vehicle not found in parking lot');
      } else {
        toast.error(error.response?.data?.error || 'Failed to find vehicle');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleExit = async () => {
    // For non-online methods, keep existing flow
    if (paymentMethod !== 'online') {
      setLoading(true);
      try {
        const res = await vehicleService.exit({ vehicleId: vehicleId.toUpperCase(), paymentMethod });
        setExitResult(res.data.data?.receipt || res.data.data);
        setStep(3);
        toast.success('Vehicle exit completed successfully!');
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to process exit');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Online payment flow via Razorpay
    if (!billData || !billData.estimatedTotal) {
      toast.error('Bill amount not available');
      return;
    }

    if (!window.Razorpay) {
      toast.error('Payment gateway not loaded. Please refresh the page.');
      return;
    }

    const amount = Number(billData.estimatedTotal) || 0;
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      toast.error('Invalid bill amount for payment');
      return;
    }

    setPaying(true);
    try {
      // 1. Create order on backend
      const orderRes = await paymentService.createOrder({
        amount,
        meta: {
          purpose: 'parking_exit',
          vehicleId: vehicleId.toUpperCase(),
        },
      });

      const orderData = orderRes.data.data || orderRes.data;

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Smart Parking',
        description: 'Parking Exit Payment',
        order_id: orderData.orderId,
        method: {
          // Enable standard payment instruments in Razorpay Checkout
          upi: '1',
          card: '1',
          netbanking: '1',
          wallet: '1',
          emi: '0',
        },
        handler: async function (response) {
          try {
            // 2. Verify payment on backend
            await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // 3. Complete exit after successful payment
            const res = await vehicleService.exit({
              vehicleId: vehicleId.toUpperCase(),
              paymentMethod: 'online',
            });
            setExitResult(res.data.data?.receipt || res.data.data);
            setStep(3);
            toast.success('Payment successful and vehicle exit completed!');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification or exit failed');
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          },
        },
        theme: {
          color: '#2563eb',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate UPI payment');
      setPaying(false);
    }
  };

  const resetForm = () => {
    setVehicleId('');
    setVehicleData(null);
    setBillData(null);
    setExitResult(null);
    setPaymentMethod('cash');
    setStep(1);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  return (
    <div className="exit-vehicle-page">
      <AnimatePresence mode="wait">
        {/* Step 1: Search Vehicle */}
        {step === 1 && (
          <motion.div
            key="step1"
            className="exit-card search-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="exit-icon-wrapper">
              <LogOut size={32} />
            </div>
            <h2>Vehicle Exit</h2>
            <p>Enter the vehicle number to process exit and generate bill</p>

            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-wrapper">
                <Search size={22} className="search-icon" />
                <input
                  type="text"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value.toUpperCase())}
                  placeholder="Enter Vehicle Number (e.g., KA01AB1234)"
                  className="search-input"
                  maxLength={12}
                  autoFocus
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary btn-lg"
                disabled={searching}
              >
                {searching ? (
                  <span className="btn-loading">
                    <div className="spinner"></div>
                    Searching...
                  </span>
                ) : (
                  <>
                    Find Vehicle
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="search-tips">
              <h4>Quick Tips</h4>
              <ul>
                <li>Enter the complete vehicle registration number</li>
                <li>The vehicle must be currently parked to process exit</li>
                <li>Bill will be calculated automatically based on duration</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* Step 2: Bill & Payment */}
        {step === 2 && vehicleData && billData && (
          <motion.div
            key="step2"
            className="exit-card bill-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bill-header">
              <div className="vehicle-info-badge">
                <Car size={24} />
                <span className="vehicle-number">{vehicleData.vehicleId}</span>
              </div>
              <span className="vehicle-type-badge">{vehicleData.vehicleType}</span>
            </div>

            <div className="parking-details">
              <div className="detail-item">
                <div className="detail-icon">
                  <MapPin size={20} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Parking Slot</span>
                  <span className="detail-value">{vehicleData.slot?.number || vehicleData.slot?.code || 'N/A'}</span>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <Clock size={20} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Entry Time</span>
                  <span className="detail-value">
                    {format(new Date(vehicleData.entryTime), 'MMM dd, yyyy hh:mm a')}
                  </span>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-icon time">
                  <Clock size={20} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value">{billData.duration}</span>
                </div>
              </div>
            </div>

            <div className="bill-breakdown">
              <h4>Bill Breakdown</h4>
              <div className="bill-items">
                <div className="bill-row">
                  <span>Parking Charge ({Math.ceil(billData.durationMinutes / 60)} hr)</span>
                  <span>₹{billData.subtotal}</span>
                </div>
                {billData.isPeakHour && (
                  <div className="bill-row peak">
                    <span>Peak Hours Surcharge (included)</span>
                    <span></span>
                  </div>
                )}
                {(billData.discount || 0) > 0 && (
                  <div className="bill-row discount">
                    <span>{billData.discountReason || 'Discount'}</span>
                    <span>-₹{Math.round(billData.subtotal * billData.discount / 100)}</span>
                  </div>
                )}
                <div className="bill-row tax">
                  <span>GST (18%)</span>
                  <span>₹{billData.tax}</span>
                </div>
                <div className="bill-row total">
                  <span>Total Amount</span>
                  <span>₹{billData.estimatedTotal}</span>
                </div>
              </div>
            </div>

            <div className="payment-section">
              <h4>Select Payment Method</h4>
              <div className="payment-methods">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <div
                      key={method.id}
                      className={`payment-method ${paymentMethod === method.id ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod(method.id)}
                    >
                      <Icon size={24} />
                      <span>{method.label}</span>
                      {paymentMethod === method.id && (
                        <CheckCircle2 size={18} className="check-icon" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bill-actions">
              <button className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
              <button 
                className="btn btn-primary btn-lg"
                onClick={handleExit}
                disabled={loading || paying}
              >
                {loading || paying ? (
                  <span className="btn-loading">
                    <div className="spinner"></div>
                    {paymentMethod === 'online' ? 'Processing Payment...' : 'Processing...'}
                  </span>
                ) : (
                  <>
                    <Receipt size={20} />
                    Complete Exit (₹{Number(billData.estimatedTotal || 0).toFixed(2)})
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Success */}
        {step === 3 && exitResult && (
          <motion.div
            key="step3"
            className="exit-card success-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="success-icon">
              <CheckCircle2 size={48} />
            </div>
            <h2>Exit Completed!</h2>
            <p>Payment received and vehicle exit processed successfully</p>

            <div className="receipt-card">
              <div className="receipt-header">
                <Receipt size={24} />
                <span>Payment Receipt</span>
              </div>
              <div className="receipt-body">
                <div className="receipt-row">
                  <span>Transaction ID</span>
                  <span className="mono">{exitResult.transactionId || 'TXN-' + Date.now()}</span>
                </div>
                <div className="receipt-row">
                  <span>Vehicle Number</span>
                  <span className="mono">{exitResult.vehicleId}</span>
                </div>
                <div className="receipt-row">
                  <span>Duration</span>
                  <span>{exitResult.receipt?.duration || exitResult.duration}</span>
                </div>
                <div className="receipt-row">
                  <span>Payment Method</span>
                  <span className="capitalize">{paymentMethod}</span>
                </div>
                <div className="receipt-row total">
                  <span>Amount Paid</span>
                  <span className="amount">₹{exitResult.receipt?.totalAmount || exitResult.totalAmount}</span>
                </div>
              </div>
              <div className="receipt-footer">
                <span>Thank you for parking with ParkEase!</span>
              </div>
            </div>

            <div className="success-actions">
              <button className="btn btn-primary" onClick={resetForm}>
                Process Another Exit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExitVehicle;
