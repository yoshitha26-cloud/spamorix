// ============================================
// utils/spamDetector.js
// Core Spam Detection Engine
// ============================================
// This is the brain of Spamorix. It analyzes
// message content and assigns a risk level.
// ============================================

const logger = require('./logger');

// -----------------------------------------------
// KEYWORD DICTIONARIES
// -----------------------------------------------

// HIGH RISK — Almost certainly a scam/phishing attempt
const HIGH_RISK_KEYWORDS = [
  // Financial scams
  'lottery', 'you have won', 'winner', 'prize money', 'jackpot',
  'claim your reward', 'free money', 'cash prize',
  // OTP & credential theft
  'share your otp', 'send otp', 'enter otp', 'verify otp',
  'otp is', 'share pin', 'atm pin', 'cvv number',
  // Fake urgency (banking)
  'account will be blocked', 'account suspended', 'account deactivated',
  'kyc expired', 'kyc update required', 'bank account blocked',
  'verify immediately', 'action required immediately',
  // Phishing links
  'click this link', 'click here immediately', 'verify now',
  'login immediately', 'confirm your details',
  // UPI scams
  'upi fraud', 'send money to receive', 'pay to claim',
  'transfer now', 'scan qr to win',
  // Job/loan scams
  'work from home earn', 'earn lakhs', 'easy money',
  'loan approved instantly', 'no documents required',
  // Hindi/regional scam patterns
  'aapka account band', 'otp share karein', 'prize jeet liya',
  'turant karein', 'abhi verify',
];

// MEDIUM RISK — Suspicious, needs caution
const MEDIUM_RISK_KEYWORDS = [
  // Urgency without specific theft
  'urgent', 'act now', 'limited time', 'expires soon',
  'last chance', 'today only', 'hurry',
  // Suspicious requests
  'click link', 'visit link', 'open link', 'follow link',
  'download now', 'install app',
  // Personal info fishing
  'confirm your details', 'update your information',
  'verify your account', 'validate your',
  // Financial pressure
  'investment opportunity', 'guaranteed returns', 'risk free',
  'double your money', 'crypto offer',
  // Job offers
  'part time job', 'work from home', 'earn daily',
  'no experience needed', 'high salary',
  // Suspicious greetings
  'dear customer', 'dear user', 'valued customer',
  'congratulations you', 'you are selected',
];

// LOW RISK — Likely safe
const LOW_RISK_INDICATORS = [
  'hello', 'hi', 'how are you', 'meeting', 'schedule',
  'invoice', 'order', 'delivery', 'tracking', 'otp',
  'your order', 'shipment', 'appointment', 'reminder',
];

// -----------------------------------------------
// MULTILINGUAL SUPPORT (Basic)
// Transliterated Hindi/Telugu/Tamil scam patterns
// -----------------------------------------------
const MULTILINGUAL_HIGH_RISK = {
  hindi: [
    'aapka account band ho jayega',
    'otp share karo',
    'inam jeet liya',
    'turant call karo',
    'paise transfer karo',
  ],
  telugu: [
    'mee account block avutundi',
    'otp cheppandi',
    'inam gelvandi',
  ],
  tamil: [
    'ungal account block agum',
    'otp sollunga',
    'pari verin',
  ],
};

// -----------------------------------------------
// SOURCE-SPECIFIC RISK BOOSTERS
// Some channels are more likely to carry scams
// -----------------------------------------------
const SOURCE_RISK_WEIGHTS = {
  SMS: 1.2,       // SMS has more spoofed sender IDs
  WhatsApp: 1.1,  // Forwarded messages common
  UPI: 1.3,       // Financial channel — extra scrutiny
  Call: 1.2,
  Email: 1.0,
};

// -----------------------------------------------
// HELPER: Score a message against a keyword list
// -----------------------------------------------
const scoreAgainstKeywords = (contentLower, keywords) => {
  let score = 0;
  const matchedKeywords = [];

  for (const keyword of keywords) {
    if (contentLower.includes(keyword.toLowerCase())) {
      score++;
      matchedKeywords.push(keyword);
    }
  }

  return { score, matchedKeywords };
};

// -----------------------------------------------
// HELPER: Check multilingual patterns
// -----------------------------------------------
const checkMultilingual = (contentLower) => {
  let found = false;
  for (const [lang, patterns] of Object.entries(MULTILINGUAL_HIGH_RISK)) {
    for (const pattern of patterns) {
      if (contentLower.includes(pattern)) {
        found = true;
        break;
      }
    }
    if (found) break;
  }
  return found;
};

// -----------------------------------------------
// HELPER: Detect suspicious URLs in message
// -----------------------------------------------
const detectSuspiciousUrls = (content) => {
  // URL detection regex
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = content.match(urlRegex) || [];

  const suspiciousPatterns = [
    /bit\.ly/i, /tinyurl/i, /goo\.gl/i,   // URL shorteners
    /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // Raw IP addresses
    /-sbi/i, /-hdfc/i, /-paytm/i,          // Fake bank names in URL
    /kyc-/i, /verify-/i, /update-/i,        // Phishing path patterns
    /\.xyz$/i, /\.tk$/i, /\.cf$/i,          // Suspicious TLDs
  ];

  let suspicious = false;
  for (const url of urls) {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        suspicious = true;
        break;
      }
    }
  }

  return { hasUrl: urls.length > 0, suspicious, urls };
};

// -----------------------------------------------
// MAIN ANALYSIS FUNCTION
// Called for every new message added to the system
// -----------------------------------------------
const analyzeMessage = (content, source = 'SMS') => {
  // Normalize: lowercase for matching
  const contentLower = content.toLowerCase().trim();

  // --- Step 1: Check HIGH risk keywords ---
  const highResult = scoreAgainstKeywords(contentLower, HIGH_RISK_KEYWORDS);

  // --- Step 2: Check MEDIUM risk keywords ---
  const mediumResult = scoreAgainstKeywords(contentLower, MEDIUM_RISK_KEYWORDS);

  // --- Step 3: Check multilingual patterns ---
  const multilingualRisk = checkMultilingual(contentLower);

  // --- Step 4: URL analysis ---
  const urlAnalysis = detectSuspiciousUrls(content);

  // --- Step 5: Source risk weight ---
  const sourceWeight = SOURCE_RISK_WEIGHTS[source] || 1.0;

  // --- Step 6: Calculate composite risk score ---
  let riskScore = 0;
  riskScore += highResult.score * 30;    // Each high-risk keyword = 30 points
  riskScore += mediumResult.score * 15;  // Each medium keyword = 15 points
  riskScore += multilingualRisk ? 40 : 0; // Multilingual scam = 40 points
  riskScore += urlAnalysis.suspicious ? 25 : 0; // Suspicious URL = 25 points
  riskScore += urlAnalysis.hasUrl && !urlAnalysis.suspicious ? 5 : 0;

  // Apply source weight
  riskScore = Math.round(riskScore * sourceWeight);

  // --- Step 7: Determine risk level ---
  let riskLevel, isFraud, confidence;

  if (riskScore >= 50 || highResult.score >= 2 || multilingualRisk) {
    riskLevel = 'high';
    isFraud = true;
    confidence = Math.min(95, 60 + riskScore);
  } else if (riskScore >= 20 || highResult.score >= 1 || mediumResult.score >= 2) {
    riskLevel = 'medium';
    isFraud = false;
    confidence = Math.min(75, 40 + riskScore);
  } else {
    riskLevel = 'low';
    isFraud = false;
    confidence = Math.max(20, 80 - riskScore);
  }

  // --- Step 8: Build detailed analysis report ---
  const analysis = {
    riskLevel,
    isFraud,
    riskScore: Math.min(100, riskScore),  // Cap at 100
    confidence: Math.min(100, confidence),
    detectedKeywords: [
      ...highResult.matchedKeywords,
      ...mediumResult.matchedKeywords,
    ],
    flags: {
      hasHighRiskKeywords: highResult.score > 0,
      hasMediumRiskKeywords: mediumResult.score > 0,
      hasMultilingualScamPattern: multilingualRisk,
      hasSuspiciousUrl: urlAnalysis.suspicious,
      hasUrl: urlAnalysis.hasUrl,
    },
    intervention: riskLevel === 'high'
      ? {
          alert: true,
          message: 'STOP: This may be a scam! Do not share OTP, PIN, or personal details.',
          action: 'BLOCK_RECOMMENDED',
          helpline: 'Report to Cyber Crime: 1930 (India)',
        }
      : riskLevel === 'medium'
      ? {
          alert: true,
          message: 'CAUTION: This message looks suspicious. Be careful before clicking any links.',
          action: 'REVIEW_RECOMMENDED',
          helpline: null,
        }
      : {
          alert: false,
          message: 'Message appears safe.',
          action: 'NONE',
          helpline: null,
        },
    analyzedAt: new Date().toISOString(),
  };

  // Log high-risk detections
  if (isFraud) {
    logger.warn(`🚨 HIGH RISK message detected from source: ${source} | Score: ${riskScore} | Keywords: ${highResult.matchedKeywords.join(', ')}`);
  }

  return analysis;
};

// -----------------------------------------------
// TRUST SCORE CALCULATOR
// Calculates user's overall safety score (0–100)
// based on ratio of safe vs risky messages
// -----------------------------------------------
const calculateTrustScore = (messages) => {
  if (!messages || messages.length === 0) return 100;

  const total = messages.length;
  const highRisk = messages.filter(m => m.riskLevel === 'high').length;
  const mediumRisk = messages.filter(m => m.riskLevel === 'medium').length;
  const lowRisk = messages.filter(m => m.riskLevel === 'low').length;

  // Weighted scoring
  const safeScore = (lowRisk * 1 + mediumRisk * 0.5) / total;
  const trustScore = Math.round(safeScore * 100);

  // Deduct points for high-risk messages
  const deduction = Math.min(40, highRisk * 8);

  return Math.max(0, Math.min(100, trustScore - deduction));
};

module.exports = { analyzeMessage, calculateTrustScore };
