const ParkingSlot = require('../models/ParkingSlot');
const ParkingSession = require('../models/ParkingSession');
const { slotAllocationService } = require('../services/slotAllocation');

// @desc    Get all parking slots
// @route   GET /api/slots
// @access  Public
exports.getSlots = async (req, res, next) => {
  try {
    const { type, status, floor, zone } = req.query;
    
    let query = {};
    if (type) query.type = type.toLowerCase();
    if (status) query.status = status;
    if (floor) query.floor = parseInt(floor);
    if (zone) query.zone = zone.toUpperCase();

    const slots = await ParkingSlot.find(query)
      .populate('currentVehicle', 'vehicleId vehicleType entryTime')
      .sort({ slotNumber: 1 });

    // Get summary counts
    const summary = {
      total: slots.length,
      available: slots.filter(s => s.status === 'available').length,
      occupied: slots.filter(s => s.status === 'occupied').length,
      reserved: slots.filter(s => s.status === 'reserved').length,
      maintenance: slots.filter(s => s.status === 'maintenance').length
    };

    res.status(200).json({
      success: true,
      count: slots.length,
      summary,
      data: slots
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single slot
// @route   GET /api/slots/:id
// @access  Public
exports.getSlot = async (req, res, next) => {
  try {
    const slot = await ParkingSlot.findById(req.params.id)
      .populate('currentVehicle');

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    res.status(200).json({
      success: true,
      data: slot
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get slot status summary by type
// @route   GET /api/slots/summary
// @access  Public
exports.getSlotsSummary = async (req, res, next) => {
  try {
    const summary = await ParkingSlot.aggregate([
      {
        $group: {
          _id: {
            type: '$type',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.type',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      }
    ]);

    // Format summary
    const formattedSummary = {};
    let totalSlots = 0;
    let totalAvailable = 0;
    let totalOccupied = 0;

    summary.forEach(item => {
      const typeData = {
        total: item.total,
        available: 0,
        occupied: 0,
        reserved: 0,
        maintenance: 0
      };

      item.statuses.forEach(s => {
        typeData[s.status] = s.count;
      });

      formattedSummary[item._id] = typeData;
      totalSlots += item.total;
      totalAvailable += typeData.available;
      totalOccupied += typeData.occupied;
    });

    res.status(200).json({
      success: true,
      data: {
        byType: formattedSummary,
        overall: {
          total: totalSlots,
          available: totalAvailable,
          occupied: totalOccupied,
          occupancyRate: totalSlots > 0 ? Math.round((totalOccupied / totalSlots) * 100) : 0
        },
        queueStatus: slotAllocationService.getAllAvailableCounts()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create parking slot
// @route   POST /api/slots
// @access  Private (Admin)
exports.createSlot = async (req, res, next) => {
  try {
    const slot = await ParkingSlot.create(req.body);

    // Add to allocation queue if available
    if (slot.status === 'available') {
      slotAllocationService.returnSlot(
        slot.type,
        slot._id.toString(),
        slot.slotNumber,
        slot.distanceToGate
      );
    }

    res.status(201).json({
      success: true,
      message: 'Slot created successfully',
      data: slot
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update parking slot
// @route   PUT /api/slots/:id
// @access  Private (Admin/Operator)
exports.updateSlot = async (req, res, next) => {
  try {
    let slot = await ParkingSlot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    slot = await ParkingSlot.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Slot updated successfully',
      data: slot
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set slot to maintenance
// @route   PUT /api/slots/:id/maintenance
// @access  Private (Admin/Operator)
exports.setMaintenance = async (req, res, next) => {
  try {
    const slot = await ParkingSlot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    if (slot.status === 'occupied') {
      return res.status(400).json({
        success: false,
        message: 'Cannot set occupied slot to maintenance'
      });
    }

    slot.status = 'maintenance';
    await slot.save();

    res.status(200).json({
      success: true,
      message: 'Slot set to maintenance',
      data: slot
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete parking slot
// @route   DELETE /api/slots/:id
// @access  Private (Admin)
exports.deleteSlot = async (req, res, next) => {
  try {
    const slot = await ParkingSlot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    if (slot.status === 'occupied') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete occupied slot'
      });
    }

    await slot.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Slot deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
