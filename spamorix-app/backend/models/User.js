// ============================================
// models/User.js
// User database schema (MongoDB / Mongoose)
// ============================================

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    // ----- Core Fields -----
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,        // Always store as lowercase
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [
        /^[+]?[\d\s\-()]{7,15}$/,
        'Please enter a valid phone number',
      ],
    },

    // ----- Profile -----
    name: {
      type: String,
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },

    // ----- Security -----
    // Optional OTP field for OTP-based login flow
    otp: {
      code: { type: String },
      expiresAt: { type: Date },
    },

    // Track failed login attempts
    loginAttempts: {
      type: Number,
      default: 0,
    },

    // Lock account after too many failed attempts
    lockUntil: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ----- Stats (denormalized for speed) -----
    stats: {
      totalMessages: { type: Number, default: 0 },
      threatsBlocked: { type: Number, default: 0 },
      trustScore: { type: Number, default: 100 },
    },

    // Track last login for activity monitoring
    lastLogin: {
      type: Date,
    },

    // User preference: language
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi', 'te', 'ta', 'kn', 'mr'],
      default: 'en',
    },
  },
  {
    // Automatically adds createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// ----- Indexes for fast lookups -----
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });

// ----- Virtual: Is account locked? -----
UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ----- Method: Increment failed login attempts -----
UserSchema.methods.incrementLoginAttempts = async function () {
  // If lock has expired, reset
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 1 hour
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 60 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

// ----- Don't return sensitive fields in JSON -----
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.otp;           // Never expose OTP
  delete obj.loginAttempts;
  delete obj.lockUntil;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
