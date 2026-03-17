╔══════════════════════════════════════════════════════════╗
║          SPAMORIX — FULL STACK APPLICATION               ║
║    Anti-Phishing & Spam Detection System                 ║
╚══════════════════════════════════════════════════════════╝

WHAT'S INSIDE THIS FOLDER:
━━━━━━━━━━━━━━━━━━━━━━━━━━
  frontend.html        ← Open this in Chrome/Edge (the app)
  backend/             ← Node.js server folder
  README.txt           ← This file

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — INSTALL TOOLS (One time only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Node.js  → https://nodejs.org  (click LTS button)
2. MongoDB  → https://www.mongodb.com/try/download/community
3. VS Code  → https://code.visualstudio.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — START THE BACKEND (run these commands once)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Open VS Code → File → Open Folder → select the "backend" folder
Then open Terminal (Terminal menu → New Terminal) and type:

   npm install
   copy .env.example .env       (Windows)
   cp .env.example .env         (Mac/Linux)
   npm run seed
   npm run dev

You will see:
   ╔══════════════════════════════╗
   ║  SPAMORIX BACKEND STARTED   ║
   ║  Port: 5000                 ║
   ╚══════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — OPEN THE APP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Double-click frontend.html → opens in Chrome/Edge

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — LOGIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Email : test@spamorix.com
  Phone : +919876543210

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTE: frontend.html also works WITHOUT the backend
      It runs in demo mode automatically if backend is offline.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TECH STACK:
  Frontend : HTML5 + CSS3 + JavaScript (single file)
  Backend  : Node.js + Express.js
  Database : MongoDB
  Auth     : JWT Tokens
  Realtime : Socket.io
  Security : Helmet + Rate Limiting + CORS

Indian Cybercrime Helpline: 1930
