// ============================================
// utils/responseHelper.js
// Standardized API Response Helpers
// ============================================

/**
 * Send a success response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Human-readable message
 * @param {object} data - Response payload
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,
  });
};

/**
 * Send an error response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} code - Error code for frontend handling
 */
const sendError = (res, statusCode = 500, message = 'Internal Server Error', code = null) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(code && { code }),
  });
};

/**
 * Create a standard API error
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { sendSuccess, sendError, AppError };
