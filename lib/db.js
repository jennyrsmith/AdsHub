import { Pool } from 'pg';
import fs from 'fs';

const uri = process.env.PG_URI;
if (!uri) throw new Error('PG_URI not set');

/**
 * PG_SSL modes:
 *  - verify (default): verify server cert; if PG_CA_CERT file exists, use it.
 *  - require: TLS but don't verify (rejectUnauthorized:false)
 *  - disable: no TLS (not recommended)
 */
const sslMode = (process.env.PG_SSL || 'verify').toLowerCase();

let ssl;
if (sslMode === 'disable') {
  ssl = false;
} else if (sslMode === 'require') {
  ssl = { rejectUnauthorized: false };
} else {
  const caPath = process.env.PG_CA_CERT;
  // If a CA file is present, use it; otherwise allow native bundle verify.
  ssl = (caPath && fs.existsSync(caPath))
    ? { ca: fs.readFileSync(caPath, 'utf8') }
    : true;
}

export const pool = new Pool({
  connectionString: uri,
  ssl
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('executed query', { text, duration, rows: res.rowCount });
  }
  return res;
}

