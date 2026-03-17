// ============================================
// routes/alerts.js
// Alert, Block, Report & Stats Routes
// ============================================

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { getAlerts, blockAndReport, getStats, getAlertSummary } = require('../controllers/alertController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/alerts
 * @desc    Get all HIGH RISK messages for user
 * @access  Private
 */
router.get('/', getAlerts);

/**
 * @route   GET /api/alerts/summary
 * @desc    Quick unread alert counts
 * @access  Private
 */
router.get('/summary', getAlertSummary);

/**
 * @route   POST /api/block
 * @desc    Block and/or report a message/sender
 * @access  Private
 */
router.post(
  '/block',
  [
    body('messageId').optional().isMongoId().withMessage('Invalid message ID'),
    body('action')
      .optional()
      .isIn(['block', 'report', 'block_and_report'])
      .withMessage('Action must be: block, report, or block_and_report'),
    body('reason')
      .optional()
      .isIn(['phishing', 'spam', 'fraud', 'harassment', 'other']),
    body('notes').optional().isLength({ max: 500 }),
  ],
  validate,
  blockAndReport
);

/**
 * @route   GET /api/stats
 * @desc    Get full dashboard stats for user
 * @access  Private
 */
router.get('/stats', getStats);

module.exports = router;
