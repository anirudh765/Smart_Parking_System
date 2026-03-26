const Vehicle = require('../models/Vehicle');
const ParkingSlot = require('../models/ParkingSlot');
const ParkingSession = require('../models/ParkingSession');
const Transaction = require('../models/Transaction');
const { slotAllocationService } = require('../services/slotAllocation');
const { pricingService } = require('../services/pricing');

// @desc    Park a vehicle (add vehicle to parking)
// @route   POST /api/vehicles/park
// @access  Public
exports.parkVehicle = async (req, res, next) => {
  try {
    const { vehicleId, ownerName, ownerPhone } = req.body;
    const type = req.body.type || req.body.vehicleType;

    if (!vehicleId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID and type are required'
      });
    }

    const vehicleType = type.toLowerCase();

    // Check if vehicle is already parked
    const existingSession = await ParkingSession.findOne({
      vehicleId: vehicleId.toUpperCase(),
      status: 'active'
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle is already parked',
        data: {
          slotCode: existingSession.slotCode,
          entryTime: existingSession.entryTime
        }
      });
    }

    // Get nearest available slot using priority queue
    const nearestSlot = slotAllocationService.getNearestSlot(vehicleType);

    if (!nearestSlot) {
      return res.status(400).json({
        success: false,
        message: `No available ${vehicleType} parking slots`
      });
    }

    // Get slot details
    const slot = await ParkingSlot.findById(nearestSlot.slotId);

    if (!slot || slot.status !== 'available') {
      // Reinitialize queue and try again
      await slotAllocationService.initialize(ParkingSlot);
      return res.status(400).json({
        success: false,
        message: 'Slot allocation error. Please try again.'
      });
    }

    // Calculate pricing
    const pricing = pricingService.calculateAppliedRate(vehicleType, slot);

    // Create or update vehicle record
    let vehicle = await Vehicle.findOne({ vehicleId: vehicleId.toUpperCase() });
    if (!vehicle) {
      vehicle = await Vehicle.create({
        vehicleId: vehicleId.toUpperCase(),
        type: vehicleType,
        ownerName,
        ownerPhone
      });
    }

    // Create parking session
    const session = await ParkingSession.create({
      vehicle: vehicle._id,
      vehicleId: vehicleId.toUpperCase(),
      vehicleType,
      slot: slot._id,
      slotNumber: slot.slotNumber,
      slotCode: slot.slotCode,
      baseRate: pricing.baseRate,
      appliedRate: pricing.appliedRate,
      isPeakHour: pricing.isPeakHour,
      peakHourMultiplier: pricing.multiplier,
      attendedBy: req.user ? req.user._id : null
    });

    // Update slot status
    slot.status = 'occupied';
    slot.currentVehicle = session._id;
    slot.lastOccupiedAt = new Date();
    await slot.save();

    // Update vehicle record
    vehicle.totalParkings += 1;
    vehicle.lastParkedAt = new Date();
    await vehicle.save();

    res.status(201).json({
      success: true,
      message: 'Vehicle parked successfully',
      data: {
        session: {
          id: session._id,
          vehicleId: session.vehicleId,
          vehicleType: session.vehicleType,
          slotNumber: session.slotNumber,
          slotCode: session.slotCode,
          entryTime: session.entryTime,
          baseRate: session.baseRate,
          appliedRate: session.appliedRate,
          isPeakHour: session.isPeakHour
        },
        slot: {
          id: slot._id,
          slotCode: slot.slotCode,
          floor: slot.floor,
          zone: slot.zone,
          distanceToGate: slot.distanceToGate
        },
        pricing: pricing.factors
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove vehicle from parking
// @route   POST /api/vehicles/exit
// @access  Public
exports.exitVehicle = async (req, res, next) => {
  try {
    const { vehicleId, paymentMethod = 'cash' } = req.body;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID is required'
      });
    }

    // Find active session
    const session = await ParkingSession.findOne({
      vehicleId: vehicleId.toUpperCase(),
      status: 'active'
    }).populate('slot');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No active parking session found for this vehicle'
      });
    }

    // Get user for discounts
    let user = null;
    const vehicle = await Vehicle.findOne({ vehicleId: vehicleId.toUpperCase() }).populate('owner');
    if (vehicle && vehicle.owner) {
      user = vehicle.owner;
    }

    // Calculate bill
    session.exitTime = new Date();
    const billDetails = pricingService.calculateBill(session, user);

    // Update session
    session.status = 'completed';
    session.duration = billDetails.durationMinutes;
    session.subtotal = billDetails.subtotal;
    session.discount = billDetails.discountPercent;
    session.discountReason = billDetails.discountReason;
    session.tax = billDetails.tax;
    session.totalAmount = billDetails.totalAmount;
    session.isPaid = true;
    session.paymentMethod = paymentMethod;
    session.paidAt = new Date();
    await session.save();

    // Free up the slot
    const slot = session.slot;
    slot.status = 'available';
    slot.currentVehicle = null;
    slot.totalEarnings += billDetails.totalAmount;
    slot.totalUsageMinutes += billDetails.durationMinutes;
    await slot.save();

    // Return slot to priority queue
    slotAllocationService.returnSlot(
      slot.type,
      slot._id.toString(),
      slot.slotNumber,
      slot.distanceToGate
    );

    // Update vehicle stats
    if (vehicle) {
      vehicle.totalAmountPaid += billDetails.totalAmount;
      await vehicle.save();
    }

    // Update user stats and loyalty points
    if (user) {
      user.totalVisits += 1;
      user.totalSpent += billDetails.totalAmount;
      user.loyaltyPoints += Math.floor(billDetails.totalAmount / 10); // 1 point per ₹10
      await user.save();
    }

    // Create transaction record
    const transaction = await Transaction.create({
      type: 'parking',
      parkingSession: session._id,
      user: user ? user._id : null,
      vehicleId: session.vehicleId,
      amount: billDetails.subtotal,
      tax: billDetails.tax,
      discount: billDetails.discountAmount || 0,
      totalAmount: billDetails.totalAmount,
      paymentMethod,
      paymentStatus: 'completed',
      processedBy: req.user ? req.user._id : null
    });

    res.status(200).json({
      success: true,
      message: 'Vehicle exit successful',
      data: {
        receipt: {
          transactionId: transaction.transactionId,
          vehicleId: session.vehicleId,
          vehicleType: session.vehicleType,
          slotCode: session.slotCode,
          entryTime: session.entryTime,
          exitTime: session.exitTime,
          duration: billDetails.durationFormatted,
          durationMinutes: billDetails.durationMinutes,
          baseRate: billDetails.baseRate,
          appliedRate: billDetails.appliedRate,
          isPeakHour: billDetails.isPeakHour,
          subtotal: billDetails.subtotal,
          discount: billDetails.discountPercent,
          discountReason: billDetails.discountReason,
          discountAmount: billDetails.discountAmount,
          tax: billDetails.tax,
          totalAmount: billDetails.totalAmount,
          paymentMethod,
          paidAt: session.paidAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lookup vehicle location
// @route   GET /api/vehicles/lookup/:vehicleId
// @access  Public
exports.lookupVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;

    // Find active session
    const session = await ParkingSession.findOne({
      vehicleId: vehicleId.toUpperCase(),
      status: 'active'
    }).populate('slot', 'slotCode floor zone distanceToGate isVIP isCovered hasCharger');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found in parking'
      });
    }

    // Calculate current charges
    const currentTime = new Date();
    const durationMs = currentTime - session.entryTime;
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));
    const durationHours = durationMinutes / 60;
    const currentCharges = Math.ceil(durationHours * session.appliedRate * 100) / 100;

    res.status(200).json({
      success: true,
      data: {
        vehicleId: session.vehicleId,
        vehicleType: session.vehicleType,
        slot: {
          code: session.slot.slotCode,
          number: session.slotNumber,
          floor: session.slot.floor,
          zone: session.slot.zone,
          distanceToGate: session.slot.distanceToGate,
          isVIP: session.slot.isVIP,
          isCovered: session.slot.isCovered,
          hasCharger: session.slot.hasCharger
        },
        entryTime: session.entryTime,
        duration: pricingService.formatDuration(durationMinutes),
        durationMinutes,
        ratePerHour: session.appliedRate,
        currentCharges,
        isPeakHour: session.isPeakHour
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current bill for vehicle
// @route   GET /api/vehicles/bill/:vehicleId
// @access  Public
exports.getVehicleBill = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;

    const session = await ParkingSession.findOne({
      vehicleId: vehicleId.toUpperCase(),
      status: 'active'
    }).populate('slot');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found in parking'
      });
    }

    // Get user for discounts
    let user = null;
    const vehicle = await Vehicle.findOne({ vehicleId: vehicleId.toUpperCase() }).populate('owner');
    if (vehicle && vehicle.owner) {
      user = vehicle.owner;
    }

    // Calculate bill
    const tempSession = { ...session.toObject(), exitTime: new Date() };
    const billDetails = pricingService.calculateBill(tempSession, user);

    res.status(200).json({
      success: true,
      data: {
        vehicleId: session.vehicleId,
        vehicleType: session.vehicleType,
        slotCode: session.slotCode,
        entryTime: session.entryTime,
        currentTime: new Date(),
        duration: billDetails.durationFormatted,
        durationMinutes: billDetails.durationMinutes,
        baseRate: billDetails.baseRate,
        appliedRate: billDetails.appliedRate,
        isPeakHour: billDetails.isPeakHour,
        subtotal: billDetails.subtotal,
        discount: billDetails.discountPercent,
        discountReason: billDetails.discountReason,
        tax: billDetails.tax,
        estimatedTotal: billDetails.totalAmount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all parked vehicles
// @route   GET /api/vehicles/parked
// @access  Private
exports.getParkedVehicles = async (req, res, next) => {
  try {
    const { type, sortBy = 'entryTime', order = 'desc' } = req.query;

    let query = { status: 'active' };
    if (type) query.vehicleType = type.toLowerCase();

    const sortOrder = order === 'asc' ? 1 : -1;

    const sessions = await ParkingSession.find(query)
      .populate('slot', 'slotCode floor zone')
      .sort({ [sortBy]: sortOrder });

    // Add current duration and charges
    const currentTime = new Date();
    const enrichedSessions = sessions.map(session => {
      const durationMs = currentTime - session.entryTime;
      const durationMinutes = Math.ceil(durationMs / (1000 * 60));
      const durationHours = durationMinutes / 60;
      const currentCharges = Math.ceil(durationHours * session.appliedRate * 100) / 100;

      return {
        id: session._id,
        vehicleId: session.vehicleId,
        vehicleType: session.vehicleType,
        slotCode: session.slotCode,
        floor: session.slot?.floor,
        zone: session.slot?.zone,
        entryTime: session.entryTime,
        duration: pricingService.formatDuration(durationMinutes),
        durationMinutes,
        ratePerHour: session.appliedRate,
        currentCharges,
        isPeakHour: session.isPeakHour
      };
    });

    res.status(200).json({
      success: true,
      count: enrichedSessions.length,
      data: enrichedSessions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vehicle history
// @route   GET /api/vehicles/:vehicleId/history
// @access  Private
exports.getVehicleHistory = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { limit = 10 } = req.query;

    const sessions = await ParkingSession.find({
      vehicleId: vehicleId.toUpperCase(),
      status: 'completed'
    })
      .sort({ exitTime: -1 })
      .limit(parseInt(limit))
      .select('slotCode entryTime exitTime duration totalAmount paymentMethod');

    const vehicle = await Vehicle.findOne({ vehicleId: vehicleId.toUpperCase() });

    res.status(200).json({
      success: true,
      data: {
        vehicle: vehicle ? {
          vehicleId: vehicle.vehicleId,
          type: vehicle.type,
          totalParkings: vehicle.totalParkings,
          totalAmountPaid: vehicle.totalAmountPaid,
          lastParkedAt: vehicle.lastParkedAt
        } : null,
        history: sessions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search vehicles
// @route   GET /api/vehicles/search
// @access  Private
exports.searchVehicles = async (req, res, next) => {
  try {
    const { q, type, status } = req.query;

    let query = {};

    if (q) {
      query.vehicleId = { $regex: q.toUpperCase(), $options: 'i' };
    }

    if (type) {
      query.vehicleType = type.toLowerCase();
    }

    if (status) {
      query.status = status;
    } else {
      query.status = 'active';
    }

    const sessions = await ParkingSession.find(query)
      .populate('slot', 'slotCode floor zone')
      .sort({ entryTime: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
};
