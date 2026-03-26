const ParkingSession = require('../models/ParkingSession');
const ParkingSlot = require('../models/ParkingSlot');
const Transaction = require('../models/Transaction');
const Vehicle = require('../models/Vehicle');
const Reservation = require('../models/Reservation');

// @desc    Get dashboard statistics
// @route   GET /api/analytics/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Current parking stats
    const activeSessionsCount = await ParkingSession.countDocuments({ status: 'active' });
    
    // Slot statistics
    const slotStats = await ParkingSlot.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const slotSummary = {
      total: 0,
      available: 0,
      occupied: 0,
      reserved: 0,
      maintenance: 0
    };

    slotStats.forEach(stat => {
      slotSummary[stat._id] = stat.count;
      slotSummary.total += stat.count;
    });

    slotSummary.occupancyRate = slotSummary.total > 0 
      ? Math.round((slotSummary.occupied / slotSummary.total) * 100) 
      : 0;

    // Today's revenue
    const todayRevenue = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Today's sessions
    const todaySessions = await ParkingSession.countDocuments({
      entryTime: { $gte: today, $lt: tomorrow }
    });

    // Today's completed sessions
    const todayCompleted = await ParkingSession.countDocuments({
      exitTime: { $gte: today, $lt: tomorrow },
      status: 'completed'
    });

    // Vehicle type distribution (currently parked)
    const vehicleTypeDistribution = await ParkingSession.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$vehicleType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Today's reservations
    const todayReservations = await Reservation.countDocuments({
      startTime: { $gte: today, $lt: tomorrow },
      status: { $in: ['pending', 'confirmed'] }
    });

    // Recent transactions
    const recentTransactions = await Transaction.find({ paymentStatus: 'completed' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('transactionId type totalAmount paymentMethod createdAt vehicleId');

    res.status(200).json({
      success: true,
      data: {
        currentStats: {
          activeVehicles: activeSessionsCount,
          availableSlots: slotSummary.available,
          occupancyRate: slotSummary.occupancyRate,
          todayReservations
        },
        slotSummary,
        todayStats: {
          revenue: todayRevenue[0]?.total || 0,
          transactions: todayRevenue[0]?.count || 0,
          vehiclesEntered: todaySessions,
          vehiclesExited: todayCompleted
        },
        vehicleTypeDistribution: vehicleTypeDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get revenue analytics
// @route   GET /api/analytics/revenue
// @access  Private (Admin)
exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const { period = '7days' } = req.query;

    let startDate;
    const endDate = new Date();
    
    switch (period) {
      case '7days':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Daily revenue
    const dailyRevenue = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Revenue by vehicle type
    const revenueByType = await ParkingSession.aggregate([
      {
        $match: {
          exitTime: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$vehicleType',
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Revenue by payment method
    const revenueByPayment = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Total revenue for period
    const totalRevenue = dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);
    const totalTransactions = dailyRevenue.reduce((sum, day) => sum + day.count, 0);

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        summary: {
          totalRevenue,
          totalTransactions,
          averageTransaction: totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0
        },
        dailyRevenue,
        revenueByType: revenueByType.reduce((acc, item) => {
          acc[item._id] = { revenue: item.revenue, count: item.count };
          return acc;
        }, {}),
        revenueByPayment: revenueByPayment.reduce((acc, item) => {
          acc[item._id] = { revenue: item.revenue, count: item.count };
          return acc;
        }, {})
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get occupancy analytics
// @route   GET /api/analytics/occupancy
// @access  Private
exports.getOccupancyAnalytics = async (req, res, next) => {
  try {
    // Hourly distribution of entries (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const hourlyDistribution = await ParkingSession.aggregate([
      {
        $match: {
          entryTime: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $hour: '$entryTime' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Average duration by vehicle type
    const avgDurationByType = await ParkingSession.aggregate([
      {
        $match: {
          status: 'completed',
          duration: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$vehicleType',
          avgDuration: { $avg: '$duration' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Peak hours analysis
    const peakHours = hourlyDistribution.sort((a, b) => b.count - a.count).slice(0, 5);

    // Slot utilization
    const slotUtilization = await ParkingSlot.aggregate([
      {
        $group: {
          _id: '$type',
          totalSlots: { $sum: 1 },
          totalEarnings: { $sum: '$totalEarnings' },
          totalMinutes: { $sum: '$totalUsageMinutes' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        hourlyDistribution: hourlyDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        peakHours: peakHours.map(h => ({
          hour: h._id,
          label: `${h._id}:00 - ${h._id + 1}:00`,
          entries: h.count
        })),
        avgDurationByType: avgDurationByType.reduce((acc, item) => {
          acc[item._id] = {
            avgMinutes: Math.round(item.avgDuration),
            sessions: item.count
          };
          return acc;
        }, {}),
        slotUtilization: slotUtilization.reduce((acc, item) => {
          acc[item._id] = {
            totalSlots: item.totalSlots,
            totalEarnings: item.totalEarnings,
            avgMinutesPerSlot: item.totalSlots > 0 ? Math.round(item.totalMinutes / item.totalSlots) : 0
          };
          return acc;
        }, {})
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get parking history
// @route   GET /api/analytics/history
// @access  Private
exports.getParkingHistory = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      vehicleType, 
      startDate, 
      endDate,
      status = 'completed'
    } = req.query;

    let query = { status };

    if (vehicleType) query.vehicleType = vehicleType.toLowerCase();

    if (startDate || endDate) {
      query.exitTime = {};
      if (startDate) query.exitTime.$gte = new Date(startDate);
      if (endDate) query.exitTime.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sessions = await ParkingSession.find(query)
      .sort({ exitTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('vehicleId vehicleType slotCode entryTime exitTime duration totalAmount paymentMethod');

    const total = await ParkingSession.countDocuments(query);

    res.status(200).json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: sessions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export data
// @route   GET /api/analytics/export
// @access  Private (Admin)
exports.exportData = async (req, res, next) => {
  try {
    const { type = 'transactions', startDate, endDate, format = 'json' } = req.query;

    let data;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    switch (type) {
      case 'transactions':
        data = await Transaction.find({
          createdAt: { $gte: start, $lte: end }
        }).sort({ createdAt: -1 });
        break;

      case 'sessions':
        data = await ParkingSession.find({
          entryTime: { $gte: start, $lte: end }
        }).sort({ entryTime: -1 });
        break;

      case 'vehicles':
        data = await Vehicle.find().sort({ totalParkings: -1 });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const headers = Object.keys(data[0]?.toObject() || {}).join(',');
      const rows = data.map(item => Object.values(item.toObject()).join(','));
      const csv = [headers, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_export.csv`);
      return res.send(csv);
    }

    res.status(200).json({
      success: true,
      exportType: type,
      dateRange: { start, end },
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};
