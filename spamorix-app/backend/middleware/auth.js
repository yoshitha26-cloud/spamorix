// ============================================
// middleware/auth.js
// JWT Authentication Middleware
// ============================================
// This runs BEFORE protected route handlers.
// It checks if the request has a valid JWT token.
// ============================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// -----------------------------------------------
// PROTECT MIDDLEWARE — Verify JWT token
// Use this on any route that requires login
// -----------------------------------------------
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  // Expected format: "Authorization: Bearer <token>"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Also check cookies (alternative method)
  // if (req.cookies && req.cookies.token) {
  //   token = req.cookies.token;
  // }

  // If no token found, reject the request
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Please login first.',
      code: 'NO_TOKEN',
    });
  }

  try {
    // Verify the token using our secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user this token belongs to
    const user = await User.findById(decoded.id).select('-otp');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Token is valid but user no longer exists.',
        code: 'USER_NOT_FOUND',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Your account has been deactivated.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Attach user to the request object
    // Now req.user is available in all route handlers
    req.user = user;

    // Continue to the actual route handler
    next();

  } catch (error) {
    logger.warn(`JWT verification failed: ${error.message}`);

    // Different error messages based on what went wrong
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Please login again.',
        code: 'INVALID_TOKEN',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token has expired. Please login again.',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed.',
      code: 'AUTH_FAILED',
    });
  }
};

// -----------------------------------------------
// OPTIONAL AUTH — Attach user if token exists,
// but don't block if there's no token
// -----------------------------------------------
const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-otp');
    } catch (e) {
      // Ignore token errors for optional auth
    }
  }
  next();
};

module.exports = { protect, optionalAuth };
