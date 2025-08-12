import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import pg from 'pg';

const { Pool } = pg;

// Prefer DATABASE_URL, fall back to PG_URI
let connectionString = process.env.DATABASE_URL;
if (!connectionString) connectionString = process.env.PG_URI;
if (!connectionString) {
  throw new Error('DATABASE_URL or PG_URI must be set');
}

if (connectionString.includes('sslmode=disable')) {
  connectionString = connectionString.replace(/sslmode=disable/gi, 'sslmode=require');
}

const caPath = process.env.PG_CA_PATH || '/root/AdsHub/certs/db-ca.pem';
let ca;
try {
  ca = fs.readFileSync(caPath, 'utf8');
} catch (e) {
  console.warn(`[db] Failed to read CA file at ${caPath}: ${e.message}`);
}

const sslMode = (process.env.PG_SSL_MODE || 'require').toLowerCase();
let ssl;
if (sslMode === 'disable') {
  ssl = false;
} else {
  ssl = { ca, rejectUnauthorized: true };
}

// Remove potential host overrides
delete process.env.PGHOST;
delete process.env.PGPORT;

const pool = new Pool({
  connectionString,
  ssl,
  max: Number(process.env.PG_POOL_MAX) || 8,
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 10000,
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS) || 5000,
});

pool.on('connect', (client) => {
  const stmt = Number(process.env.PG_STATEMENT_TIMEOUT_MS) || 30000;
  const idleTx = Number(process.env.PG_IDLE_TX_TIMEOUT_MS) || 15000;
  if (stmt) client.query(`SET statement_timeout TO ${stmt}`);
  if (idleTx) client.query(`SET idle_in_transaction_session_timeout TO ${idleTx}`);
});

let failCount = 0;
let breakerUntil = 0;
const maxAttempts = Number(process.env.DB_MAX_ATTEMPTS) || 3;
const breakerThreshold = Number(process.env.DB_BREAKER_THRESHOLD) || 5;
const breakerMs = Number(process.env.DB_BREAKER_MS) || 30000;

export async function queryWithRetry(sql, params = [], attempt = 1) {
  if (Date.now() < breakerUntil) {
    const err = new Error('Database temporarily unavailable');
    err.code = 'EBREAKER';
    throw err;
  }
  try {
    const res = await pool.query(sql, params);
    failCount = 0;
    return res;
  } catch (err) {
    const transient = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
    if (transient.includes(err.code) && attempt < maxAttempts) {
      failCount++;
      if (failCount >= breakerThreshold) {
        breakerUntil = Date.now() + breakerMs;
      }
      const delay = 100 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
      return queryWithRetry(sql, params, attempt + 1);
    }
    failCount++;
    if (failCount >= breakerThreshold) {
      breakerUntil = Date.now() + breakerMs;
    }
    throw err;
  }
}

export async function closeDb() {
  await pool.end();
}

export { pool };
