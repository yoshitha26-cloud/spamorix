// ============================================
// routes/auth.js
// Authentication Routes
// ============================================

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { login, getMe, logout, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

// ----- Validation Rules -----
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[\d\s\-()]{7,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Name too long (max 50 characters)'),
];

// ----- Routes -----

/**
 * @route   POST /api/auth/login
 * @desc    Login / Register with email + phone
 * @access  Public
 */
router.post('/login', authLimiter, loginValidation, validate, login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private (requires JWT)
 */
router.get('/me', protect, getMe);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout (client should clear token)
 * @access  Private
 */
router.post('/logout', protect, logout);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  protect,
  [
    body('name').optional().trim().isLength({ max: 50 }),
    body('preferredLanguage')
      .optional()
      .isIn(['en', 'hi', 'te', 'ta', 'kn', 'mr'])
      .withMessage('Invalid language code'),
  ],
  validate,
  updateProfile
);

module.exports = router;
