// ============================================
// middleware/validate.js
// Input Validation Middleware
// ============================================

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

// -----------------------------------------------
// VALIDATION HANDLER
// Checks if express-validator found any errors
// Use this AFTER your validation rules
// -----------------------------------------------
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors into a clean array
    const formattedErrors = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    logger.warn(`Validation failed on ${req.path}: ${JSON.stringify(formattedErrors)}`);

    return res.status(400).json({
      success: false,
      error: 'Validation failed. Please check your input.',
      details: formattedErrors,
    });
  }

  next();
};

// -----------------------------------------------
// ERROR HANDLER MIDDLEWARE
// Catches unhandled errors from async route handlers
// -----------------------------------------------
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// -----------------------------------------------
// GLOBAL ERROR HANDLER
// Place this last in server.js middleware chain
// -----------------------------------------------
const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `An account with this ${field} already exists.`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format.`;
  }

  // Log the error
  logger.error(`${statusCode} — ${message} | Route: ${req.method} ${req.path}`);
  if (statusCode === 500) {
    logger.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { validate, asyncHandler, globalErrorHandler };
