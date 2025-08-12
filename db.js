import fs from 'node:fs';
import pg from 'pg';

const { Pool } = pg;

const PG_URI = process.env.PG_URI;
if (!PG_URI) {
  console.error('[db] Missing PG_URI in environment');
  process.exit(1);
}

let ssl;
const caPath = process.env.PG_SSL_CA;
if (caPath && fs.existsSync(caPath)) {
  try {
    const ca = fs.readFileSync(caPath, 'utf8');
    ssl = { ca, rejectUnauthorized: true };
    console.log('[db] Using CA bundle for TLS verification:', caPath);
  } catch (e) {
    console.warn('[db] Failed to read CA file, falling back to insecure SSL:', e.message);
    ssl = { rejectUnauthorized: false };
  }
} else {
  console.warn('[db] PG_SSL_CA not set or file missing; using insecure SSL (rejectUnauthorized:false) for now');
  ssl = { rejectUnauthorized: false };
}

export const pool = new Pool({
  connectionString: PG_URI,
  ssl
});

export async function ping() {
  const r = await pool.query('SELECT 1 as ok');
  return r?.rows?.[0]?.ok === 1;
}

