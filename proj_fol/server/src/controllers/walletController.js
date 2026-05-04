const { query } = require('../config/db');
const {
  getWalletBalance,
  getTransactionHistory,
  topUpWallet,
} = require('../services/walletService');
const Razorpay = require('razorpay');
const crypto   = require('crypto');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────────────────────
// @desc    Get wallet balance + stats
// @route   GET /api/wallet
// @access  Private
// ─────────────────────────────────────────────────────────────
const getWallet = async (req, res, next) => {
  try {
    const wallet = await getWalletBalance(req.user.id);

    // Quick credit/debit stats
    const stats = await query(
      `SELECT
        COUNT(*) FILTER (WHERE type = 'credit')                       AS total_credits,
        COUNT(*) FILTER (WHERE type = 'debit')                        AS total_debits,
        COALESCE(SUM(amount) FILTER (WHERE type = 'credit'), 0)       AS total_credited,
        COALESCE(SUM(amount) FILTER (WHERE type = 'debit'),  0)       AS total_debited
       FROM wallet_transactions
       WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        balance:        parseFloat(wallet.balance),
        locked_balance: parseFloat(wallet.locked_balance || 0),
        available:      parseFloat(wallet.balance),
        wallet_id:      wallet.id,
        updated_at:     wallet.updated_at,
        stats:          stats.rows[0],
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get transaction history (paginated + filterable)
// @route   GET /api/wallet/transactions
// @access  Private
// ─────────────────────────────────────────────────────────────
const getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { transactions, total } = await getTransactionHistory(
      req.user.id,
      parseInt(limit),
      offset,
      category || null
    );

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// @desc    Create Razorpay order for wallet top-up
// @route   POST /api/wallet/topup/create-order
// @access  Private
// ─────────────────────────────────────────────────────────────
const createTopUpOrder = async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 100)
      return res.status(400).json({
        success: false,
        message: 'Minimum top-up amount is ₹100.',
      });

    if (amount > 50000)
      return res.status(400).json({
        success: false,
        message: 'Maximum top-up amount is ₹50,000.',
      });

    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100), // paise, must be integer
      currency: 'INR',
      receipt:  `wallet_${req.user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        user_id: req.user.id,
        purpose: 'wallet_topup',
      },
    });

    res.json({
      success: true,
      data: {
        order_id: order.id,        // Razorpay's order id — frontend passes this back
        amount:   order.amount,    // still in paise
        currency: order.currency,
        key:      process.env.RAZORPAY_KEY_ID,
        prefill: {
          name:  req.user.name,
          email: req.user.email,
        },
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// @desc    Verify Razorpay payment + credit wallet
// @route   POST /api/wallet/topup/verify
// @access  Private
// ─────────────────────────────────────────────────────────────
const verifyTopUp = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification fields.',
      });

    // Verify HMAC signature
    const body        = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature)
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed — signature mismatch.',
      });

    // Fetch the actual order amount from Razorpay (never trust client-sent amount)
    const order          = await razorpay.orders.fetch(razorpay_order_id);
    const amountInRupees = order.amount / 100;

    const txn    = await topUpWallet(req.user.id, amountInRupees, razorpay_payment_id);
    const wallet = await getWalletBalance(req.user.id);

    res.json({
      success: true,
      message: `₹${amountInRupees} added to your wallet!`,
      data: {
        transaction:  txn,
        new_balance:  parseFloat(wallet.balance),
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// @desc    Turf owner earnings summary
// @route   GET /api/wallet/earnings
// @access  Private (owner)
// ─────────────────────────────────────────────────────────────
const getEarnings = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
        COALESCE(SUM(amount), 0)                                               AS total_earned,
        COUNT(*)                                                               AS total_settlements,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0) AS this_month,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),  0) AS this_week
       FROM wallet_transactions
       WHERE user_id  = $1
         AND category IN ('settlement_to_owner', 'cancellation_penalty')
         AND type     = 'credit'`,
      [req.user.id]
    );

    // Last 10 settlement transactions with match title
    const recent = await query(
      `SELECT wt.*, m.title AS match_title
       FROM wallet_transactions wt
       LEFT JOIN matches m ON wt.reference_id = m.id
       WHERE wt.user_id  = $1
         AND wt.category IN ('settlement_to_owner', 'cancellation_penalty')
         AND wt.type     = 'credit'
       ORDER BY wt.created_at DESC
       LIMIT 10`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        recent_settlements: recent.rows,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// @desc    Platform-wide fee analytics
// @route   GET /api/wallet/platform-earnings
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────
const getPlatformEarnings = async (req, res, next) => {
  try {
    // All credits into the admin wallet
    const result = await query(
      `SELECT
        COALESCE(SUM(amount), 0)                                                        AS total_platform_fees,
        COUNT(*)                                                                         AS total_transactions,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0) AS this_month,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),  0) AS this_week,
        COALESCE(SUM(amount) FILTER (WHERE category = 'settlement_platform_fee'),      0) AS from_settlements,
        COALESCE(SUM(amount) FILTER (WHERE category = 'topup'),                        0) AS from_topups
       FROM wallet_transactions
       WHERE user_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
         AND type    = 'credit'`
    );

    // Daily breakdown for the last 7 days
    const daily = await query(
      `SELECT
        DATE(created_at) AS date,
        COALESCE(SUM(amount), 0) AS fees,
        COUNT(*)                 AS count
       FROM wallet_transactions
       WHERE user_id    = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
         AND type       = 'credit'
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // Current admin wallet balance
    const adminWallet = await query(
      `SELECT balance FROM wallets
       WHERE user_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)`
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        current_balance:  parseFloat(adminWallet.rows[0]?.balance || 0),
        daily_breakdown:  daily.rows,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// Export ALL six handlers — routes file imports every one of them
// ─────────────────────────────────────────────────────────────
module.exports = {
  getWallet,
  getTransactions,
  createTopUpOrder,
  verifyTopUp,
  getEarnings,
  getPlatformEarnings,
};