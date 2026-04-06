const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { USER_COOKIE_NAME, setUserSessionCookie } = require('../utils/userSessionCookie');

const issueUserCookie = (res, user) => {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '5m'
  });
  setUserSessionCookie(res, token);
};

// Protect routes
exports.protect = async (req, res, next) => {
  let token;
  let tokenSource = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    tokenSource = 'header';
  }

  if (!token && req.cookies && req.cookies[USER_COOKIE_NAME]) {
    token = req.cookies[USER_COOKIE_NAME];
    tokenSource = 'cookie';
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    if (tokenSource === 'cookie' && req.user.role === 'user') {
      issueUserCookie(res, req.user);
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Optional auth - doesn't fail if no token
exports.optionalAuth = async (req, res, next) => {
  let token;
  let tokenSource = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    tokenSource = 'header';
  }

  if (!token && req.cookies && req.cookies[USER_COOKIE_NAME]) {
    token = req.cookies[USER_COOKIE_NAME];
    tokenSource = 'cookie';
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
      if (tokenSource === 'cookie' && req.user && req.user.role === 'user') {
        issueUserCookie(res, req.user);
      }
    } catch (err) {
      // Token invalid, but continue without user
    }
  }

  next();
};
