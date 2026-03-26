const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    required: [true, 'Vehicle ID/License plate is required'],
    uppercase: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    required: [true, 'Vehicle type is required'],
    enum: ['car', 'bike', 'truck', 'electric'],
    lowercase: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ownerName: {
    type: String,
    trim: true
  },
  ownerPhone: {
    type: String
  },
  make: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  isRegistered: {
    type: Boolean,
    default: false
  },
  totalParkings: {
    type: Number,
    default: 0
  },
  totalAmountPaid: {
    type: Number,
    default: 0
  },
  lastParkedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for faster lookups
VehicleSchema.index({ vehicleId: 1, type: 1 });

module.exports = mongoose.model('Vehicle', VehicleSchema);
