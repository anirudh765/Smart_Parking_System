const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true
  },
  type: {
    type: String,
    enum: ['parking', 'reservation', 'penalty', 'refund', 'membership'],
    required: true
  },
  parkingSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSession',
    default: null
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  vehicleId: {
    type: String,
    uppercase: true
  },
  amount: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'wallet', 'membership', 'online'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  receiptNumber: {
    type: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Generate transaction ID before saving
TransactionSchema.pre('save', async function(next) {
  if (!this.transactionId) {
    const date = new Date();
    const prefix = 'TXN';
    const timestamp = date.getTime().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.transactionId = `${prefix}${timestamp}${random}`;
  }
  next();
});

// Indexes
TransactionSchema.index({ transactionId: 1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ paymentStatus: 1 });
TransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
