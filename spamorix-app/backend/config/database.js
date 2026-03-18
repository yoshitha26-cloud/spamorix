// ============================================
// config/database.js
// MongoDB connection setup using Mongoose
// ============================================

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  // Check if MONGO_URI is provided
  if (!process.env.MONGO_URI) {
    logger.warn('⚠️  MONGO_URI is not set. Database features will be unavailable.');
    logger.info('Set MONGO_URI environment variable to enable MongoDB connection.');
    return false;
  }

  try {
    // Mongoose connection options
    const options = {
      // Automatically try to reconnect when it loses connection
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(process.env.MONGO_URI, options);

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Listen for connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

    return true;

  } catch (error) {
    logger.error(`❌ MongoDB Connection Failed: ${error.message}`);
    logger.warn('⚠️  Server will continue without database. Features requiring DB will fail.');
    return false;
  }
};

module.exports = connectDB;
