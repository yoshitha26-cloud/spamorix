// ============================================
// config/database.js
// MongoDB connection setup using Mongoose
// ============================================

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
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

  } catch (error) {
    logger.error(`❌ MongoDB Connection Failed: ${error.message}`);
    // Exit process with failure code if we can't connect
    process.exit(1);
  }
};

module.exports = connectDB;
