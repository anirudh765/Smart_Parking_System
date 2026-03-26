const express = require('express');
const router = express.Router();
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const {
  parkVehicle,
  exitVehicle,
  lookupVehicle,
  getVehicleBill,
  getParkedVehicles,
  getVehicleHistory,
  searchVehicles
} = require('../controllers/vehicleController');

// Public routes
router.post('/park', optionalAuth, parkVehicle);
router.post('/exit', optionalAuth, exitVehicle);
router.get('/lookup/:vehicleId', lookupVehicle);
router.get('/bill/:vehicleId', getVehicleBill);

// Protected routes
router.get('/parked', protect, getParkedVehicles);
router.get('/search', protect, searchVehicles);
router.get('/:vehicleId/history', protect, getVehicleHistory);

module.exports = router;
