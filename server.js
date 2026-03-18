// ============================================
// server.js (root)
// Main Entry Point — Spamorix Backend
// ============================================
//
// This file delegates to the real backend implementation under
// `spamorix-app/backend/server.js`.
//
// - When run directly (`node server.js`), it will start the server locally.
// - When deployed to Vercel, it exports the Express app for serverless handling.

const backend = require('./spamorix-app/backend/server');

if (require.main === module && typeof backend.start === 'function') {
  backend.start();
}

module.exports = backend;
