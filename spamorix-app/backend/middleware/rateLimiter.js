// ============================================
// middleware/rateLimiter.js
// Rate Limiting — Prevent abuse & brute force
// ============================================

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// -----------------------------------------------
// GENERAL API RATE LIMITER
// Applied to all API routes
// -----------------------------------------------
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Max 100 requests per window
  message: {
    success: false,
    error: 'Too many requests. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,   // Return rate limit info in headers
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded: IP ${req.ip} on ${req.path}`);
    res.status(429).json(options.message);
  },
});

// -----------------------------------------------
// STRICT AUTH LIMITER
// For login routes — prevent brute force
// -----------------------------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // Only 10 login attempts per 15 min
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT',
  },
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded: IP ${req.ip}`);
    res.status(429).json(options.message);
  },
});

// -----------------------------------------------
// SCAN LIMITER
// For message scanning (heavy operation)
// -----------------------------------------------
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 30,              // 30 scans per minute
  message: {
    success: false,
    error: 'Too many scan requests. Please slow down.',
    code: 'SCAN_RATE_LIMIT',
  },
});

module.exports = { generalLimiter, authLimiter, scanLimiter };
