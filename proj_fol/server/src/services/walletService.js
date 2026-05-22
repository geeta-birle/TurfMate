const { query, getClient } = require('../config/db');

// ─────────────────────────────────────────────────────────────
// debitWallet — must always be called inside a transaction client
// ─────────────────────────────────────────────────────────────
const debitWallet = async (
  client, userId, amount, category,
  referenceId, referenceType, description, metadata = {}
) => {
  const amountNum = Number(amount || 0);

  if (!Number.isFinite(amountNum) || amountNum <= 0)
    throw new Error('Invalid debit amount.');

  const walletResult = await client.query(
    `SELECT id, balance FROM wallets
     WHERE user_id = $1 FOR UPDATE`,
    [userId]
  );

  if (!walletResult.rows.length)
    throw new Error('Wallet not found.');

  const wallet       = walletResult.rows[0];
  const balanceBefore = Number(wallet.balance || 0);

  if (balanceBefore < amountNum)
    throw new Error(
      `Insufficient balance. Available: ₹${balanceBefore.toFixed(2)}, Required: ₹${amountNum.toFixed(2)}`
    );

  const balanceAfter = Number((balanceBefore - amountNum).toFixed(2));

  await client.query(
    `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
    [balanceAfter, wallet.id]
  );

  const txn = await client.query(
    `INSERT INTO wallet_transactions
      (wallet_id, user_id, type, category, amount,
       balance_before, balance_after, reference_id,
       reference_type, description, metadata)
     VALUES ($1,$2,'debit',$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      wallet.id, userId, category, amountNum,
      balanceBefore, balanceAfter,
      referenceId, referenceType, description,
      JSON.stringify(metadata),
    ]
  );

  return txn.rows[0];
};

// ─────────────────────────────────────────────────────────────
// creditWallet — must always be called inside a transaction client
// ─────────────────────────────────────────────────────────────
const creditWallet = async (
  client, userId, amount, category,
  referenceId, referenceType, description, metadata = {}
) => {
  const amountNum = Number(amount || 0);

  if (!Number.isFinite(amountNum) || amountNum <= 0)
    throw new Error('Invalid credit amount.');

  const walletResult = await client.query(
    `SELECT id, balance FROM wallets
     WHERE user_id = $1 FOR UPDATE`,
    [userId]
  );

  if (!walletResult.rows.length)
    throw new Error('Wallet not found.');

  const wallet        = walletResult.rows[0];
  const balanceBefore = Number(wallet.balance || 0);
  const balanceAfter  = Number((balanceBefore + amountNum).toFixed(2));

  await client.query(
    `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
    [balanceAfter, wallet.id]
  );

  const txn = await client.query(
    `INSERT INTO wallet_transactions
      (wallet_id, user_id, type, category, amount,
       balance_before, balance_after, reference_id,
       reference_type, description, metadata)
     VALUES ($1,$2,'credit',$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      wallet.id, userId, category, amountNum,
      balanceBefore, balanceAfter,
      referenceId, referenceType, description,
      JSON.stringify(metadata),
    ]
  );

  return txn.rows[0];
};

// ─────────────────────────────────────────────────────────────
// getWalletBalance
// ─────────────────────────────────────────────────────────────
const getWalletBalance = async (userId) => {
  const result = await query(
    `SELECT w.*, u.name, u.email
     FROM wallets w
     JOIN users u ON w.user_id = u.id
     WHERE w.user_id = $1`,
    [userId]
  );

  if (!result.rows.length)
    throw new Error('Wallet not found.');

  return result.rows[0];
};

// ─────────────────────────────────────────────────────────────
// getTransactionHistory
//
// FIX: The original code used a shared `idx` counter that was
// incremented when building the WHERE clause, then continued
// incrementing for LIMIT and OFFSET. But after pushing
// limit+offset onto params, `idx` pointed to the wrong
// parameter numbers in the LIMIT/OFFSET clause, causing
// queries to use the wrong values or crash with bind errors.
//
// Fix: Use fixed positions for LIMIT and OFFSET based on the
// actual params array length after the WHERE params are built.
// ─────────────────────────────────────────────────────────────
const getTransactionHistory = async (
  userId, limit = 20, offset = 0, category = null
) => {
  const whereParams = [userId];
  let whereClause   = 'WHERE wt.user_id = $1';

  if (category) {
    whereParams.push(category);
    whereClause += ` AND wt.category = $${whereParams.length}`;
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM wallet_transactions wt ${whereClause}`,
    whereParams
  );

  // Build the SELECT query with LIMIT/OFFSET appended after WHERE params
  const selectParams = [...whereParams, limit, offset];
  const limitIdx  = selectParams.length - 1; // position of limit
  const offsetIdx = selectParams.length;     // position of offset

  const result = await query(
    `SELECT wt.*
     FROM wallet_transactions wt
     ${whereClause}
     ORDER BY wt.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    selectParams
  );

  return {
    transactions: result.rows,
    total:        Number(countResult.rows[0].count || 0),
  };
};

// ─────────────────────────────────────────────────────────────
// topUpWallet — called after Razorpay payment verification
// ─────────────────────────────────────────────────────────────
const topUpWallet = async (userId, amount, razorpayPaymentId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // FIX: Guard against duplicate top-up if verify endpoint is called twice
    // (e.g. user double-submits or Razorpay retries the webhook)
    const dupCheck = await client.query(
      `SELECT id FROM wallet_transactions
       WHERE user_id  = $1
         AND category = 'topup'
         AND metadata->>'razorpay_payment_id' = $2`,
      [userId, razorpayPaymentId]
    );

    if (dupCheck.rows.length) {
      await client.query('ROLLBACK');
      // Return the existing transaction — idempotent response
      const existing = await query(
        `SELECT * FROM wallet_transactions WHERE id = $1`,
        [dupCheck.rows[0].id]
      );
      return existing.rows[0];
    }

    const txn = await creditWallet(
      client, userId, amount,
      'topup', null, null,
      'Wallet top-up via Razorpay',
      { razorpay_payment_id: razorpayPaymentId }
    );

    await client.query('COMMIT');
    return txn;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  debitWallet,
  creditWallet,
  getWalletBalance,
  getTransactionHistory,
  topUpWallet,
};