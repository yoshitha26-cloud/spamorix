// ============================================
// server.js
// Main Entry Point — Spamorix Backend
// ============================================
// Start with: node server.js (or npm run dev)
// ============================================

// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { generalLimiter } = require('./middleware/rateLimiter');
const { globalErrorHandler } = require('./middleware/validate');

// -----------------------------------------------
// IMPORT ROUTES
// -----------------------------------------------
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const alertRoutes = require('./routes/alerts');

// -----------------------------------------------
// INITIALIZE EXPRESS APP
// -----------------------------------------------
const app = express();
const server = http.createServer(app);  // HTTP server for Socket.io

// -----------------------------------------------
// SOCKET.IO SETUP — Real-Time Alerts
// -----------------------------------------------
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
});

// Socket.io connection handler
io.on('connection', (socket) => {
  logger.info(`🔌 Socket connected: ${socket.id}`);

  // Client must emit 'join' with their userId to get personal alerts
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      logger.info(`User ${userId} joined their alert room`);
      socket.emit('joined', { message: '✅ Connected to Spamorix real-time alerts' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Make io accessible in route handlers via req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

// -----------------------------------------------
// SECURITY MIDDLEWARE
// -----------------------------------------------

// Helmet: Sets security-related HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,  // Disable for API servers
}));

// CORS: Allow frontend to connect
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:5500',   // Common Live Server port
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      'http://localhost:4200',   // Angular default
      'http://localhost:8080',   // Vue default
    ];

    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from: ${origin}`);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// -----------------------------------------------
// GENERAL MIDDLEWARE
// -----------------------------------------------

// Parse JSON request bodies (max 10mb)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logger (shows method, URL, status, response time)
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Apply general rate limiting to all /api routes
app.use('/api', generalLimiter);

// -----------------------------------------------
// HEALTH CHECK ROUTE
// Use this to verify the server is running
// -----------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Spamorix API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

// -----------------------------------------------
// API ROUTES
// -----------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/stats', alertRoutes);  // Stats is part of alerts controller

// Convenience: /api/block maps to alerts router
app.use('/api', alertRoutes);

// -----------------------------------------------
// API DOCUMENTATION ROUTE
// Quick reference for all available endpoints
// -----------------------------------------------
app.get('/api', (req, res) => {
  res.status(200).json({
    service: '🛡 Spamorix Anti-Phishing API',
    version: '1.0.0',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Login or register with email + phone',
        'GET /api/auth/me': 'Get current user (requires token)',
        'POST /api/auth/logout': 'Logout',
        'PUT /api/auth/profile': 'Update user preferences',
      },
      messages: {
        'GET /api/messages': 'Get all messages (paginated, filterable)',
        'POST /api/messages': 'Add & auto-analyze a message',
        'POST /api/messages/scan': 'Quick scan without saving',
        'GET /api/messages/:id': 'Get single message',
      },
      alerts: {
        'GET /api/alerts': 'Get all HIGH RISK alerts',
        'GET /api/alerts/summary': 'Quick unread count',
        'POST /api/block': 'Block & report a message/sender',
        'GET /api/stats': 'Get full dashboard statistics',
      },
    },
    authentication: 'Bearer <JWT Token> in Authorization header',
    documentation: 'See README.md for full API documentation',
  });
});

// -----------------------------------------------
// 404 HANDLER — Unknown routes
// -----------------------------------------------
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found.`,
    hint: 'Visit /api for available endpoints.',
  });
});

// -----------------------------------------------
// GLOBAL ERROR HANDLER — Must be LAST middleware
// -----------------------------------------------
app.use(globalErrorHandler);

// -----------------------------------------------
// START SERVER OR EXPORT FOR VERCEL
// -----------------------------------------------
const PORT = process.env.PORT || 5000;

// Export the Express API for Vercel
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  // Local development start
  const startServer = async () => {
    try {
      // Connect to MongoDB first
      await connectDB();

      // Start the HTTP server
      server.listen(PORT, () => {
        logger.info('');
        logger.info('╔════════════════════════════════════════╗');
        logger.info('║   🛡  SPAMORIX BACKEND STARTED         ║');
        logger.info('╠════════════════════════════════════════╣');
        logger.info(`║  Port     : ${PORT}                         ║`);
        logger.info(`║  Mode     : ${process.env.NODE_ENV || 'development'}              ║`);
        logger.info(`║  API Base : http://localhost:${PORT}/api   ║`);
        logger.info(`║  Health   : http://localhost:${PORT}/health║`);
        logger.info('╚════════════════════════════════════════╝');
        logger.info('');
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    process.exit(1);
  });

  // Graceful shutdown on CTRL+C
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
  });

  startServer();
} else {
  // DB connection for Vercel Serverless functions
  connectDB();
}
