const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const apiRoutes = require('./routes/api');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ==========================================
   SECURITY & HEADERS
========================================== */
app.use(
  helmet({
    contentSecurityPolicy: false, // Allowed for loading Google fonts, CDN images, font-awesome
  })
);

app.use(cors());

/* ==========================================
   RATE LIMITING
========================================== */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

/* ==========================================
   BODY PARSING MIDDLEWARE
========================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ==========================================
   API ROUTES
========================================== */
app.use('/api', apiRoutes);

/* ==========================================
   SERVE CLIENT STATIC FILES
========================================== */
const clientDir = path.join(__dirname, '../client');
app.use(express.static(clientDir));

// Catch-all fallback for static html files
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDir, 'index.html'));
});

/* ==========================================
   START SERVER
========================================== */
app.listen(PORT, () => {
  console.log(`
==================================================
  ✨ JAYLESS BEAUTY HUB IS RUNNING LIVE ✨
  🌐 Server URL: http://localhost:${PORT}
  💅 Booking System: http://localhost:${PORT}/booking.html
  👑 Admin Dashboard: http://localhost:${PORT}/admin.html
==================================================
  `);
});