// ============================================
// utils/seedData.js
// Seed the database with sample data for testing
// Run with: npm run seed
// ============================================

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const BlockReport = require('../models/BlockReport');
const { analyzeMessage } = require('./spamDetector');
const logger = require('./logger');

// -----------------------------------------------
// SAMPLE MESSAGES covering all risk levels
// -----------------------------------------------
const sampleMessages = [
  // HIGH RISK — Bank/OTP scams
  {
    content: 'URGENT: Your SBI account will be blocked in 24 hours. Click this link to verify KYC: sbi-verify.xyz/kyc',
    source: 'SMS',
    sender: { name: 'SBI-FAKE', number: '+919999000001' },
  },
  {
    content: 'Dear customer, share your OTP immediately to prevent account suspension. Call 1800-XXX-XXXX now.',
    source: 'SMS',
    sender: { name: 'HDFC-FAKE', number: '+919999000002' },
  },
  {
    content: 'Congratulations! You have won Rs.50,000 in the Jio Lucky Draw lottery! Send Rs.500 to claim your prize via UPI: claim@paytm',
    source: 'WhatsApp',
    sender: { name: 'Unknown', number: '+918001200034' },
  },
  {
    content: 'Your UPI account needs immediate KYC verification. Click the link or your account will be deactivated tonight.',
    source: 'UPI',
    sender: { name: 'PhonePe-FAKE', number: '+919988776655' },
  },
  {
    content: 'WIN Rs.2 Lakh! You are selected for PM Kisan lottery. Share your Aadhaar and bank details to claim reward.',
    source: 'SMS',
    sender: { name: 'GOVT-FAKE', number: '+911800000001' },
  },

  // MEDIUM RISK — Suspicious but not confirmed fraud
  {
    content: 'URGENT: Your subscription expires today. Click the link to renew and get 50% off. Limited time offer!',
    source: 'SMS',
    sender: { name: 'Netflix-Promo', number: '+918800112233' },
  },
  {
    content: 'Dear valued customer, please verify your account details to continue using our services. Visit the link provided.',
    source: 'WhatsApp',
    sender: { name: 'Unknown', number: '+917799001122' },
  },
  {
    content: 'Work from home opportunity! Earn Rs.5000 daily. No experience needed. Contact us immediately.',
    source: 'SMS',
    sender: { name: 'JobAlert', number: '+919900112233' },
  },

  // LOW RISK — Safe messages
  {
    content: 'Hi bhai, kab aa raha hai? Dinner ke liye ghar pe aaja aaj.',
    source: 'WhatsApp',
    sender: { name: 'Rahul', number: '+919876543210', isKnown: true },
  },
  {
    content: 'Your Amazon order #408-1234567 has been dispatched. Expected delivery: Tomorrow by 8 PM. Track your order in the app.',
    source: 'SMS',
    sender: { name: 'Amazon', number: 'AMAZON' },
  },
  {
    content: 'Your Swiggy order is on the way! Estimated arrival: 25 minutes. Track live in the app.',
    source: 'SMS',
    sender: { name: 'Swiggy', number: 'SWIGGY' },
  },
  {
    content: 'Meeting scheduled for tomorrow at 10 AM in conference room 2. Please confirm attendance.',
    source: 'WhatsApp',
    sender: { name: 'Manager', number: '+919898001122', isKnown: true },
  },
  {
    content: 'Rs.500 debited from your account for UPI txn to Zomato. Available balance: Rs.12,450. — HDFC Bank',
    source: 'UPI',
    sender: { name: 'HDFC Bank', number: 'HDFCBK' },
  },
];

// -----------------------------------------------
// SEED FUNCTION
// -----------------------------------------------
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB for seeding...');

    // Clear existing seed data
    await Message.deleteMany({});
    await BlockReport.deleteMany({});
    logger.info('Cleared existing messages and reports');

    // Create or find test user
    let testUser = await User.findOne({ email: 'test@spamorix.com' });
    if (!testUser) {
      testUser = await User.create({
        email: 'test@spamorix.com',
        phone: '+919876543210',
        name: 'Ravi Kumar',
        lastLogin: new Date(),
      });
      logger.info(`Created test user: ${testUser.email}`);
    } else {
      logger.info(`Using existing test user: ${testUser.email}`);
    }

    // Create messages with analysis
    const messageDocs = [];
    for (const msgData of sampleMessages) {
      const analysis = analyzeMessage(msgData.content, msgData.source);

      // Slightly randomize timestamps (spread over last 7 days)
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const createdAt = new Date(Date.now() - (daysAgo * 86400000) - (hoursAgo * 3600000));

      messageDocs.push({
        userId: testUser._id,
        content: msgData.content,
        source: msgData.source,
        sender: msgData.sender || {},
        riskLevel: analysis.riskLevel,
        isFraud: analysis.isFraud,
        riskScore: analysis.riskScore,
        confidence: analysis.confidence,
        detectedKeywords: analysis.detectedKeywords,
        flags: analysis.flags,
        intervention: analysis.intervention,
        createdAt,
        updatedAt: createdAt,
      });
    }

    const createdMessages = await Message.insertMany(messageDocs);
    logger.info(`✅ Created ${createdMessages.length} sample messages`);

    // Create a sample block report
    const highRiskMsg = createdMessages.find(m => m.isFraud);
    if (highRiskMsg) {
      await BlockReport.create({
        userId: testUser._id,
        messageId: highRiskMsg._id,
        action: 'block_and_report',
        targetIdentifier: '+919999000001',
        reason: 'phishing',
        notes: 'Fake SBI bank message requesting OTP',
      });
      logger.info('✅ Created sample block report');
    }

    // Update user stats
    const fraudCount = createdMessages.filter(m => m.isFraud).length;
    await User.findByIdAndUpdate(testUser._id, {
      'stats.totalMessages': createdMessages.length,
      'stats.threatsBlocked': fraudCount,
      'stats.trustScore': 72,
    });

    logger.info('');
    logger.info('🌱 DATABASE SEEDED SUCCESSFULLY!');
    logger.info('─────────────────────────────────');
    logger.info(`Test User Email : test@spamorix.com`);
    logger.info(`Test User Phone : +919876543210`);
    logger.info(`Messages Created: ${createdMessages.length}`);
    logger.info(`Fraud Detected  : ${fraudCount}`);
    logger.info('─────────────────────────────────');
    logger.info('Use the above email + phone to login via POST /api/auth/login');

    process.exit(0);
  } catch (error) {
    logger.error(`Seed failed: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
