// ============================================
// controllers/messageController.js
// Message API Logic — Add, Fetch, Analyze
// ============================================

const Message = require('../models/Message');
const User = require('../models/User');
const { analyzeMessage } = require('../utils/spamDetector');
const logger = require('../utils/logger');

// -----------------------------------------------
// GET /api/messages
// Get all messages for logged-in user
// Supports pagination, filtering, sorting
// -----------------------------------------------
const getMessages = async (req, res, next) => {
  try {
    // Extract query params for filtering
    const {
      page = 1,
      limit = 20,
      source,       // Filter by source (SMS, WhatsApp, etc.)
      riskLevel,    // Filter by risk (low, medium, high)
      isFraud,      // Filter fraud only
      search,       // Search message content
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build the MongoDB query
    const query = { userId: req.user._id };

    if (source) query.source = source;
    if (riskLevel) query.riskLevel = riskLevel;
    if (isFraud !== undefined) query.isFraud = isFraud === 'true';
    if (search) {
      // Text search in message content
      query.content = { $regex: search, $options: 'i' };
    }

    // Execute paginated query
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [messages, totalCount] = await Promise.all([
      Message.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean({ virtuals: true }),
      Message.countDocuments(query),
    ]);

    // Pagination metadata
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      count: messages.length,
      totalCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
      messages,
    });

  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------
// POST /api/messages
// Add a new message — auto-analyzes for spam
// -----------------------------------------------
const addMessage = async (req, res, next) => {
  try {
    const { content, source = 'SMS', sender } = req.body;

    // --- Run spam detection engine ---
    const analysis = analyzeMessage(content, source);

    // --- Create the message document ---
    const message = await Message.create({
      userId: req.user._id,
      content,
      source,
      sender: sender || {},
      riskLevel: analysis.riskLevel,
      isFraud: analysis.isFraud,
      riskScore: analysis.riskScore,
      confidence: analysis.confidence,
      detectedKeywords: analysis.detectedKeywords,
      flags: analysis.flags,
      intervention: analysis.intervention,
    });

    // --- Update user stats ---
    const statsUpdate = {
      $inc: { 'stats.totalMessages': 1 },
    };

    if (analysis.isFraud) {
      statsUpdate.$inc['stats.threatsBlocked'] = 1;
    }

    await User.findByIdAndUpdate(req.user._id, statsUpdate);

    // --- Emit real-time alert if high risk ---
    if (analysis.riskLevel === 'high' && req.io) {
      req.io.to(`user_${req.user._id}`).emit('new_threat', {
        type: 'HIGH_RISK_MESSAGE',
        messageId: message._id,
        source,
        riskScore: analysis.riskScore,
        intervention: analysis.intervention,
        timestamp: new Date(),
      });
      logger.info(`Real-time alert emitted for user: ${req.user._id}`);
    }

    // --- Log the event ---
    logger.info(`Message added: User ${req.user.email} | Source: ${source} | Risk: ${analysis.riskLevel}`);

    // --- Respond with full analysis ---
    res.status(201).json({
      success: true,
      message: 'Message analyzed and stored successfully.',
      data: {
        messageId: message._id,
        riskLevel: analysis.riskLevel,
        isFraud: analysis.isFraud,
        riskScore: analysis.riskScore,
        confidence: analysis.confidence,
        detectedKeywords: analysis.detectedKeywords,
        intervention: analysis.intervention,
        source,
        createdAt: message.createdAt,
      },
      // Full message document
      storedMessage: message,
    });

  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------
// GET /api/messages/:id
// Get a single message by ID
// -----------------------------------------------
const getMessageById = async (req, res, next) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      userId: req.user._id,  // Ensure user can only see their own messages
    }).lean({ virtuals: true });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found.',
      });
    }

    // Mark as read
    await Message.findByIdAndUpdate(req.params.id, {
      isRead: true,
      readAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------
// POST /api/messages/scan
// Quick scan — analyze a message WITHOUT saving it
// -----------------------------------------------
const scanMessage = async (req, res, next) => {
  try {
    const { content, source = 'SMS' } = req.body;

    // Run analysis
    const analysis = analyzeMessage(content, source);

    logger.info(`Quick scan by ${req.user.email} | Risk: ${analysis.riskLevel}`);

    res.status(200).json({
      success: true,
      message: 'Message scanned successfully.',
      analysis: {
        ...analysis,
        content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMessages, addMessage, getMessageById, scanMessage };
