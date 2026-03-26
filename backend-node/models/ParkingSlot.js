const mongoose = require('mongoose');

const ParkingSlotSchema = new mongoose.Schema({
  slotNumber: {
    type: Number,
    required: true,
    unique: true
  },
  slotCode: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ['car', 'bike', 'truck', 'electric'],
    lowercase: true
  },
  floor: {
    type: Number,
    default: 1
  },
  zone: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E', 'F'],
    default: 'A'
  },
  distanceToGate: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance'],
    default: 'available'
  },
  isHandicapped: {
    type: Boolean,
    default: false
  },
  isVIP: {
    type: Boolean,
    default: false
  },
  hasCharger: {
    type: Boolean,
    default: false
  },
  isCovered: {
    type: Boolean,
    default: false
  },
  currentVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSession',
    default: null
  },
  reservedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null
  },
  baseRate: {
    type: Number,
    required: true
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalUsageMinutes: {
    type: Number,
    default: 0
  },
  lastOccupiedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries
ParkingSlotSchema.index({ type: 1, status: 1 });
ParkingSlotSchema.index({ status: 1, distanceToGate: 1 });

module.exports = mongoose.model('ParkingSlot', ParkingSlotSchema);
