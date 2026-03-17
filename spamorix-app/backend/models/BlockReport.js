// ============================================
// models/BlockReport.js
// Stores block/report actions by users
// ============================================

const mongoose = require('mongoose');

const BlockReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },

    // What action the user took
    action: {
      type: String,
      enum: ['block', 'report', 'block_and_report'],
      required: true,
    },

    // Who/what is being blocked
    targetType: {
      type: String,
      enum: ['sender', 'message', 'number'],
      default: 'message',
    },

    targetIdentifier: {
      // Phone number, sender name, or message ID
      type: String,
      trim: true,
    },

    reason: {
      type: String,
      enum: ['phishing', 'spam', 'fraud', 'harassment', 'other'],
      default: 'fraud',
    },

    notes: {
      type: String,
      maxlength: 500,
    },

    // Auto-generated report ID for reference
    reportId: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate a report ID before saving
BlockReportSchema.pre('save', function (next) {
  if (!this.reportId) {
    // Format: SPX-YYYYMMDD-RANDOM
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.reportId = `SPX-${date}-${random}`;
  }
  next();
});

module.exports = mongoose.model('BlockReport', BlockReportSchema);
