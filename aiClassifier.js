// ============================================
// utils/aiClassifier.js
// AI-Based Classification (Mock + OpenAI Ready)
// ============================================
// This module provides an AI-powered classification
// layer on top of the keyword-based spam detector.
// Works in mock mode by default.
// Set OPENAI_API_KEY in .env to use real AI.
// ============================================

const logger = require('./logger');

// -----------------------------------------------
// MOCK AI RESPONSES
// Simulates what an LLM would return
// Used when OpenAI API key is not configured
// -----------------------------------------------
const MOCK_AI_RESPONSES = {
  high: {
    classification: 'PHISHING_SCAM',
    confidence: 94,
    reasoning: 'Message contains urgency triggers, requests sensitive credentials, and uses impersonation tactics typical of banking fraud.',
    categories: ['bank_impersonation', 'credential_theft', 'urgency_manipulation'],
    recommendation: 'BLOCK_IMMEDIATELY',
    safetyTips: [
      'Never share your OTP with anyone — not even bank employees',
      'Real banks never ask for your PIN or password over SMS',
      'Call your bank directly using the number on the back of your card',
    ],
  },
  medium: {
    classification: 'SUSPICIOUS_CONTENT',
    confidence: 65,
    reasoning: 'Message uses pressure language and contains suspicious links. Could be spam or low-level phishing.',
    categories: ['suspicious_link', 'pressure_tactics'],
    recommendation: 'REVIEW_CAREFULLY',
    safetyTips: [
      'Do not click on links from unknown senders',
      'Verify the sender through official channels',
    ],
  },
  low: {
    classification: 'LEGITIMATE',
    confidence: 88,
    reasoning: 'Message appears to be a normal communication without suspicious patterns.',
    categories: ['normal_communication'],
    recommendation: 'SAFE',
    safetyTips: [],
  },
};

// -----------------------------------------------
// OPENAI CLASSIFIER (when API key is available)
// -----------------------------------------------
const classifyWithOpenAI = async (content, source, initialAnalysis) => {
  // Only attempt if API key is configured
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const prompt = `
You are a cybersecurity expert specializing in phishing and spam detection for Indian users.

Analyze this ${source} message for fraud/phishing:
"${content}"

Initial keyword-based risk score: ${initialAnalysis.riskScore}/100
Detected suspicious keywords: ${initialAnalysis.detectedKeywords.join(', ') || 'none'}

Respond ONLY with valid JSON in this exact format:
{
  "classification": "PHISHING_SCAM|SUSPICIOUS_CONTENT|LEGITIMATE",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "categories": ["category1", "category2"],
  "recommendation": "BLOCK_IMMEDIATELY|REVIEW_CAREFULLY|SAFE",
  "safetyTips": ["tip1", "tip2"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.1,  // Low temperature for consistent outputs
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (text) {
      return JSON.parse(text);
    }
  } catch (error) {
    logger.warn(`OpenAI classification failed: ${error.message}. Using mock response.`);
  }

  return null;
};

// -----------------------------------------------
// MAIN AI CLASSIFY FUNCTION
// -----------------------------------------------
const aiClassify = async (content, source, initialAnalysis) => {
  // Try real OpenAI first
  const openAIResult = await classifyWithOpenAI(content, source, initialAnalysis);

  if (openAIResult) {
    logger.info(`AI Classification (OpenAI): ${openAIResult.classification}`);
    return {
      ...openAIResult,
      provider: 'openai',
      isMock: false,
    };
  }

  // Fall back to mock response based on initial risk level
  const mockResponse = MOCK_AI_RESPONSES[initialAnalysis.riskLevel] || MOCK_AI_RESPONSES.low;

  // Add some variation to mock confidence based on score
  const adjustedConfidence = Math.min(
    99,
    mockResponse.confidence + Math.floor(initialAnalysis.riskScore * 0.1)
  );

  logger.info(`AI Classification (Mock): ${mockResponse.classification}`);

  return {
    ...mockResponse,
    confidence: adjustedConfidence,
    provider: 'mock',
    isMock: true,
    note: 'Set OPENAI_API_KEY in .env for real AI classification',
  };
};

module.exports = { aiClassify };
