// ============================================
// controllers/authController.js
// Authentication Logic
// ============================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// -----------------------------------------------
// HELPER: Generate JWT Token
// -----------------------------------------------
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// -----------------------------------------------
// HELPER: Send token response
// -----------------------------------------------
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    message,
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    user: {
      id: user._id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      stats: user.stats,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt,
    },
  });
};

// -----------------------------------------------
// POST /api/auth/login
// Login with email + phone (no password)
// Returns JWT token
// -----------------------------------------------
const login = async (req, res, next) => {
  try {
    const { email, phone, name } = req.body;

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Try to find existing user with BOTH email and phone matching
    let user = await User.findOne({
      email: normalizedEmail,
      phone: phone.trim(),
    });

    if (user) {
      // Existing user — check if account is locked
      if (user.isLocked) {
        logger.warn(`Locked account login attempt: ${normalizedEmail}`);
        return res.status(403).json({
          success: false,
          error: 'Account temporarily locked due to multiple failed attempts. Try again in 1 hour.',
          code: 'ACCOUNT_LOCKED',
        });
      }

      // Update last login
      user.lastLogin = new Date();
      user.loginAttempts = 0;
      await user.save();

      logger.info(`User logged in: ${normalizedEmail}`);
      return sendTokenResponse(user, 200, res, 'Login successful! Welcome back to Spamorix.');
    }

    // Check if email exists with different phone
    const emailExists = await User.findOne({ email: normalizedEmail });
    if (emailExists) {
      await emailExists.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        error: 'Phone number does not match our records for this email.',
        code: 'CREDENTIALS_MISMATCH',
      });
    }

    // New user — create account automatically
    user = await User.create({
      email: normalizedEmail,
      phone: phone.trim(),
      name: name || normalizedEmail.split('@')[0],
      lastLogin: new Date(),
    });

    logger.info(`New user registered: ${normalizedEmail}`);
    return sendTokenResponse(user, 201, res, 'Welcome to Spamorix! Your account has been created.');

  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------
// GET /api/auth/me
// Get current logged-in user's profile
// Protected route
// -----------------------------------------------
const getMe = async (req, res, next) => {
  try {
    // req.user is set by the protect middleware
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------
// POST /api/auth/logout
// Client-side logout (clear token on frontend)
// -----------------------------------------------
const logout = async (req, res) => {
  // JWT is stateless — actual logout happens on the client
  // by removing the token from localStorage
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please remove your token on the client side.',
  });
};

// -----------------------------------------------
// PUT /api/auth/update-profile
// Update user preferences
// -----------------------------------------------
const updateProfile = async (req, res, next) => {
  try {
    const { name, preferredLanguage } = req.body;

    const allowedFields = {};
    if (name) allowedFields.name = name;
    if (preferredLanguage) allowedFields.preferredLanguage = preferredLanguage;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      allowedFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, getMe, logout, updateProfile };
