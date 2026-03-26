const PricingRule = require('../models/PricingRule');

/**
 * Pricing Service
 * Handles dynamic pricing calculations including peak hours, weekend rates, and special slots
 */
class PricingService {
  constructor() {
    this.pricingRules = {};
    this.defaultRates = {
      car: 60,      // ₹60 per hour
      bike: 30,     // ₹30 per hour
      truck: 100,   // ₹100 per hour
      electric: 80  // ₹80 per hour
    };
  }

  // Load pricing rules from database
  async loadPricingRules() {
    try {
      const rules = await PricingRule.find({ isActive: true }).lean();
      rules.forEach(rule => {
        this.pricingRules[rule.vehicleType] = rule;
      });
      console.log('✅ Pricing rules loaded');
      return true;
    } catch (error) {
      console.error('❌ Failed to load pricing rules:', error);
      return false;
    }
  }

  // Check if current time is peak hour
  isPeakHour(date = new Date()) {
    const hour = date.getHours();
    
    // Default peak hours: 8-10 AM and 5-8 PM
    const peakHours = [
      { start: 8, end: 10 },
      { start: 17, end: 20 }
    ];

    return peakHours.some(peak => hour >= peak.start && hour < peak.end);
  }

  // Check if weekend
  isWeekend(date = new Date()) {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  // Get base rate for vehicle type
  getBaseRate(vehicleType) {
    const type = vehicleType.toLowerCase();
    const rule = this.pricingRules[type] || this.pricingRules['all'];
    
    if (rule) {
      return rule.baseRatePerHour;
    }
    
    return this.defaultRates[type] || this.defaultRates.car;
  }

  // Calculate applied rate with all multipliers
  calculateAppliedRate(vehicleType, slot = {}, date = new Date()) {
    let rate = this.getBaseRate(vehicleType);
    let multiplier = 1;
    const factors = [];

    // Peak hour multiplier
    if (this.isPeakHour(date)) {
      multiplier *= 1.5;
      factors.push({ name: 'Peak Hour', multiplier: 1.5 });
    }

    // Weekend multiplier
    if (this.isWeekend(date)) {
      multiplier *= 1.2;
      factors.push({ name: 'Weekend', multiplier: 1.2 });
    }

    // Special slot multipliers
    if (slot.isVIP) {
      multiplier *= 1.5;
      factors.push({ name: 'VIP Slot', multiplier: 1.5 });
    }

    if (slot.isCovered) {
      multiplier *= 1.2;
      factors.push({ name: 'Covered Parking', multiplier: 1.2 });
    }

    if (slot.hasCharger && vehicleType.toLowerCase() === 'electric') {
      multiplier *= 1.3;
      factors.push({ name: 'EV Charging', multiplier: 1.3 });
    }

    return {
      baseRate: rate,
      appliedRate: Math.round(rate * multiplier),
      multiplier,
      factors,
      isPeakHour: this.isPeakHour(date),
      isWeekend: this.isWeekend(date)
    };
  }

  // Calculate bill for parking session
  calculateBill(session, user = null) {
    const entryTime = new Date(session.entryTime);
    const exitTime = session.exitTime ? new Date(session.exitTime) : new Date();
    
    // Calculate duration in minutes
    const durationMs = exitTime - entryTime;
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));
    const durationHours = durationMinutes / 60;

    // Calculate subtotal — fall back through baseRate → default rate if appliedRate missing
    const effectiveRate = session.appliedRate || session.baseRate || this.getBaseRate(session.vehicleType || 'car');
    const subtotal = Math.ceil(durationHours * effectiveRate * 100) / 100;

    // Calculate discount
    let discountPercent = 0;
    let discountReason = null;

    if (user) {
      // Membership discount
      const membershipDiscount = user.getMembershipDiscount ? user.getMembershipDiscount() : 0;
      if (membershipDiscount > 0) {
        discountPercent = membershipDiscount;
        discountReason = `${user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1)} Membership`;
      }
    }

    // Long duration discount (more than 6 hours)
    if (durationHours >= 6 && discountPercent < 10) {
      discountPercent = 10;
      discountReason = 'Long Stay Discount';
    }

    const discountAmount = (subtotal * discountPercent) / 100;
    const taxableAmount = subtotal - discountAmount;
    
    // GST 18%
    const tax = Math.ceil(taxableAmount * 0.18 * 100) / 100;
    const totalAmount = Math.ceil((taxableAmount + tax) * 100) / 100;

    // Minimum charge — guard against NaN/0 from malformed sessions
    const minimumCharge = 20;
    const finalAmount = (!totalAmount || isNaN(totalAmount) || totalAmount <= 0)
      ? minimumCharge
      : Math.max(totalAmount, minimumCharge);

    return {
      entryTime,
      exitTime,
      durationMinutes,
      durationFormatted: this.formatDuration(durationMinutes),
      baseRate: session.baseRate || effectiveRate,
      appliedRate: effectiveRate,
      isPeakHour: session.isPeakHour,
      subtotal,
      discountPercent,
      discountAmount,
      discountReason,
      taxPercent: 18,
      tax,
      totalAmount: finalAmount
    };
  }

  // Format duration as readable string
  formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hr`;
    }
    return `${hours} hr ${mins} min`;
  }

  // Get pricing summary for display
  getPricingSummary() {
    return {
      vehicleRates: this.defaultRates,
      peakHours: [
        { label: 'Morning Rush', start: '8:00 AM', end: '10:00 AM', multiplier: 1.5 },
        { label: 'Evening Rush', start: '5:00 PM', end: '8:00 PM', multiplier: 1.5 }
      ],
      weekendMultiplier: 1.2,
      specialSlots: {
        vip: { label: 'VIP Parking', multiplier: 1.5 },
        covered: { label: 'Covered Parking', multiplier: 1.2 },
        charger: { label: 'EV Charging', multiplier: 1.3 }
      },
      taxPercent: 18,
      minimumCharge: 20
    };
  }
}

// Singleton instance
const pricingService = new PricingService();

module.exports = {
  PricingService,
  pricingService
};
