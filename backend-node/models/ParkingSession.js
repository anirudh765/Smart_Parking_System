const mongoose = require('mongoose');

const ParkingSessionSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    default: null
  },
  vehicleId: {
    type: String,
    required: true,
    uppercase: true
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['car', 'bike', 'truck', 'electric']
  },
  slot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSlot',
    required: true
  },
  slotNumber: {
    type: Number,
    required: true
  },
  slotCode: {
    type: String,
    required: true
  },
  entryTime: {
    type: Date,
    default: Date.now
  },
  exitTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  baseRate: {
    type: Number,
    required: true
  },
  appliedRate: {
    type: Number,
    required: true
  },
  isPeakHour: {
    type: Boolean,
    default: false
  },
  peakHourMultiplier: {
    type: Number,
    default: 1
  },
  subtotal: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  discountReason: {
    type: String,
    default: null
  },
  tax: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'wallet', 'membership'],
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  },
  attendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null
  },
  notes: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
ParkingSessionSchema.index({ vehicleId: 1 });
ParkingSessionSchema.index({ status: 1 });
ParkingSessionSchema.index({ entryTime: -1 });

// Calculate bill before saving
ParkingSessionSchema.methods.calculateBill = function() {
  if (!this.exitTime) {
    this.exitTime = new Date();
  }
  
  // Calculate duration in minutes
  const durationMs = this.exitTime - this.entryTime;
  this.duration = Math.ceil(durationMs / (1000 * 60));
  
  // Calculate subtotal (rate per hour, charged per minute)
  const hours = this.duration / 60;
  this.subtotal = Math.ceil(hours * this.appliedRate * 100) / 100;
  
  // Apply discount
  const discountAmount = (this.subtotal * this.discount) / 100;
  
  // Calculate tax (18% GST)
  const taxableAmount = this.subtotal - discountAmount;
  this.tax = Math.ceil(taxableAmount * 0.18 * 100) / 100;
  
  // Total
  this.totalAmount = Math.ceil((taxableAmount + this.tax) * 100) / 100;
  
  return this.totalAmount;
};

module.exports = mongoose.model('ParkingSession', ParkingSessionSchema);
