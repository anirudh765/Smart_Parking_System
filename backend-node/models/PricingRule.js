const mongoose = require('mongoose');

const PricingRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  vehicleType: {
    type: String,
    enum: ['car', 'bike', 'truck', 'electric', 'all'],
    default: 'all'
  },
  baseRatePerHour: {
    type: Number,
    required: true
  },
  // Peak hour settings
  peakHourEnabled: {
    type: Boolean,
    default: true
  },
  peakHours: [{
    startHour: { type: Number, min: 0, max: 23 },
    endHour: { type: Number, min: 0, max: 23 }
  }],
  peakHourMultiplier: {
    type: Number,
    default: 1.5
  },
  // Weekend settings
  weekendPricingEnabled: {
    type: Boolean,
    default: false
  },
  weekendMultiplier: {
    type: Number,
    default: 1.2
  },
  // Special slot multipliers
  vipMultiplier: {
    type: Number,
    default: 1.5
  },
  coveredMultiplier: {
    type: Number,
    default: 1.2
  },
  chargerMultiplier: {
    type: Number,
    default: 1.3
  },
  // Minimum and maximum
  minimumCharge: {
    type: Number,
    default: 20
  },
  maximumDailyCharge: {
    type: Number,
    default: 500
  },
  // Tax
  taxPercentage: {
    type: Number,
    default: 18
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PricingRule', PricingRuleSchema);
