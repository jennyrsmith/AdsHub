// lib/db.js
import { Pool } from 'pg';
import fs from 'fs';

const uri = process.env.PG_URI;
if (!uri) {
  console.warn('[db] PG_URI not set — DB calls will fail until it is.');
} else {
  try {
    console.log('[db] host=' + new URL(uri).host);
  } catch {}
}

const sslMode = (process.env.PG_SSL || 'verify').toLowerCase();

function buildSsl() {
  if (sslMode === 'disable') return false;
  if (sslMode === 'require') return { rejectUnauthorized: false };
  // 'verify' (default)
  const caPath = process.env.PG_CA_CERT;
  if (!caPath || !fs.existsSync(caPath)) {
    console.warn(`[db] PG_SSL=verify but PG_CA_CERT missing or unreadable: ${caPath || '(unset)'}`);
    // Fall back to require (don’t block startup)
    return { rejectUnauthorized: false };
  }
  return { ca: fs.readFileSync(caPath, 'utf8'), rejectUnauthorized: true };
}

export const pool = new Pool({
  connectionString: uri,
  ssl: buildSsl()
});

export async function dbReady(timeoutMs = 3000) {
  // Quick readiness probe — a cheap query with timeout
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (e) {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export async function query(text, params) {
  return pool.query(text, params);
}
