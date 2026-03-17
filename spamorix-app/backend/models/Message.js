// ============================================
// models/Message.js
// Message schema — stores all monitored messages
// ============================================

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    // ----- Ownership -----
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',               // References the User model
      required: [true, 'User ID is required'],
      index: true,               // Index for fast user-message queries
    },

    // ----- Message Content -----
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [2000, 'Message content too long (max 2000 chars)'],
    },

    // ----- Source Channel -----
    source: {
      type: String,
      enum: ['SMS', 'WhatsApp', 'UPI', 'Call', 'Email'],
      default: 'SMS',
    },

    // ----- Sender Info (optional) -----
    sender: {
      name: { type: String, trim: true },
      number: { type: String, trim: true },
      isKnown: { type: Boolean, default: false }, // Is this a known contact?
    },

    // ----- AI / Spam Analysis Results -----
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },

    isFraud: {
      type: Boolean,
      default: false,
    },

    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Keywords that triggered the alert
    detectedKeywords: [{
      type: String,
    }],

    // Analysis flags
    flags: {
      hasHighRiskKeywords: { type: Boolean, default: false },
      hasMediumRiskKeywords: { type: Boolean, default: false },
      hasMultilingualScamPattern: { type: Boolean, default: false },
      hasSuspiciousUrl: { type: Boolean, default: false },
      hasUrl: { type: Boolean, default: false },
    },

    // The alert/intervention data sent to frontend
    intervention: {
      alert: { type: Boolean, default: false },
      message: { type: String },
      action: {
        type: String,
        enum: ['NONE', 'REVIEW_RECOMMENDED', 'BLOCK_RECOMMENDED'],
        default: 'NONE',
      },
      helpline: { type: String },
    },

    // ----- User Actions -----
    isBlocked: {
      type: Boolean,
      default: false,
    },

    isReported: {
      type: Boolean,
      default: false,
    },

    reportedAt: {
      type: Date,
    },

    userTrustedOverride: {
      // User clicked "I trust this person" despite warning
      type: Boolean,
      default: false,
    },

    // ----- Read Status -----
    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,  // Adds createdAt and updatedAt
  }
);

// ----- Compound indexes for common queries -----
MessageSchema.index({ userId: 1, riskLevel: 1 });
MessageSchema.index({ userId: 1, isFraud: 1 });
MessageSchema.index({ userId: 1, createdAt: -1 }); // Sort by newest first
MessageSchema.index({ userId: 1, source: 1 });

// ----- Virtual: Human-readable timestamp -----
MessageSchema.virtual('timeAgo').get(function () {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) > 1 ? 's' : ''} ago`;
});

// Enable virtuals in JSON responses
MessageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Message', MessageSchema);
