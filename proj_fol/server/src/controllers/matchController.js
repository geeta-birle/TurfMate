const { query, getClient } = require('../config/db');
const { generateInviteCode, getPagination, paginationMeta } = require('../utils/helpers');
const { validationResult } = require('express-validator');
const { getIO } = require('../config/socket');

// ─────────────────────────────────────────────────────────────
// @desc    Create match (after confirmed booking)
// @route   POST /api/matches
// @access  Private
// ─────────────────────────────────────────────────────────────
const createMatch = async (req, res, next) => {
  const client = await getClient();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const {
      booking_id, title, sport_type, team_size,
      skill_level, visibility, description, cost_per_player,
    } = req.body;

    await client.query('BEGIN');

    // Verify booking belongs to user & is confirmed
    const bookingResult = await client.query(
      `SELECT b.*, ts.date, ts.start_time, ts.end_time,
        t.name as turf_name, t.city
       FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE b.id = $1 AND b.organizer_id = $2 AND b.status = 'confirmed'`,
      [booking_id, req.user.id]
    );

    if (!bookingResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Booking not found or not confirmed yet.',
      });
    }

    // Check match doesn't already exist for this booking
    const existingMatch = await client.query(
      'SELECT id FROM matches WHERE booking_id = $1',
      [booking_id]
    );
    if (existingMatch.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'A match already exists for this booking.',
      });
    }

    // Generate unique invite code
    let invite_code;
    let isUnique = false;
    while (!isUnique) {
      invite_code = generateInviteCode();
      const check = await client.query(
        'SELECT id FROM matches WHERE invite_code = $1',
        [invite_code]
      );
      if (!check.rows.length) isUnique = true;
    }

    // Create match — organizer auto-joins as first player
    const match = await client.query(
      `INSERT INTO matches
        (booking_id, title, sport_type, team_size, current_players,
         cost_per_player, skill_level, visibility, description, invite_code)
       VALUES ($1,$2,$3,$4,1,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        booking_id, title, sport_type, team_size,
        cost_per_player || 0, skill_level, visibility,
        description, invite_code,
      ]
    );

    // Add organizer as confirmed player
    await client.query(
      `INSERT INTO match_players (match_id, player_id, status, payment_status)
       VALUES ($1, $2, 'confirmed', 'success')`,
      [match.rows[0].id, req.user.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Match created successfully! 🏆',
      data: {
        ...match.rows[0],
        booking: bookingResult.rows[0],
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Discover open matches
// @route   GET /api/matches
// @access  Public
// ─────────────────────────────────────────────────────────────
const getMatches = async (req, res, next) => {
  try {
    const {
      city, sport_type, skill_level, date,
      page = 1, limit = 10,
    } = req.query;

    const { limit: lim, offset } = getPagination(page, limit);

    let conditions = [
      "m.visibility = 'open'",
      "m.status IN ('open', 'full')",
      'ts.date >= CURRENT_DATE',
    ];
    let params = [];
    let idx = 1;

    if (city) {
      conditions.push(`LOWER(t.city) = LOWER($${idx++})`);
      params.push(city);
    }
    if (sport_type) {
      conditions.push(`m.sport_type = $${idx++}`);
      params.push(sport_type);
    }
    if (skill_level) {
      conditions.push(`m.skill_level = $${idx++}`);
      params.push(skill_level);
    }
    if (date) {
      conditions.push(`ts.date = $${idx++}`);
      params.push(date);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       ${whereClause}`,
      params
    );

    params.push(lim, offset);
    const result = await query(
      `SELECT m.*,
        ts.date, ts.start_time, ts.end_time,
        t.name as turf_name, t.address, t.city, t.images,
        u.name as organizer_name, u.avatar_url as organizer_avatar,
        (m.team_size - m.current_players) as spots_left
       FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       JOIN users u ON b.organizer_id = u.id
       ${whereClause}
       ORDER BY ts.date ASC, ts.start_time ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: paginationMeta(parseInt(countResult.rows[0].count), page, lim),
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get single match detail
// @route   GET /api/matches/:id
// @access  Public
// ─────────────────────────────────────────────────────────────
const getMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT m.*,
        ts.date, ts.start_time, ts.end_time,
        t.id as turf_id, t.name as turf_name, t.address,
        t.city, t.images, t.lat, t.lng,
        u.id as organizer_id, u.name as organizer_name,
        u.avatar_url as organizer_avatar,
        (m.team_size - m.current_players) as spots_left
       FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       JOIN users u ON b.organizer_id = u.id
       WHERE m.id = $1`,
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Match not found.' });

    // Get confirmed players
    const players = await query(
      `SELECT mp.*, u.name, u.avatar_url, u.skill_level, u.city
       FROM match_players mp
       JOIN users u ON mp.player_id = u.id
       WHERE mp.match_id = $1 AND mp.status = 'confirmed'
       ORDER BY mp.joined_at ASC`,
      [id]
    );

    // Get pending requests (for organizer)
    const pendingRequests = await query(
      `SELECT mp.*, u.name, u.avatar_url, u.skill_level
       FROM match_players mp
       JOIN users u ON mp.player_id = u.id
       WHERE mp.match_id = $1 AND mp.status = 'pending'`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        players: players.rows,
        pending_requests: pendingRequests.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Join match by ID or invite code
// @route   POST /api/matches/:id/join
// @access  Private (player)
// ─────────────────────────────────────────────────────────────
const joinMatch = async (req, res, next) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const { invite_code } = req.body;
    const playerId = req.user.id;

    await client.query('BEGIN');

    // Lock match row — support join by ID or invite code
    const matchResult = await client.query(
      `SELECT m.*, b.organizer_id,
        ts.date, ts.start_time, t.name as turf_name
       FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE (m.id = $1 OR m.invite_code = $2)
       FOR UPDATE`,
      [id, invite_code || '']
    );

    if (!matchResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Match not found.' });
    }

    const match = matchResult.rows[0];

    // ── Validations ────────────────────────────────────────
    if (match.status === 'cancelled' || match.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Match is ${match.status}.`,
      });
    }

    if (match.status === 'full') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Match is full. No spots available.',
      });
    }

    if (match.visibility === 'private' && match.invite_code !== invite_code) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Invalid invite code for this private match.',
      });
    }

    if (match.organizer_id === playerId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'You are the organizer of this match.',
      });
    }

    // Prevent double-join (idempotency guard)
    const alreadyJoined = await client.query(
      `SELECT id, status FROM match_players
       WHERE match_id = $1 AND player_id = $2`,
      [match.id, playerId]
    );
    if (alreadyJoined.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `You already ${alreadyJoined.rows[0].status === 'pending'
          ? 'requested to join'
          : 'joined'} this match.`,
      });
    }

    // Prevent double-payment (extra safety)
    const alreadyPaid = await client.query(
      `SELECT id FROM match_payments
       WHERE match_id = $1 AND player_id = $2`,
      [match.id, playerId]
    );
    if (alreadyPaid.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Payment already processed for this match.',
      });
    }

    // ── Wallet payment ─────────────────────────────────────
    const costPerPlayer = parseFloat(match.cost_per_player || 0);
    let paymentResult = null;

    if (costPerPlayer > 0) {
      const { debitWallet, creditWallet } = require('../services/walletService');

      // debitWallet handles the FOR UPDATE lock + insufficient balance check
      const playerTxn = await debitWallet(
        client, playerId, costPerPlayer,
        'match_join', match.id, 'match',
        `Joined match: ${match.title}`,
        { match_id: match.id, creator_id: match.organizer_id }
      );

      const creatorTxn = await creditWallet(
        client, match.organizer_id, costPerPlayer,
        'match_join', match.id, 'match',
        `Player joined your match: ${match.title}`,
        { match_id: match.id, player_id: playerId }
      );

      const matchPaymentResult = await client.query(
        `INSERT INTO match_payments
          (match_id, player_id, amount, status, txn_id)
         VALUES ($1, $2, $3, 'held', $4)
         RETURNING *`,
        [match.id, playerId, costPerPlayer, playerTxn.id]
      );

      paymentResult = {
        match_payment: matchPaymentResult.rows[0],
        amount_paid: costPerPlayer,
        player_txn: playerTxn,
        creator_txn: creatorTxn,
      };
    }

    // ── Add to match ───────────────────────────────────────
    // Open matches: auto-confirm. Private matches: pending approval.
    const playerStatus = match.visibility === 'open' ? 'confirmed' : 'pending';
    const paymentStatus = costPerPlayer > 0 ? 'success' : 'pending';

    await client.query(
      `INSERT INTO match_players (match_id, player_id, status, payment_status)
       VALUES ($1, $2, $3, $4)`,
      [match.id, playerId, playerStatus, paymentStatus]
    );

    let newCount = match.current_players;
    let newStatus = match.status;

    if (playerStatus === 'confirmed') {
      newCount = match.current_players + 1;
      newStatus = newCount >= match.team_size ? 'full' : 'open';

      await client.query(
        `UPDATE matches SET current_players = $1, status = $2 WHERE id = $3`,
        [newCount, newStatus, match.id]
      );
    }

    await client.query('COMMIT');

    // ── Socket notifications ───────────────────────────────
    try {
      const io = getIO();
      io.to(`user:${match.organizer_id}`).emit('new_notification', {
        type: playerStatus === 'confirmed' ? 'player_joined' : 'join_request',
        title: playerStatus === 'confirmed' ? 'Player Joined! 🙌' : 'New Join Request',
        message: `${req.user.name} ${playerStatus === 'confirmed'
          ? 'joined'
          : 'requested to join'} your match "${match.title}"`,
        data: { match_id: match.id },
      });
      io.to(`match:${match.id}`).emit('player_joined', {
        player: { id: playerId, name: req.user.name },
        current_players: newCount,
      });
      if (newStatus === 'full') {
        io.to(`match:${match.id}`).emit('match_full', { match_id: match.id });
      }
    } catch (_) { /* non-critical */ }

    res.status(201).json({
      success: true,
      message: playerStatus === 'confirmed'
        ? `You joined the match! 🎉${costPerPlayer > 0 ? ` ₹${costPerPlayer.toFixed(2)} deducted from wallet.` : ''}`
        : 'Join request sent! Waiting for organizer approval.',
      data: {
        match_id: match.id,
        status: playerStatus,
        payment_status: paymentStatus,
        payment: paymentResult,
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}

    // Friendly error for insufficient balance
    if (err.message && err.message.includes('Insufficient balance')) {
      return res.status(400).json({
        success: false,
        message: err.message,
        code: 'INSUFFICIENT_BALANCE',
      });
    }
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Approve or reject join request (organizer only)
// @route   PUT /api/matches/:id/players/:playerId
// @access  Private (organizer)
// ─────────────────────────────────────────────────────────────
const handleJoinRequest = async (req, res, next) => {
  const client = await getClient();
  try {
    const { id, playerId } = req.params;
    const { action } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({
        success: false,
        message: 'Action must be approve or reject.',
      });

    await client.query('BEGIN');

    const matchResult = await client.query(
      `SELECT m.*, b.organizer_id FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       WHERE m.id = $1 FOR UPDATE`,
      [id]
    );

    if (!matchResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Match not found.' });
    }

    const match = matchResult.rows[0];

    if (match.organizer_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Only organizer can manage requests.',
      });
    }

    if (action === 'approve' && match.current_players >= match.team_size) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Match is already full.' });
    }

    const newStatus = action === 'approve' ? 'confirmed' : 'rejected';

    await client.query(
      `UPDATE match_players SET status = $1
       WHERE match_id = $2 AND player_id = $3`,
      [newStatus, id, playerId]
    );

    if (action === 'approve') {
      const newCount = match.current_players + 1;
      const newMatchStatus = newCount >= match.team_size ? 'full' : 'open';
      await client.query(
        `UPDATE matches SET current_players = $1, status = $2 WHERE id = $3`,
        [newCount, newMatchStatus, id]
      );
    }

    await client.query('COMMIT');

    try {
      const io = getIO();
      io.to(`user:${playerId}`).emit('new_notification', {
        type: action === 'approve' ? 'request_approved' : 'request_rejected',
        title: action === 'approve' ? 'Request Approved! ✅' : 'Request Rejected',
        message: action === 'approve'
          ? `You've been approved to join "${match.title}"!`
          : `Your request to join "${match.title}" was declined.`,
        data: { match_id: id },
      });
      if (action === 'approve') {
        io.to(`match:${id}`).emit('player_joined', {
          player: { id: playerId },
          current_players: match.current_players + 1,
        });
      }
    } catch (_) {}

    res.json({
      success: true,
      message: `Player ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Leave a match (with wallet refund)
// @route   POST /api/matches/:id/leave
// @access  Private (player)
//
// Business rules enforced here:
//   • Organizer cannot leave — must cancel.
//   • Cannot leave after payment is 'released' (settlement done).
//   • If payment is 'held':
//       – >= 3 hours before match  →  80% refund, 10% admin, 10% owner
//       –  < 3 hours before match  →  no refund allowed
//   • If cost was 0, player is simply removed.
//   • Creator wallet MUST have enough balance to cover the debit.
//     If not, the leave is rejected — no partial/asymmetric reversals.
// ─────────────────────────────────────────────────────────────
const leaveMatch = async (req, res, next) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const playerId = req.user.id;

    await client.query('BEGIN');

    // Lock match row
    const matchResult = await client.query(
      `SELECT m.*, b.organizer_id,
        t.owner_id,
        ts.date as match_date,
        ts.start_time
       FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE m.id = $1 FOR UPDATE`,
      [id]
    );

    if (!matchResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Match not found.' });
    }

    const match = matchResult.rows[0];

    if (match.organizer_id === playerId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Organizer cannot leave. Cancel the match instead.',
      });
    }

    if (match.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot leave a completed match.',
      });
    }

    // Verify player is actually confirmed in this match
    const playerResult = await client.query(
      `SELECT id FROM match_players
       WHERE match_id = $1 AND player_id = $2 AND status = 'confirmed'
       FOR UPDATE`,
      [id, playerId]
    );

    if (!playerResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'You are not confirmed in this match.',
      });
    }

    // Get payment record (locked)
    const paymentResult = await client.query(
      `SELECT id, amount, status FROM match_payments
       WHERE match_id = $1 AND player_id = $2
       FOR UPDATE`,
      [id, playerId]
    );

    let refundSummary = null;

    if (paymentResult.rows.length > 0) {
      const payment = paymentResult.rows[0];

      if (payment.status === 'released') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Cannot leave — match settlement is already done.',
        });
      }

      if (payment.status === 'held') {
        const paidAmount = parseFloat(payment.amount);

        if (paidAmount > 0) {
          // ── Time check (>= 3 hours required for any refund) ──────────
          const matchDateTime = new Date(
            `${match.match_date}T${match.start_time}`
          );
          const hoursUntil = (matchDateTime - new Date()) / (1000 * 60 * 60);

          if (hoursUntil < 3) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              success: false,
              message: `Refund not allowed. Match starts in ${hoursUntil.toFixed(1)} hours. Minimum 3 hours required.`,
              code: 'REFUND_WINDOW_PASSED',
            });
          }

          // ── Get admin user ────────────────────────────────────────────
          const adminResult = await client.query(
            `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
          );
          if (!adminResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(500).json({
              success: false,
              message: 'System error: admin user not found.',
            });
          }
          const adminId = adminResult.rows[0].id;

          // ── Calculate split ───────────────────────────────────────────
          const refundToPlayer    = parseFloat((paidAmount * 0.80).toFixed(2));
          const platformFeeAmount = parseFloat((paidAmount * 0.10).toFixed(2));
          const penaltyAmount     = parseFloat((paidAmount * 0.10).toFixed(2));

          const { debitWallet, creditWallet } = require('../services/walletService');

          // IMPORTANT: Debit creator FIRST. If creator can't cover it,
          // the entire transaction rolls back — no asymmetric state.
          await debitWallet(
            client, match.organizer_id, paidAmount,
            'match_refund', match.id, 'match',
            `Refund processed — player left match: ${match.title}`,
            { match_id: id, player_id: playerId }
          );

          // Credit player (80%)
          await creditWallet(
            client, playerId, refundToPlayer,
            'match_refund', match.id, 'match',
            `Refund for leaving match: ${match.title} (80%)`,
            { match_id: id }
          );

          // Credit admin (10% platform fee)
          await creditWallet(
            client, adminId, platformFeeAmount,
            'settlement_platform_fee', match.id, 'match',
            `Platform fee — match refund: ${match.title}`,
            { match_id: id, player_id: playerId }
          );

          // Credit turf owner (10% penalty)
          await creditWallet(
            client, match.owner_id, penaltyAmount,
            'cancellation_penalty', match.id, 'match',
            `Cancellation penalty: ${match.title}`,
            { match_id: id, player_id: playerId }
          );

          // Mark payment as refunded
          await client.query(
            `UPDATE match_payments SET status = 'refunded', updated_at = NOW()
             WHERE id = $1`,
            [payment.id]
          );

          refundSummary = {
            paid_amount: paidAmount,
            refund_to_player: refundToPlayer,
            platform_fee: platformFeeAmount,
            owner_penalty: penaltyAmount,
            hours_until_match: hoursUntil.toFixed(1),
          };

          // Log in refunds table
          const bookingRow = await client.query(
            `SELECT booking_id FROM matches WHERE id = $1`, [id]
          );
          if (bookingRow.rows.length) {
            await client.query(
              `INSERT INTO refunds
                (booking_id, user_id, amount, reason, status,
                 refunded_amount, platform_fee_amount, penalty_amount)
               VALUES ($1,$2,$3,$4,'completed',$5,$6,$7)`,
              [
                bookingRow.rows[0].booking_id, playerId,
                paidAmount, 'Player left match before start',
                refundToPlayer, platformFeeAmount, penaltyAmount,
              ]
            );
          }
        }
      }
    }

    // ── Remove player from match ────────────────────────────────────
    await client.query(
      `DELETE FROM match_players WHERE match_id = $1 AND player_id = $2`,
      [id, playerId]
    );

    // Minimum 1 to preserve organizer slot count
    const newCount = Math.max(1, match.current_players - 1);
    const newStatus = (match.status === 'full' && newCount < match.team_size)
      ? 'open'
      : match.status;

    await client.query(
      `UPDATE matches SET current_players = $1, status = $2 WHERE id = $3`,
      [newCount, newStatus, id]
    );

    await client.query('COMMIT');

    // ── Socket notifications ────────────────────────────────────────
    try {
      const io = getIO();
      io.to(`match:${id}`).emit('player_left', {
        player_id: playerId,
        current_players: newCount,
      });
      io.to(`user:${match.organizer_id}`).emit('new_notification', {
        type: 'player_left',
        title: 'Player Left',
        message: `${req.user.name} left your match "${match.title}"`,
        data: { match_id: id },
      });
    } catch (_) {}

    const paidAmount = refundSummary?.paid_amount || 0;

    res.json({
      success: true,
      message: paidAmount > 0
        ? `Left match. ₹${refundSummary.refund_to_player} refunded to your wallet (80%).`
        : 'You have left the match.',
      data: refundSummary || {},
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}

    // Surface refund-window errors cleanly
    if (err.message && (
      err.message.includes('Refund not allowed') ||
      err.message.includes('Insufficient balance')
    )) {
      return res.status(400).json({
        success: false,
        message: err.message,
        code: err.message.includes('Insufficient') ? 'INSUFFICIENT_BALANCE' : 'REFUND_WINDOW_PASSED',
      });
    }
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get my matches (as organizer or player)
// @route   GET /api/matches/my
// @access  Private
// ─────────────────────────────────────────────────────────────
const getMyMatches = async (req, res, next) => {
  try {
    const { role = 'all' } = req.query;

    let matchIds = new Set();

    if (role === 'all' || role === 'organizer') {
      const result = await query(
        `SELECT m.id FROM matches m
         JOIN bookings b ON m.booking_id = b.id
         WHERE b.organizer_id = $1`,
        [req.user.id]
      );
      result.rows.forEach(r => matchIds.add(r.id));
    }

    if (role === 'all' || role === 'player') {
      const result = await query(
        `SELECT match_id as id FROM match_players
         WHERE player_id = $1 AND status = 'confirmed'`,
        [req.user.id]
      );
      result.rows.forEach(r => matchIds.add(r.id));
    }

    if (!matchIds.size)
      return res.json({ success: true, data: [] });

    const ids = Array.from(matchIds);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');

    const result = await query(
      `SELECT m.*,
        ts.date, ts.start_time, ts.end_time,
        t.name as turf_name, t.city, t.images,
        u.name as organizer_name,
        (m.team_size - m.current_players) as spots_left,
        CASE WHEN b.organizer_id = $${ids.length + 1}
             THEN true ELSE false END as is_organizer
       FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       JOIN users u ON b.organizer_id = u.id
       WHERE m.id IN (${placeholders})
       ORDER BY ts.date DESC`,
      [...ids, req.user.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Cancel match (organizer or admin)
// @route   PUT /api/matches/:id/cancel
// @access  Private
// ─────────────────────────────────────────────────────────────
const cancelMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT m.*, b.organizer_id FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       WHERE m.id = $1`,
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Match not found.' });

    if (result.rows[0].organizer_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    await query(
      `UPDATE matches SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    const players = await query(
      `SELECT player_id FROM match_players WHERE match_id = $1 AND status = 'confirmed'`,
      [id]
    );

    try {
      const io = getIO();
      players.rows.forEach(p => {
        io.to(`user:${p.player_id}`).emit('new_notification', {
          type: 'match_cancelled',
          title: 'Match Cancelled ❌',
          message: `The match "${result.rows[0].title}" has been cancelled.`,
          data: { match_id: id },
        });
      });
      io.to(`match:${id}`).emit('match_updated', { status: 'cancelled' });
    } catch (_) {}

    res.json({ success: true, message: 'Match cancelled.' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Update match status (admin/organizer)
// @route   PATCH /api/matches/:id/status
// @access  Private
// ─────────────────────────────────────────────────────────────
const updateMatchStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'full', 'ongoing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status))
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });

    const result = await query(
      `SELECT m.*, b.organizer_id FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       WHERE m.id = $1`,
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Match not found.' });

    if (result.rows[0].organizer_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const updatedMatch = await query(
      `UPDATE matches SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    try {
      const io = getIO();
      io.to(`match:${id}`).emit('match_updated', { status });
    } catch (_) {}

    res.json({
      success: true,
      message: `Match status updated to ${status}`,
      data: updatedMatch.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Delete match (admin only)
// @route   DELETE /api/matches/:id
// @access  Private (admin)
// ─────────────────────────────────────────────────────────────
const deleteMatch = async (req, res, next) => {
  const client = await getClient();
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({
        success: false,
        message: 'Only admin can delete matches.',
      });

    await client.query('BEGIN');

    const result = await client.query(
      `SELECT id FROM matches WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Match not found.' });
    }

    await client.query('DELETE FROM matches WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');

    res.json({ success: true, message: 'Match deleted successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// Alias — routes file may import either name
const getMatchById = getMatch;

module.exports = {
  createMatch,
  getMatches,
  getMatch,
  getMatchById,
  joinMatch,
  handleJoinRequest,
  leaveMatch,
  getMyMatches,
  cancelMatch,
  updateMatchStatus,
  deleteMatch,
};