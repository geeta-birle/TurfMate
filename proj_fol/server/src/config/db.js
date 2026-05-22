const { Pool } = require('pg');

// ─────────────────────────────────────────────────────────────
// FIX 1: Validate DATABASE_URL at startup — fail fast with a
// clear message rather than a cryptic ECONNREFUSED later.
// ─────────────────────────────────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max:                    20,   // max pool size
  idleTimeoutMillis:      30000,
  connectionTimeoutMillis: 5000, // FIX 2: was 2000 — too short under load
});

pool.on('connect', (client) => {
  if (process.env.NODE_ENV !== 'production') {
    // Only log on first connect, not every pool checkout
  }
});

// FIX 3: Original called process.exit(-1) on any pool error.
// This kills the server on a transient DB blip (e.g. network hiccup).
// Log the error instead — the pool will try to reconnect automatically.
pool.on('error', (err, client) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err.message);
  // Only exit on fatal/unrecoverable errors
  if (err.code === '57P03' || err.code === '08006') {
    // 57P03 = cannot connect now, 08006 = connection failure
    console.error('❌ Fatal DB connection error — exiting.');
    process.exit(1);
  }
});

// ─────────────────────────────────────────────────────────────
// query — thin wrapper around pool.query
// ─────────────────────────────────────────────────────────────
const query = (text, params) => pool.query(text, params);

// ─────────────────────────────────────────────────────────────
// getClient — for transactions (caller must release())
// ─────────────────────────────────────────────────────────────
const getClient = () => pool.connect();

// ─────────────────────────────────────────────────────────────
// testConnection — call once at startup to verify DB is reachable
// ─────────────────────────────────────────────────────────────
const testConnection = async () => {
  try {
    const res = await query('SELECT NOW() as now');
    console.log(`✅ PostgreSQL connected — server time: ${res.rows[0].now}`);
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    process.exit(1);
  }
};

// ─────────────────────────────────────────────────────────────
// FIX 4: Graceful shutdown — drain the pool when the process exits
// so in-flight queries aren't abruptly killed.
// Call this in app.js SIGINT/SIGTERM handlers.
// ─────────────────────────────────────────────────────────────
const closePool = async () => {
  await pool.end();
  console.log('🛑 PostgreSQL pool closed.');
};

module.exports = { query, getClient, pool, testConnection, closePool };