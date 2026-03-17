// ============================================
// controllers/alertController.js
// Alert, Block, Report & Stats Logic
// ============================================

const Message = require('../models/Message');
const BlockReport = require('../models/BlockReport');
const User = require('../models/User');
const { calculateTrustScore } = require('../utils/spamDetector');
const logger = require('../utils/logger');

// -----------------------------------------------
// GET /api/alerts
// Return only HIGH RISK messages for user
// -----------------------------------------------
const getAlerts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      unreadOnly = false,
    } = req.query;

    const query = {
      userId: req.user._id,
      riskLevel: 'high',
    };

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [alerts, totalCount, unreadCount] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean({ virtuals: true }),
      Message.countDocuments(query),
      Message.countDocuments({ ...query, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      count: alerts.length,
      totalCount,
      unreadCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
      alerts,
    });

  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------
// POST /api/block
// Block and/or report a message/sender
// -----------------------------------------------
const blockAndReport = async (req, res, next) => {
  try {
    const {
      messageId,
      action = 'block_and_report',
      targetIdentifier,
      reason = 'fraud',
      notes,
    } = req.body;

    // Verify the message belongs to this user (if messageId provided)
    if (messageId) {
      const message = await Message.findOne({
        _id: messageId,
        userId: req.user._id,
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found.',
        });
      }

      // Mark message as blocked/reported
      await Message.findByIdAndUpdate(messageId, {
        isBlocked: ['block', 'block_and_report'].includes(action),
        isReported: ['report', 'block_and_report'].includes(action),
        reportedAt: new Date(),
      });
    }

    // Create block/report record
    const report = await BlockReport.create({
      userId: req.user._id,
      messageId,
      action,
      targetIdentifier,
      reason,
      notes,
    });

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.threatsBlocked': 1 },
    });

    // Emit socket event if real-time is available
    if (req.io) {
      req.io.to(`user_${req.user._id}`).emit('block_confirmed', {
        reportId: report.reportId,
        action,
        timestamp: new Date(),
      });
    }

    logger.info(`Block/Report: User ${req.user.email} | Action: ${action} | Reason: ${reason} | Report: ${report.reportId}`);

    res.status(200).json({
      success: true,
      message: `Successfully ${action.replace('_', ' ')}ed. The scammer has been reported to our systems.`,
      report: {
        reportId: report.reportId,
        action: report.action,
        reason: report.reason,
        createdAt: report.createdAt,
        helpline: 'You can also report to Cyber Crime helpline: 1930',
      },
    });

  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------
// GET /api/stats
// Return dashboard stats for logged-in user
// -----------------------------------------------
const getStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch all messages for this user (for accurate stats)
    const allMessages = await Message.find({ userId }).lean();

    // --- Counts ---
    const totalMessages = allMessages.length;
    const fraudMessages = allMessages.filter(m => m.isFraud).length;
    const highRiskMessages = allMessages.filter(m => m.riskLevel === 'high').length;
    const mediumRiskMessages = allMessages.filter(m => m.riskLevel === 'medium').length;
    const lowRiskMessages = allMessages.filter(m => m.riskLevel === 'low').length;
    const blockedMessages = allMessages.filter(m => m.isBlocked).length;

    // --- Source breakdown ---
    const sourceBreakdown = {};
    for (const msg of allMessages) {
      sourceBreakdown[msg.source] = (sourceBreakdown[msg.source] || 0) + 1;
    }

    // --- Calculate trust score ---
    const trustScore = calculateTrustScore(allMessages);

    // Update stored trust score
    await User.findByIdAndUpdate(userId, {
      'stats.trustScore': trustScore,
      'stats.totalMessages': totalMessages,
    });

    // --- Today's stats ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMessages = allMessages.filter(m => new Date(m.createdAt) >= today);

    // --- Block reports count ---
    const totalReports = await BlockReport.countDocuments({ userId });

    // --- Recent threat types (last 7 days) ---
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentThreats = await Message.find({
      userId,
      riskLevel: 'high',
      createdAt: { $gte: weekAgo },
    }).select('detectedKeywords source createdAt').lean();

    res.status(200).json({
      success: true,
      stats: {
        // Core stats
        totalMessagesScanned: totalMessages,
        threatsDetected: highRiskMessages,
        fraudMessages,
        mediumRiskMessages,
        safeMessages: lowRiskMessages,
        blockedMessages,
        totalReports,

        // Trust score (0–100)
        trustScore,
        trustLevel:
          trustScore >= 80 ? 'excellent' :
          trustScore >= 60 ? 'good' :
          trustScore >= 40 ? 'fair' : 'poor',

        // Today's activity
        today: {
          messages: todayMessages.length,
          threats: todayMessages.filter(m => m.riskLevel === 'high').length,
        },

        // Source breakdown
        bySource: sourceBreakdown,

        // Risk breakdown
        byRisk: {
          high: highRiskMessages,
          medium: mediumRiskMessages,
          low: lowRiskMessages,
        },

        // Recent threats summary
        recentThreats: recentThreats.slice(0, 5),

        // Calculated at
        calculatedAt: new Date(),
      },
    });

  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------
// GET /api/alerts/summary
// Quick alert summary (unread high-risk count)
// -----------------------------------------------
const getAlertSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [unreadHighRisk, unreadMediumRisk, totalUnread] = await Promise.all([
      Message.countDocuments({ userId, riskLevel: 'high', isRead: false }),
      Message.countDocuments({ userId, riskLevel: 'medium', isRead: false }),
      Message.countDocuments({ userId, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      summary: {
        unreadHighRisk,
        unreadMediumRisk,
        totalUnread,
        hasUrgentAlerts: unreadHighRisk > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAlerts, blockAndReport, getStats, getAlertSummary };
