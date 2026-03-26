const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create Razorpay order
// @route   POST /api/payments/order
// @access  Public (optional auth via middleware)
exports.createOrder = async (req, res, next) => {
  try {
    const { amount, currency = 'INR', meta = {} } = req.body;

    const numericAmount = Number(amount);

    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required to create order',
      });
    }

    const amountInPaise = Math.round(numericAmount * 100);

    const options = {
      amount: amountInPaise,
      currency,
      payment_capture: 1,
      notes: {
        ...meta,
      },
    };

    const order = await razorpay.orders.create(options);

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
    });
  }
};

// @desc    Verify Razorpay payment signature
// @route   POST /api/payments/verify
// @access  Public (optional auth via middleware)
exports.verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing Razorpay payment details',
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    // At this point, the payment is verified.
    // We intentionally do not create a separate Transaction here
    // because the existing exitVehicle flow already records transactions.

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        razorpay_order_id,
        razorpay_payment_id,
      },
    });
  } catch (error) {
    console.error('Razorpay payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
    });
  }
};