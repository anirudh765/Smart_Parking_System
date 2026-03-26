const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { createOrder, verifyPayment } = require('../controllers/paymentController');

// Create Razorpay order
router.post('/order', optionalAuth, createOrder);

// Verify Razorpay payment
router.post('/verify', optionalAuth, verifyPayment);

module.exports = router;
