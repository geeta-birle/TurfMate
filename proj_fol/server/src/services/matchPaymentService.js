const { query, getClient } = require('../config/db');
const { debitWallet, creditWallet } = require('./walletService');

/**
 * PLAYER JOINS MATCH — deduct from player wallet,
 * credit to match creator wallet
 *
 * Flow:
 * 1. Verify match is open + player not already joined
 * 2. Get cost_per_player
 * 3. BEGIN transaction
 * 4. Lock match row (FOR UPDATE)
 * 5. Debit player wallet
 * 6. Credit creator wallet
 * 7. Insert match_payment record
 * 8. Insert match_players record
 * 9. Update match current_players
 * 10. COMMIT
 */
const processMatchJoinPayment = async (matchId, playerId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock match row and get full details
    const matchResult = await client.query(
      `SELECT m.*, b.organizer_id as creator_id,
        ts.date, ts.start_time
       FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       WHERE m.id = $1
       FOR UPDATE`,
      [matchId]
    );

    if (!matchResult.rows.length)
      throw new Error('Match not found.');

    const match = matchResult.rows[0];

    // Validations
    if (match.status === 'cancelled')
      throw new Error('Match has been cancelled.');

    if (match.status === 'completed')
      throw new Error('Match is already completed.');

    if (match.status === 'full')
      throw new Error('Match is full. No spots available.');

    if (match.creator_id === playerId)
      throw new Error('You are the organizer of this match.');

    // Check already joined
    const alreadyJoined = await client.query(
      `SELECT id, status FROM match_players
       WHERE match_id = $1 AND player_id = $2`,
      [matchId, playerId]
    );
    if (alreadyJoined.rows.length)
      throw new Error('You have already joined this match.');

    // Check already paid (extra safety)
    const alreadyPaid = await client.query(
      `SELECT id FROM match_payments
       WHERE match_id = $1 AND player_id = $2`,
      [matchId, playerId]
    );
    if (alreadyPaid.rows.length)
      throw new Error('Payment already processed for this match.');

    const costPerPlayer = parseFloat(match.cost_per_player || 0);

    let playerTxn = null;
    let creatorTxn = null;

    // Only process payment if cost > 0
    if (costPerPlayer > 0) {
      // Debit player wallet
      playerTxn = await debitWallet(
        client, playerId, costPerPlayer,
        'match_join', match.id, 'match',
        `Joined match: ${match.title}`,
        { match_id: matchId, creator_id: match.creator_id }
      );

      // Credit match creator wallet
      creatorTxn = await creditWallet(
        client, match.creator_id, costPerPlayer,
        'match_join', match.id, 'match',
        `Player joined your match: ${match.title}`,
        { match_id: matchId, player_id: playerId }
      );
    }

    // Record match payment
    const matchPayment = await client.query(
      `INSERT INTO match_payments
        (match_id, player_id, amount, status, txn_id)
       VALUES ($1, $2, $3, 'held', $4)
       RETURNING *`,
      [matchId, playerId, costPerPlayer,
       playerTxn?.id || null]
    );

    // Add player to match
    await client.query(
      `INSERT INTO match_players
        (match_id, player_id, status, payment_status)
       VALUES ($1, $2, 'confirmed', 'success')`,
      [matchId, playerId]
    );

    // Update player count + status
    const newCount = match.current_players + 1;
    const newStatus = newCount >= match.team_size ? 'full' : 'open';

    await client.query(
      `UPDATE matches SET current_players = $1, status = $2
       WHERE id = $3`,
      [newCount, newStatus, matchId]
    );

    await client.query('COMMIT');

    return {
      match_payment: matchPayment.rows[0],
      amount_paid: costPerPlayer,
      player_txn: playerTxn,
      creator_txn: creatorTxn,
      new_count: newCount,
      new_status: newStatus,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * SETTLEMENT — After match completes:
 * Creator wallet → Turf Owner wallet (minus platform fee)
 * Creator wallet → Admin wallet (platform fee)
 *
 * Flow:
 * 1. Get total collected from all match_payments
 * 2. Calculate: platform_fee = 10%, owner_amount = 90%
 * 3. Debit creator wallet (total collected)
 * 4. Credit owner wallet (90%)
 * 5. Credit admin wallet (10%)
 * 6. Update match_payments status to 'released'
 * 7. Insert settlement record
 */
const processMatchSettlement = async (matchId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get match + booking + turf owner + admin details
    const matchResult = await client.query(
      `SELECT m.*,
        b.id as booking_id,
        b.organizer_id as creator_id,
        b.total_amount as booking_amount,
        b.platform_fee as booking_fee,
        t.owner_id,
        ts.date as match_date,
        ts.start_time
       FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE m.id = $1
       FOR UPDATE`,
      [matchId]
    );

    if (!matchResult.rows.length)
      throw new Error('Match not found.');

    const match = matchResult.rows[0];

    // Check settlement not already done
    const existingSettlement = await client.query(
      `SELECT id FROM settlements WHERE match_id = $1
       AND status = 'completed'`,
      [matchId]
    );
    if (existingSettlement.rows.length)
      throw new Error('Settlement already completed for this match.');

    // Get admin user
    const adminResult = await client.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );
    if (!adminResult.rows.length)
      throw new Error('No admin user found.');

    const adminId = adminResult.rows[0].id;

    // Calculate total collected from players
    const paymentsResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM match_payments
       WHERE match_id = $1 AND status = 'held'`,
      [matchId]
    );

    const totalCollected = parseFloat(
      paymentsResult.rows[0].total
    );

    let platformFee = 0;
    let ownerAmount = 0;

    if (totalCollected > 0) {
      platformFee = parseFloat((totalCollected * 0.10).toFixed(2));
      ownerAmount = parseFloat((totalCollected - platformFee).toFixed(2));

      // Debit creator wallet (total collected from players)
      await debitWallet(
        client, match.creator_id, totalCollected,
        'settlement_to_owner', match.id, 'match',
        `Settlement for match: ${match.title}`,
        { match_id: matchId, owner_id: match.owner_id }
      );

      // Credit turf owner wallet (90%)
      await creditWallet(
        client, match.owner_id, ownerAmount,
        'settlement_to_owner', match.id, 'match',
        `Match settlement received: ${match.title}`,
        { match_id: matchId, creator_id: match.creator_id }
      );

      // Credit admin wallet (10% platform fee)
      await creditWallet(
        client, adminId, platformFee,
        'settlement_platform_fee', match.id, 'match',
        `Platform fee from match: ${match.title}`,
        { match_id: matchId }
      );
    }

    // Mark match payments as released
    await client.query(
      `UPDATE match_payments SET status = 'released',
       updated_at = NOW()
       WHERE match_id = $1 AND status = 'held'`,
      [matchId]
    );

    // Update match status to completed
    await client.query(
      `UPDATE matches SET status = 'completed',
       updated_at = NOW()
       WHERE id = $1`,
      [matchId]
    );

    // Insert settlement record
    const settlement = await client.query(
      `INSERT INTO settlements
        (match_id, booking_id, total_collected,
         platform_fee, owner_amount, status, settled_at)
       VALUES ($1,$2,$3,$4,$5,'completed', NOW())
       RETURNING *`,
      [matchId, match.booking_id, totalCollected,
       platformFee, ownerAmount]
    );

    await client.query('COMMIT');

    return {
      settlement: settlement.rows[0],
      total_collected: totalCollected,
      platform_fee: platformFee,
      owner_amount: ownerAmount,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * REFUND — Player leaves match before start
 *
 * Rules:
 * - Only if >= 3 hours before match time
 * - 80% refund to player wallet
 * - 10% platform fee to admin wallet
 * - 10% penalty to turf owner wallet
 * - Debit from creator wallet
 */
const processMatchRefund = async (matchId, playerId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get match details
    const matchResult = await client.query(
      `SELECT m.*,
        b.organizer_id as creator_id,
        t.owner_id,
        ts.date as match_date,
        ts.start_time
       FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE m.id = $1
       FOR UPDATE`,
      [matchId]
    );

    if (!matchResult.rows.length)
      throw new Error('Match not found.');

    const match = matchResult.rows[0];

    if (match.status === 'completed')
      throw new Error('Cannot refund — match already completed.');

    // Check time constraint (>= 3 hours before)
    const matchDateTime = new Date(
      `${match.match_date}T${match.start_time}`
    );
    const now = new Date();
    const hoursUntil = (matchDateTime - now) / (1000 * 60 * 60);

    if (hoursUntil < 3)
      throw new Error(
        `Refund not allowed. Match starts in ${hoursUntil.toFixed(1)} hours. Minimum 3 hours required.`
      );

    // Get match payment record
    const paymentResult = await client.query(
      `SELECT * FROM match_payments
       WHERE match_id = $1 AND player_id = $2
       AND status = 'held'
       FOR UPDATE`,
      [matchId, playerId]
    );

    if (!paymentResult.rows.length)
      throw new Error('No active payment found for this match.');

    const payment = paymentResult.rows[0];
    const paidAmount = parseFloat(payment.amount);

    // Check existing refund
    const existingRefund = await client.query(
      `SELECT id FROM refunds
       WHERE booking_id = (
         SELECT booking_id FROM matches WHERE id = $1
       ) AND user_id = $2
       AND status != 'failed'`,
      [matchId, playerId]
    );
    if (existingRefund.rows.length)
      throw new Error('Refund already requested.');

    // Get admin
    const adminResult = await client.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );
    const adminId = adminResult.rows[0].id;

    let refundToPlayer = 0;
    let platformFeeAmount = 0;
    let penaltyAmount = 0;

    if (paidAmount > 0) {
      refundToPlayer     = parseFloat((paidAmount * 0.80).toFixed(2));
      platformFeeAmount  = parseFloat((paidAmount * 0.10).toFixed(2));
      penaltyAmount      = parseFloat((paidAmount * 0.10).toFixed(2));

      // Debit creator wallet (full amount back out)
      await debitWallet(
        client, match.creator_id, paidAmount,
        'match_refund', match.id, 'match',
        `Refund processed — player left match: ${match.title}`,
        { match_id: matchId, player_id: playerId }
      );

      // Credit player wallet (80%)
      const refundTxn = await creditWallet(
        client, playerId, refundToPlayer,
        'match_refund', match.id, 'match',
        `Refund for leaving match: ${match.title} (80%)`,
        { match_id: matchId }
      );

      // Credit admin wallet (10%)
      await creditWallet(
        client, adminId, platformFeeAmount,
        'settlement_platform_fee', match.id, 'match',
        `Platform fee — match refund: ${match.title}`,
        { match_id: matchId, player_id: playerId }
      );

      // Credit turf owner wallet (10% penalty)
      await creditWallet(
        client, match.owner_id, penaltyAmount,
        'cancellation_penalty', match.id, 'match',
        `Cancellation penalty from match: ${match.title}`,
        { match_id: matchId, player_id: playerId }
      );

      // Update match payment status
      await client.query(
        `UPDATE match_payments SET status = 'refunded',
         updated_at = NOW()
         WHERE id = $1`,
        [payment.id]
      );
    }

    // Remove player from match
    await client.query(
      `DELETE FROM match_players
       WHERE match_id = $1 AND player_id = $2`,
      [matchId, playerId]
    );

    // Decrease player count
    const newCount = Math.max(0, match.current_players - 1);
    await client.query(
      `UPDATE matches SET current_players = $1,
        status = CASE WHEN status = 'full' THEN 'open'
                 ELSE status END
       WHERE id = $2`,
      [newCount, matchId]
    );

    // Log refund record
    const bookingResult = await client.query(
      `SELECT id FROM bookings WHERE id = (
         SELECT booking_id FROM matches WHERE id = $1
       )`,
      [matchId]
    );

    await client.query(
      `INSERT INTO refunds
        (booking_id, user_id, amount, reason, status,
         refunded_amount, platform_fee_amount, penalty_amount)
       VALUES ($1,$2,$3,$4,'completed',$5,$6,$7)`,
      [
        bookingResult.rows[0].id, playerId,
        paidAmount, 'Player left match before start',
        refundToPlayer, platformFeeAmount, penaltyAmount,
      ]
    );

    await client.query('COMMIT');

    return {
      paid_amount: paidAmount,
      refund_to_player: refundToPlayer,
      platform_fee: platformFeeAmount,
      owner_penalty: penaltyAmount,
      hours_until_match: hoursUntil.toFixed(1),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  processMatchJoinPayment,
  processMatchSettlement,
  processMatchRefund,
};