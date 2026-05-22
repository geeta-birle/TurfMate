require('dotenv').config();

// ---------------- IMPORTS ----------------
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { testConnection, closePool } = require('./config/db');

// ---------------- ROUTES ----------------
const authRoutes         = require('./routes/authRoutes');
const turfRoutes         = require('./routes/turfRoutes');
const bookingRoutes      = require('./routes/bookingRoutes');
const paymentRoutes      = require('./routes/paymentRoutes');
const matchRoutes        = require('./routes/matchRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatRoutes         = require('./routes/chatRoutes');
const refundRoutes       = require('./routes/refundRoutes');
const adminRoutes        = require('./routes/adminRoutes');
const playerRoutes       = require('./routes/playerRoutes');
const walletRoutes       = require('./routes/walletRoutes');

// ---------------- SERVICES ----------------
const {
  startMatchCompletionCron,
  startMatchCancellationCron
} = require('./services/cronService');

// ---------------- SOCKET ----------------
const { initSocket } = require('./config/socket');

// ---------------- MIDDLEWARE ----------------
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// ---------------- APP INIT ----------------
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// ---------------- SECURITY ----------------
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  credentials: true,
}));

// ---------------- RATE LIMIT ----------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts. Try again later.' },
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ---------------- BODY PARSER ----------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------- LOGGER ----------------
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ---------------- HEALTH CHECK ----------------
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'TurfMate API is running 🏟️',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ---------------- ROUTES ----------------
app.use('/api/auth',          authRoutes);
app.use('/api/turfs',         turfRoutes);
app.use('/api/bookings',      bookingRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/matches',       matchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/refunds',       refundRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/players',       playerRoutes);
app.use('/api/wallet',        walletRoutes);

// ---------------- ERROR HANDLING ----------------
app.use(notFound);
app.use(errorHandler);

// ---------------- SERVER START ----------------
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 TurfMate server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);

  // Start cron jobs AFTER server starts
  startMatchCompletionCron();
  startMatchCancellationCron();
});

// ---------------- GRACEFUL SHUTDOWN ----------------
process.on("SIGINT", () => {
  server.close(() => {
    console.log("🛑 Server closed gracefully");
    process.exit(0);
  });
});

module.exports = { app, server };