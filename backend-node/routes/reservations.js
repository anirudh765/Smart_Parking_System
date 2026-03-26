const express = require('express');
const router = express.Router();
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const {
  createReservation,
  getReservations,
  getReservation,
  cancelReservation,
  checkInReservation,
  getTodayReservations
} = require('../controllers/reservationController');

// Public routes
router.post('/', optionalAuth, createReservation);
router.get('/:id', getReservation);
router.put('/:id/cancel', cancelReservation);

// Protected routes
router.get('/', protect, getReservations);
router.get('/list/today', protect, getTodayReservations);
router.post('/:id/checkin', protect, authorize('admin', 'operator'), checkInReservation);

module.exports = router;
