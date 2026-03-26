const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'operator', 'admin'],
    default: 'user'
  },
  phone: {
    type: String,
    match: [/^[0-9]{10}$/, 'Invalid phone number']
  },
  avatar: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  membershipType: {
    type: String,
    enum: ['regular', 'silver', 'gold', 'platinum'],
    default: 'regular'
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  totalVisits: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Encrypt password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT token
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Calculate membership discount
UserSchema.methods.getMembershipDiscount = function() {
  const discounts = {
    regular: 0,
    silver: 5,
    gold: 10,
    platinum: 15
  };
  return discounts[this.membershipType] || 0;
};

module.exports = mongoose.model('User', UserSchema);
