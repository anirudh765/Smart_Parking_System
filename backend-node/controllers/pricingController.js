const { pricingService } = require('../services/pricing');

// @desc    Get pricing information
// @route   GET /api/pricing
// @access  Public
exports.getPricing = async (req, res) => {
  res.status(200).json({
    success: true,
    data: pricingService.getPricingSummary()
  });
};

// @desc    Calculate estimated price
// @route   POST /api/pricing/estimate
// @access  Public
exports.getEstimate = async (req, res) => {
  const { vehicleType, hours = 1 } = req.body;

  if (!vehicleType) {
    return res.status(400).json({
      success: false,
      message: 'Vehicle type is required'
    });
  }

  const pricing = pricingService.calculateAppliedRate(vehicleType);
  const estimatedCost = Math.ceil(hours * pricing.appliedRate * 1.18 * 100) / 100; // Including 18% tax

  res.status(200).json({
    success: true,
    data: {
      vehicleType,
      hours,
      baseRate: pricing.baseRate,
      appliedRate: pricing.appliedRate,
      isPeakHour: pricing.isPeakHour,
      isWeekend: pricing.isWeekend,
      factors: pricing.factors,
      estimatedCost,
      note: 'Estimate includes 18% GST. Final amount may vary based on actual duration.'
    }
  });
};
