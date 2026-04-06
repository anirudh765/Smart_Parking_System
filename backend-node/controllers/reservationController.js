const Reservation = require('../models/Reservation');
const ParkingSlot = require('../models/ParkingSlot');
const ParkingSession = require('../models/ParkingSession');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

// @desc    Create reservation
// @route   POST /api/reservations
// @access  Public
exports.createReservation = async (req, res, next) => {
  try {
    let {
      customerName,
      customerPhone,
      customerEmail,
      vehicleId,
      vehicleType,
      reservationDate,
      startTime,
      expectedDuration
    } = req.body;

    customerName = customerName || req.body.ownerName;
    customerPhone = customerPhone || req.body.ownerPhone;
    customerEmail = customerEmail || req.body.ownerEmail;

    const normalizePhone = (value) => {
      if (!value) return null;
      const digits = value.toString().replace(/\D/g, '');
      return digits.length >= 10 ? digits.slice(-10) : null;
    };

    const normalizedPhone = normalizePhone(customerPhone);

    if (!customerEmail || !customerName || !customerPhone) {
      const lookupPhone = normalizedPhone || (req.user?.phone ? normalizePhone(req.user.phone) : null);
      if (lookupPhone) {
        const matchedUser = await User.findOne({ phone: lookupPhone }).select('name email phone');
        if (matchedUser) {
          customerEmail = customerEmail || matchedUser.email;
          customerName = customerName || matchedUser.name;
          customerPhone = customerPhone || matchedUser.phone;
        }
      }
    }

    if (normalizedPhone) {
      customerPhone = normalizedPhone;
    }

    // Validate required fields
    if (!customerName || !customerPhone || !vehicleId || !vehicleType || !startTime || !expectedDuration) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const type = vehicleType.toLowerCase();
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(startDateTime.getTime() + expectedDuration * 60 * 60 * 1000);

    // Check if date is in future
    if (startDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reservation time must be in the future'
      });
    }

    // Find available slot for reservation
    const availableSlot = await ParkingSlot.findOne({
      type,
      status: 'available'
    }).sort({ distanceToGate: 1 });

    if (!availableSlot) {
      return res.status(400).json({
        success: false,
        message: `No available ${type} slots for reservation`
      });
    }

    // Calculate reservation fee (10% of expected parking cost)
    const estimatedCost = expectedDuration * availableSlot.baseRate;
    const reservationFee = Math.ceil(estimatedCost * 0.1);

    // Create reservation
    const reservation = await Reservation.create({
      user: req.user ? req.user._id : null,
      customerName,
      customerPhone,
      customerEmail,
      vehicleId: vehicleId.toUpperCase(),
      vehicleType: type,
      slot: availableSlot._id,
      slotNumber: availableSlot.slotNumber,
      slotCode: availableSlot.slotCode,
      reservationDate: new Date(reservationDate || startDateTime),
      startTime: startDateTime,
      endTime: endDateTime,
      expectedDuration,
      reservationFee,
      status: 'confirmed',
      confirmedAt: new Date()
    });

    // Update slot status
    availableSlot.status = 'reserved';
    availableSlot.reservedBy = reservation._id;
    await availableSlot.save();

    notificationService
      .sendReservationCreated(reservation, availableSlot)
      .catch((error) => console.warn('Reservation email failed:', error.message || error));

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: {
        reservationId: reservation._id,
        vehicleId: reservation.vehicleId,
        slotCode: reservation.slotCode,
        floor: availableSlot.floor,
        zone: availableSlot.zone,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        expectedDuration,
        reservationFee,
        status: reservation.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reservations
// @route   GET /api/reservations
// @access  Private
exports.getReservations = async (req, res, next) => {
  try {
    const { status, date, vehicleType } = req.query;

    let query = {};

    if (status) query.status = status;
    if (vehicleType) query.vehicleType = vehicleType.toLowerCase();
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.startTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const reservations = await Reservation.find(query)
      .populate('slot', 'slotCode floor zone')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single reservation
// @route   GET /api/reservations/:id
// @access  Public
exports.getReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('slot', 'slotCode floor zone distanceToGate');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel reservation
// @route   PUT /api/reservations/:id/cancel
// @access  Public
exports.cancelReservation = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    if (['completed', 'cancelled'].includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel ${reservation.status} reservation`
      });
    }

    // Free up the slot
    const slot = await ParkingSlot.findById(reservation.slot);
    if (slot && slot.status === 'reserved') {
      slot.status = 'available';
      slot.reservedBy = null;
      await slot.save();
    }

    reservation.status = 'cancelled';
    reservation.cancelledAt = new Date();
    reservation.cancellationReason = reason || 'Cancelled by user';
    await reservation.save();

    notificationService
      .sendReservationCancelled(reservation, slot, reason)
      .catch((error) => console.warn('Reservation cancel email failed:', error.message || error));

    res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check-in reservation (convert to active parking)
// @route   POST /api/reservations/:id/checkin
// @access  Private
exports.checkInReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('slot');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    if (reservation.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot check-in ${reservation.status} reservation`
      });
    }

    const slot = reservation.slot;

    // Create parking session
    const session = await ParkingSession.create({
      vehicleId: reservation.vehicleId,
      vehicleType: reservation.vehicleType,
      slot: slot._id,
      slotNumber: slot.slotNumber,
      slotCode: slot.slotCode,
      baseRate: slot.baseRate,
      appliedRate: slot.baseRate,
      reservation: reservation._id,
      attendedBy: req.user ? req.user._id : null
    });

    // Update slot
    slot.status = 'occupied';
    slot.currentVehicle = session._id;
    slot.reservedBy = null;
    slot.lastOccupiedAt = new Date();
    await slot.save();

    // Update reservation
    reservation.status = 'active';
    reservation.parkingSession = session._id;
    await reservation.save();

    notificationService
      .sendReservationCheckedIn(reservation, slot, session._id)
      .catch((error) => console.warn('Reservation check-in email failed:', error.message || error));

    res.status(200).json({
      success: true,
      message: 'Check-in successful',
      data: {
        sessionId: session._id,
        vehicleId: session.vehicleId,
        slotCode: session.slotCode,
        entryTime: session.entryTime
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's reservations
// @route   GET /api/reservations/today
// @access  Private
exports.getTodayReservations = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reservations = await Reservation.find({
      startTime: { $gte: today, $lt: tomorrow },
      status: { $in: ['pending', 'confirmed'] }
    })
      .populate('slot', 'slotCode floor zone')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations
    });
  } catch (error) {
    next(error);
  }
};
