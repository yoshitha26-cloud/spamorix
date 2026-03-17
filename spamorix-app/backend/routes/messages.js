// ============================================
// routes/messages.js
// Message API Routes
// ============================================

const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');

const { getMessages, addMessage, getMessageById, scanMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { scanLimiter } = require('../middleware/rateLimiter');

// All routes below require authentication
router.use(protect);

// ----- Validation Rules -----
const addMessageValidation = [
  body('content')
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: 2000 })
    .withMessage('Message too long (max 2000 characters)'),
  body('source')
    .optional()
    .isIn(['SMS', 'WhatsApp', 'UPI', 'Call', 'Email'])
    .withMessage('Invalid source. Must be: SMS, WhatsApp, UPI, Call, or Email'),
  body('sender.name')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  body('sender.number')
    .optional()
    .trim()
    .isLength({ max: 20 }),
];

const getMessagesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('source').optional().isIn(['SMS', 'WhatsApp', 'UPI', 'Call', 'Email']),
  query('riskLevel').optional().isIn(['low', 'medium', 'high']),
];

/**
 * @route   GET /api/messages
 * @desc    Get all messages for logged-in user (paginated, filterable)
 * @access  Private
 * @query   page, limit, source, riskLevel, isFraud, search, sortBy, sortOrder
 */
router.get('/', getMessagesValidation, validate, getMessages);

/**
 * @route   POST /api/messages
 * @desc    Add new message — auto-analyzed for spam
 * @access  Private
 * @body    { content, source, sender? }
 */
router.post('/', addMessageValidation, validate, addMessage);

/**
 * @route   POST /api/messages/scan
 * @desc    Quick scan without saving (for scanner tool)
 * @access  Private
 */
router.post(
  '/scan',
  scanLimiter,
  [
    body('content').notEmpty().withMessage('Content required').isLength({ max: 2000 }),
    body('source').optional().isIn(['SMS', 'WhatsApp', 'UPI', 'Call', 'Email']),
  ],
  validate,
  scanMessage
);

/**
 * @route   GET /api/messages/:id
 * @desc    Get single message by ID
 * @access  Private
 */
router.get('/:id', getMessageById);

module.exports = router;
