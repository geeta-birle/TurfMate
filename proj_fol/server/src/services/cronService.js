const cron = require('node-cron');
const { query, getClient } = require('../config/db');
const {
  processMatchSettlement,
} = require('./matchPaymentService');
const { creditWallet } = require('./walletService');

/**
 * MATCH COMPLETION CRON
 */
const startMatchCompletionCron = () => {
  console.log('⏰ Match completion cron started');

  cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await query(
        `SELECT m.id, m.title
         FROM matches m
         JOIN bookings b ON m.booking_id = b.id
         JOIN time_slots ts ON b.slot_id = ts.id
         WHERE m.status IN ('open','full','ongoing')
         AND (ts.date + ts.start_time) < NOW() - INTERVAL '30 minutes'`
      );

      if (!result.rows.length) return;

      console.log(`⏰ ${result.rows.length} matches to complete`);

      for (const match of result.rows) {
        try {
          await processMatchSettlement(match.id);

          // 🔥 ensure status updated
          await query(
            `UPDATE matches SET status = 'completed' WHERE id = $1`,
            [match.id]
          );

          console.log(`✅ Match completed: ${match.id}`);

        } catch (err) {
          console.error(`❌ Settlement failed: ${match.id}`, err.message);
        }
      }
    } catch (err) {
      console.error('❌ Completion cron error:', err.message);
    }
  });
};


/**
 * MATCH CANCELLATION CRON (WITH WALLET REFUND)
 */
const startMatchCancellationCron = () => {
  console.log('⏰ Match cancellation cron started');

  cron.schedule('0 * * * *', async () => {
    try {
      const matches = await query(
        `SELECT m.id
         FROM matches m
         JOIN bookings b ON m.booking_id = b.id
         JOIN time_slots ts ON b.slot_id = ts.id
         WHERE m.status = 'open'
         AND m.current_players < m.team_size
         AND (ts.date + ts.start_time) < NOW() - INTERVAL '2 hours'`
      );

      for (const match of matches.rows) {
        const client = await getClient();

        try {
          await client.query('BEGIN');

          // 🔥 get all payments
          const payments = await client.query(
            `SELECT player_id, amount
             FROM match_payments
             WHERE match_id = $1`,
            [match.id]
          );

          for (const p of payments.rows) {
            await creditWallet(
              client,
              p.player_id,
              parseFloat(p.amount),
              'match_refund',
              match.id,
              'match',
              'Auto refund (match cancelled)'
            );
          }

          // mark payments refunded
          await client.query(
            `UPDATE match_payments
             SET status = 'refunded'
             WHERE match_id = $1`,
            [match.id]
          );

          // cancel match
          await client.query(
            `UPDATE matches
             SET status = 'cancelled'
             WHERE id = $1`,
            [match.id]
          );

          await client.query('COMMIT');

          console.log(`⚠️ Match cancelled + refunded: ${match.id}`);

        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`❌ Cancel failed: ${match.id}`, err.message);
        } finally {
          client.release();
        }
      }

    } catch (err) {
      console.error('❌ Cancellation cron error:', err.message);
    }
  });
};

module.exports = {
  startMatchCompletionCron,
  startMatchCancellationCron,
};