// /root/AdsHub/db.js
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

/**
 * TLS policy:
 * - If PG_CA_PATH exists, use strict validation with that CA bundle.
 * - Else if PG_SSL=require, allow self-signed (rejectUnauthorized:false).
 * - Else, no custom SSL (plain or provider default).
 */
function buildSsl() {
  const caPath = process.env.PG_CA_PATH;
  if (caPath && fs.existsSync(caPath)) {
    return { ca: fs.readFileSync(caPath, 'utf8') };
  }
  const sslMode = (process.env.PG_SSL || process.env.PG_SSLMODE || '').toLowerCase();
  if (sslMode === 'require') {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export const pool = new Pool({
  connectionString: process.env.PG_URI, // e.g. postgres://user:pass@host:port/db?sslmode=require
  ssl: buildSsl()
});

export async function query(sql, params) {
  const res = await pool.query(sql, params);
  return res.rows;
}