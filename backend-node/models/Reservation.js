const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    lowercase: true
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
  reservationDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  expectedDuration: {
    type: Number, // in hours
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired', 'no-show'],
    default: 'pending'
  },
  reservationFee: {
    type: Number,
    default: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  },
  parkingSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSession',
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
ReservationSchema.index({ vehicleId: 1 });
ReservationSchema.index({ status: 1 });
ReservationSchema.index({ reservationDate: 1 });
ReservationSchema.index({ startTime: 1, endTime: 1 });

module.exports = mongoose.model('Reservation', ReservationSchema);
