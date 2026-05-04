const { query, getClient } = require('../config/db');

/**
 * Core wallet debit — always use inside a transaction client
 * Returns the transaction record
 */
const debitWallet = async (client, userId, amount, category,
  referenceId, referenceType, description, metadata = {}) => {

  // Lock wallet row
  const walletResult = await client.query(
    `SELECT id, balance FROM wallets
     WHERE user_id = $1 FOR UPDATE`,
    [userId]
  );

  if (!walletResult.rows.length)
    throw new Error('Wallet not found.');

  const wallet = walletResult.rows[0];
  const balanceBefore = parseFloat(wallet.balance);

  if (balanceBefore < amount)
    throw new Error(
      `Insufficient balance. Available: ₹${balanceBefore.toFixed(2)}, Required: ₹${amount.toFixed(2)}`
    );

  const balanceAfter = parseFloat((balanceBefore - amount).toFixed(2));

  // Update balance
  await client.query(
    `UPDATE wallets SET balance = $1 WHERE id = $2`,
    [balanceAfter, wallet.id]
  );

  // Log transaction
  const txn = await client.query(
    `INSERT INTO wallet_transactions
      (wallet_id, user_id, type, category, amount,
       balance_before, balance_after, reference_id,
       reference_type, description, metadata)
     VALUES ($1,$2,'debit',$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      wallet.id, userId, category, amount,
      balanceBefore, balanceAfter, referenceId,
      referenceType, description, JSON.stringify(metadata),
    ]
  );

  return txn.rows[0];
};

/**
 * Core wallet credit — always use inside a transaction client
 */
const creditWallet = async (client, userId, amount, category,
  referenceId, referenceType, description, metadata = {}) => {

  // Lock wallet row
  const walletResult = await client.query(
    `SELECT id, balance FROM wallets
     WHERE user_id = $1 FOR UPDATE`,
    [userId]
  );

  if (!walletResult.rows.length)
    throw new Error('Wallet not found.');

  const wallet = walletResult.rows[0];
  const balanceBefore = parseFloat(wallet.balance);
  const balanceAfter  = parseFloat((balanceBefore + amount).toFixed(2));

  // Update balance
  await client.query(
    `UPDATE wallets SET balance = $1 WHERE id = $2`,
    [balanceAfter, wallet.id]
  );

  // Log transaction
  const txn = await client.query(
    `INSERT INTO wallet_transactions
      (wallet_id, user_id, type, category, amount,
       balance_before, balance_after, reference_id,
       reference_type, description, metadata)
     VALUES ($1,$2,'credit',$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      wallet.id, userId, category, amount,
      balanceBefore, balanceAfter, referenceId,
      referenceType, description, JSON.stringify(metadata),
    ]
  );

  return txn.rows[0];
};

/**
 * Get wallet balance for a user
 */
const getWalletBalance = async (userId) => {
  const result = await query(
    `SELECT w.*, u.name, u.email
     FROM wallets w
     JOIN users u ON w.user_id = u.id
     WHERE w.user_id = $1`,
    [userId]
  );
  if (!result.rows.length) throw new Error('Wallet not found.');
  return result.rows[0];
};

/**
 * Get transaction history for a user
 */
const getTransactionHistory = async (userId, limit = 20,
  offset = 0, category = null) => {

  let conditions = ['wt.user_id = $1'];
  let params = [userId];
  let idx = 2;

  if (category) {
    conditions.push(`wt.category = $${idx++}`);
    params.push(category);
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) FROM wallet_transactions wt ${whereClause}`,
    params
  );

  params.push(limit, offset);
  const result = await query(
    `SELECT wt.*
     FROM wallet_transactions wt
     ${whereClause}
     ORDER BY wt.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );

  return {
    transactions: result.rows,
    total: parseInt(countResult.rows[0].count),
  };
};

/**
 * Top up wallet via Razorpay (after payment verification)
 */
const topUpWallet = async (userId, amount, razorpayPaymentId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const txn = await creditWallet(
      client, userId, amount,
      'topup', null, null,
      `Wallet top-up via Razorpay`,
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