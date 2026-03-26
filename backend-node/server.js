require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const Razorpay = require('razorpay');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const { slotAllocationService } = require('./services/slotAllocation');
const { pricingService } = require('./services/pricing');
const ParkingSlot = require('./models/ParkingSlot');

// Route files
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const slotRoutes = require('./routes/slots');
const reservationRoutes = require('./routes/reservations');
const analyticsRoutes = require('./routes/analytics');
const pricingRoutes = require('./routes/pricing');
const paymentRoutes = require('./routes/payments');

const app = express();

// Connect to database
connectDB();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Compression
app.use(compression());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting (skipped for authenticated admin requests)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  skip: (req) => !!req.headers.authorization,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.use('/api/', limiter);

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/payments', paymentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Parking API is running',
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});

// API info
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Smart Parking Management System API',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      vehicles: '/api/vehicles',
      slots: '/api/slots',
      reservations: '/api/reservations',
      analytics: '/api/analytics',
      pricing: '/api/pricing'
    }
  });
});

// Error handler
app.use(errorHandler);

// Handle unhandled routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          🚗 SMART PARKING MANAGEMENT SYSTEM 🚗                ║
║                    Enterprise Edition v2.0                     ║
╠════════════════════════════════════════════════════════════════╣
║  Server running in ${process.env.NODE_ENV} mode on port ${PORT}║                   ║
║  API URL: http://localhost:${PORT}/api                         ║
╚════════════════════════════════════════════════════════════════╝
  `);

  // Initialize slot allocation service
  try {
    await slotAllocationService.initialize(ParkingSlot);
    await pricingService.loadPricingRules();
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`);
  process.exit(1);
});

module.exports = app;
