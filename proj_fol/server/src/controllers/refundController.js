const { getClient, query } = require('../config/db');
const { creditWallet, debitWallet } = require('../services/walletService');
const { getIO } = require('../config/socket');

// ─────────────────────────────────────────────────────────────
// @desc    Player requests a refund (goes to owner for approval)
// @route   POST /api/refunds
// @access  Private (player)
// ─────────────────────────────────────────────────────────────
const requestRefund = async (req, res, next) => {
  const client = await getClient();
  const userId = req.user.id;
  const { match_id, reason } = req.body;

  try {
    await client.query('BEGIN');

    // Get match + payment info
    const paymentResult = await client.query(
      `SELECT mp.*, mp.id as payment_id,
        m.id as match_id, m.title, m.status as match_status,
        ts.date as match_date, ts.start_time,
        b.organizer_id as creator_id,
        t.owner_id
       FROM match_payments mp
       JOIN matches m ON mp.match_id = m.id
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE mp.match_id = $1 AND mp.player_id = $2
       FOR UPDATE`,
      [match_id, userId]
    );

    if (!paymentResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'No payment found for this match.',
      });
    }

    const payment = paymentResult.rows[0];

    // Already refunded?
    if (payment.status === 'refunded') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This payment has already been refunded.',
      });
    }

    if (payment.status === 'released') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot refund after match settlement.',
      });
    }

    // Already has a pending request?
    const existingRequest = await client.query(
      `SELECT id FROM refund_requests
       WHERE match_id = $1 AND player_id = $2 AND status = 'pending'`,
      [match_id, userId]
    );
    if (existingRequest.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'You already have a pending refund request for this match.',
      });
    }

    // ── 2-hour rule ───────────────────────────────────────────
    const matchDateTime = new Date(`${payment.match_date}T${payment.start_time}`);
    const hoursUntilMatch = (matchDateTime - new Date()) / (1000 * 60 * 60);

    if (hoursUntilMatch < 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Refunds not allowed within 2 hours of match start. Match starts in ${hoursUntilMatch.toFixed(1)} hours.`,
        code: 'REFUND_WINDOW_PASSED',
      });
    }

    // Calculate split
    const totalAmount   = parseFloat(payment.amount);
    const refundAmount  = parseFloat((totalAmount * 0.80).toFixed(2));
    const platformFee   = parseFloat((totalAmount * 0.10).toFixed(2));
    const penaltyAmount = parseFloat((totalAmount * 0.10).toFixed(2));

    // Create refund request — pending owner approval
    const refundRequest = await client.query(
      `INSERT INTO refund_requests
        (match_id, player_id, amount, refund_amount,
         platform_fee, penalty_amount, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [match_id, userId, totalAmount, refundAmount,
       platformFee, penaltyAmount, reason || null]
    );

    await client.query('COMMIT');

    // Notify match organizer (owner of match, not turf owner)
    try {
      const io = getIO();
      io.to(`user:${payment.creator_id}`).emit('new_notification', {
        type: 'refund_requested',
        title: '💰 Refund Request',
        message: `${req.user.name} requested a refund for match "${payment.title}"`,
        data: {
          refund_request_id: refundRequest.rows[0].id,
          match_id,
        },
      });
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: 'Refund request submitted. Waiting for organizer approval.',
      data: {
        refund_request_id: refundRequest.rows[0].id,
        amount_paid:    totalAmount,
        refund_amount:  refundAmount,
        platform_fee:   platformFee,
        penalty:        penaltyAmount,
        status:         'pending',
        hours_until_match: hoursUntilMatch.toFixed(1),
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Owner approves or rejects a refund request
// @route   PUT /api/refunds/:requestId/review
// @access  Private (match organizer)
// ─────────────────────────────────────────────────────────────
const reviewRefund = async (req, res, next) => {
  const client = await getClient();
  const { requestId } = req.params;
  const { action } = req.body; // 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Action must be approve or reject.',
    });
  }

  try {
    await client.query('BEGIN');

    // Get request + verify organizer
    const requestResult = await client.query(
      `SELECT rr.*,
        m.title as match_title,
        b.organizer_id as creator_id,
        ts.date as match_date, ts.start_time,
        t.owner_id
       FROM refund_requests rr
       JOIN matches m ON rr.match_id = m.id
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE rr.id = $1 AND rr.status = 'pending'
       FOR UPDATE`,
      [requestId]
    );

    if (!requestResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Refund request not found or already reviewed.',
      });
    }

    const refundReq = requestResult.rows[0];

    // Only match organizer can approve
    if (refundReq.creator_id !== req.user.id && req.user.role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Only the match organizer can review refund requests.',
      });
    }

    // Re-check 2-hour rule at approval time too
    const matchDateTime = new Date(`${refundReq.match_date}T${refundReq.start_time}`);
    const hoursUntilMatch = (matchDateTime - new Date()) / (1000 * 60 * 60);

    if (action === 'approve' && hoursUntilMatch < 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot approve — match starts in ${hoursUntilMatch.toFixed(1)} hours (minimum 2 hours required).`,
        code: 'REFUND_WINDOW_PASSED',
      });
    }

    if (action === 'reject') {
      // Just mark rejected, no money moves
      await client.query(
        `UPDATE refund_requests
         SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [req.user.id, requestId]
      );

      await client.query('COMMIT');

      // Notify player
      try {
        const io = getIO();
        io.to(`user:${refundReq.player_id}`).emit('new_notification', {
          type: 'refund_rejected',
          title: '❌ Refund Rejected',
          message: `Your refund request for "${refundReq.match_title}" was declined.`,
          data: { match_id: refundReq.match_id },
        });
      } catch (_) {}

      return res.json({
        success: true,
        message: 'Refund request rejected.',
      });
    }

    // ── APPROVE: process the wallet transfers ─────────────────
    const adminResult = await client.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );
    if (!adminResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(500).json({
        success: false,
        message: 'System error: admin not found.',
      });
    }
    const adminId = adminResult.rows[0].id;

    // 1. Debit organizer first — if this fails, nothing else runs
    await debitWallet(
      client, refundReq.creator_id, refundReq.amount,
      'match_refund_reversal', refundReq.match_id, 'match',
      `Refund approved — player left: ${refundReq.match_title}`,
      { refund_request_id: requestId, player_id: refundReq.player_id }
    );

    // 2. Credit player 80%
    await creditWallet(
      client, refundReq.player_id, refundReq.refund_amount,
      'match_refund', refundReq.match_id, 'match',
      `Refund approved for: ${refundReq.match_title} (80%)`,
      { refund_request_id: requestId }
    );

    // 3. Credit admin 10% platform fee
    await creditWallet(
      client, adminId, refundReq.platform_fee,
      'refund_platform_fee', refundReq.match_id, 'match',
      `Platform fee — refund: ${refundReq.match_title}`,
      { refund_request_id: requestId, player_id: refundReq.player_id }
    );

    // 4. Credit turf owner 10% penalty
    await creditWallet(
      client, refundReq.owner_id, refundReq.penalty_amount,
      'cancellation_penalty', refundReq.match_id, 'match',
      `Cancellation penalty: ${refundReq.match_title}`,
      { refund_request_id: requestId, player_id: refundReq.player_id }
    );

    // 5. Mark match_payment as refunded
    await client.query(
      `UPDATE match_payments SET status = 'refunded', updated_at = NOW()
       WHERE match_id = $1 AND player_id = $2`,
      [refundReq.match_id, refundReq.player_id]
    );

    // 6. Mark refund_request as processed
    await client.query(
      `UPDATE refund_requests
       SET status = 'processed', reviewed_at = NOW(),
           reviewed_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [req.user.id, requestId]
    );

    await client.query('COMMIT');

    // Notify player
    try {
      const io = getIO();
      io.to(`user:${refundReq.player_id}`).emit('new_notification', {
        type: 'refund_approved',
        title: '✅ Refund Approved!',
        message: `₹${refundReq.refund_amount} has been credited to your wallet for "${refundReq.match_title}"`,
        data: { match_id: refundReq.match_id },
      });
    } catch (_) {}

    res.json({
      success: true,
      message: `Refund of ₹${refundReq.refund_amount} processed to player's wallet.`,
      data: {
        refund_amount:  refundReq.refund_amount,
        platform_fee:   refundReq.platform_fee,
        penalty:        refundReq.penalty_amount,
        total_debited:  refundReq.amount,
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}

    if (err.message?.includes('Insufficient balance')) {
      return res.status(400).json({
        success: false,
        message: 'Refund failed — organizer has insufficient wallet balance.',
        code: 'INSUFFICIENT_BALANCE',
      });
    }
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get pending refund requests for organizer to review
// @route   GET /api/refunds/pending
// @access  Private (organizer)
// ─────────────────────────────────────────────────────────────
const getPendingRefunds = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rr.*,
        u.name as player_name, u.avatar_url as player_avatar,
        m.title as match_title, m.id as match_id,
        ts.date as match_date, ts.start_time
       FROM refund_requests rr
       JOIN users u ON rr.player_id = u.id
       JOIN matches m ON rr.match_id = m.id
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       WHERE b.organizer_id = $1 AND rr.status = 'pending'
       ORDER BY rr.requested_at ASC`,
      [req.user.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get my refund requests (as player)
// @route   GET /api/refunds/my
// @access  Private (player)
// ─────────────────────────────────────────────────────────────
const getMyRefunds = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT rr.*,
        m.title as match_title, m.id as match_id,
        ts.date as match_date, ts.start_time
       FROM refund_requests rr
       JOIN matches m ON rr.match_id = m.id
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       WHERE rr.player_id = $1
       ORDER BY rr.requested_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM refund_requests WHERE player_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page:  parseInt(page),
        pages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get single refund request
// @route   GET /api/refunds/:id
// @access  Private
// ─────────────────────────────────────────────────────────────
const getRefund = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rr.*,
        u.name as player_name,
        m.title as match_title, m.id as match_id,
        ts.date as match_date, ts.start_time
       FROM refund_requests rr
       JOIN users u ON rr.player_id = u.id
       JOIN matches m ON rr.match_id = m.id
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       WHERE rr.id = $1`,
      [req.params.id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Refund not found.' });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};


module.exports = {
  requestRefund,
  reviewRefund,
  getPendingRefunds,
  getMyRefunds,
  getRefund,
};