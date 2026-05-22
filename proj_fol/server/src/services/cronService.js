const cron = require('node-cron');
const { query, getClient } = require('../config/db');
const { processMatchSettlement } = require('./matchPaymentService');
const { creditWallet, debitWallet } = require('./walletService');

// ─────────────────────────────────────────────────────────────
// MATCH COMPLETION CRON — runs every 5 minutes
// Finds matches whose slot time passed 30+ minutes ago
// and processes settlement + marks as completed.
// ─────────────────────────────────────────────────────────────
const startMatchCompletionCron = () => {
  console.log('⏰ Match completion cron started');

  cron.schedule('*/5 * * * *', async () => {
    try {
      // FIX 1: (ts.date + ts.start_time) is invalid SQL — PostgreSQL
      // cannot add a date and a time column with plain +.
      // Correct cast: (ts.date::date + ts.start_time::time)
      const result = await query(
        `SELECT m.id, m.title
         FROM matches m
         JOIN bookings  b  ON m.booking_id  = b.id
         JOIN time_slots ts ON b.slot_id    = ts.id
         WHERE m.status IN ('open', 'full', 'ongoing')
           AND (ts.date::date + ts.start_time::time)
                 < NOW() - INTERVAL '30 minutes'`
      );

      if (!result.rows.length) return;

      console.log(`⏰ ${result.rows.length} match(es) to complete`);

      for (const match of result.rows) {
        try {
          // processMatchSettlement already sets status = 'completed'
          // FIX 2: Don't call UPDATE matches SET status = 'completed' again
          // after processMatchSettlement — it's redundant and risks
          // overwriting a 'failed' status set by the settlement function
          // in an error path.
          await processMatchSettlement(match.id);
          console.log(`✅ Match settled: ${match.id} — ${match.title}`);
        } catch (err) {
          console.error(`❌ Settlement failed for match ${match.id}:`, err.message);
          // Mark as completed anyway so cron doesn't retry infinitely,
          // but log clearly so ops can investigate
          try {
            await query(
              `UPDATE matches SET status = 'completed', updated_at = NOW()
               WHERE id = $1 AND status NOT IN ('completed', 'cancelled')`,
              [match.id]
            );
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error('❌ Completion cron error:', err.message);
    }
  });
};

// ─────────────────────────────────────────────────────────────
// MATCH CANCELLATION CRON — runs every hour
// Cancels matches that never filled and refunds all players.
//
// FIX 3: Original only credited players but never debited the
// creator wallet first. This creates free money — players get
// refunded from thin air. The creator must be debited the
// total collected before players are credited back.
// ─────────────────────────────────────────────────────────────
const startMatchCancellationCron = () => {
  console.log('⏰ Match cancellation cron started');

  cron.schedule('0 * * * *', async () => {
    try {
      // FIX 1 (same as above): correct date+time SQL cast
      const matches = await query(
        `SELECT m.id, m.title,
                b.organizer_id as creator_id
         FROM matches m
         JOIN bookings  b  ON m.booking_id  = b.id
         JOIN time_slots ts ON b.slot_id    = ts.id
         WHERE m.status = 'open'
           AND m.current_players < m.team_size
           AND (ts.date::date + ts.start_time::time)
                 < NOW() - INTERVAL '2 hours'`
      );

      if (!matches.rows.length) return;

      console.log(`⏰ ${matches.rows.length} match(es) to cancel`);

      for (const match of matches.rows) {
        const client = await getClient();
        try {
          await client.query('BEGIN');

          // Get all held payments for this match
          const payments = await client.query(
            `SELECT mp.player_id, mp.amount
             FROM match_payments mp
             WHERE mp.match_id = $1
               AND mp.status   = 'held'
             FOR UPDATE`,
            [match.id]
          );

          if (payments.rows.length > 0) {
            // Calculate total to debit from creator
            const total = payments.rows.reduce(
              (sum, p) => sum + parseFloat(p.amount), 0
            );

            // FIX 3: Debit creator first — if they don't have the balance,
            // rollback and skip this match (don't silently create money).
            if (total > 0) {
              await debitWallet(
                client,
                match.creator_id,
                total,
                'match_refund',
                match.id,
                'match',
                `Auto-cancel refund pool: ${match.title}`,
                { match_id: match.id, auto_cancelled: true }
              );

              // Credit each player their individual amount back
              for (const p of payments.rows) {
                const amount = parseFloat(p.amount);
                if (amount > 0) {
                  await creditWallet(
                    client,
                    p.player_id,
                    amount,
                    'match_refund',
                    match.id,
                    'match',
                    `Auto refund — match cancelled: ${match.title}`,
                    { match_id: match.id }
                  );
                }
              }
            }

            // Mark payments as refunded
            await client.query(
              `UPDATE match_payments
               SET status = 'refunded', updated_at = NOW()
               WHERE match_id = $1 AND status = 'held'`,
              [match.id]
            );
          }

          // Cancel the match
          await client.query(
            `UPDATE matches SET status = 'cancelled', updated_at = NOW()
             WHERE id = $1`,
            [match.id]
          );

          await client.query('COMMIT');
          console.log(`⚠️  Match auto-cancelled + refunded: ${match.id}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`❌ Cancel failed for match ${match.id}:`, err.message);
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