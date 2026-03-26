const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

const {
  getDashboardStats,
  getRevenueAnalytics,
  getOccupancyAnalytics,
  getParkingHistory,
  exportData
} = require('../controllers/analyticsController');

// All routes are protected
router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/revenue', authorize('admin', 'operator'), getRevenueAnalytics);
router.get('/occupancy', authorize('admin', 'operator'), getOccupancyAnalytics);
router.get('/history', getParkingHistory);
router.get('/export', authorize('admin'), exportData);

module.exports = router;