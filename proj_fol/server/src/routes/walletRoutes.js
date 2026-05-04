const express = require('express');
const router  = express.Router();

const {
  getWallet,
  getTransactions,
  createTopUpOrder,
  verifyTopUp,
  getEarnings,
  getPlatformEarnings,
} = require('../controllers/walletController');

const { protect, authorize } = require('../middleware/authMiddleware');

// All wallet routes require authentication
router.use(protect);

// ── Core wallet ────────────────────────────────────────────────
router.get('/',             getWallet);
router.get('/transactions', getTransactions);

// ── Razorpay top-up ────────────────────────────────────────────
router.post('/topup/create-order', createTopUpOrder);
router.post('/topup/verify',       verifyTopUp);

// ── Owner earnings (turf owners only) ─────────────────────────
router.get('/earnings',          authorize('owner'), getEarnings);

// ── Platform earnings (admin only) ────────────────────────────
router.get('/platform-earnings', authorize('admin'), getPlatformEarnings);

module.exports = router;