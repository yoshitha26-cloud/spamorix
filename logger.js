// ============================================
// utils/logger.js
// Winston-based logging system
// Logs to console AND to files in /logs folder
// ============================================

const winston = require('winston');
const path = require('path');

// Define log format — includes timestamp, level, and message
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),       // Show stack traces
  winston.format.colorize({ all: true }),       // Colorize console output
  winston.format.printf(({ timestamp, level, message, stack }) => {
    // If there's a stack trace (from an error), show it
    return stack
      ? `[${timestamp}] ${level}: ${message}\n${stack}`
      : `[${timestamp}] ${level}: ${message}`;
  })
);

// File format (no colors for file output)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()  // JSON format for easy parsing
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Console transport — shows logs in terminal
    new winston.transports.Console({
      format: logFormat,
    }),
    // File transport — saves ALL logs
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      format: fileFormat,
      maxsize: 5242880,  // 5MB max file size
      maxFiles: 5,       // Keep last 5 log files
    }),
    // Separate file just for errors
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

module.exports = logger;
