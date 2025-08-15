import { Pool } from 'pg';
import fs from 'fs';

// === Debug logs for startup ===
console.log('[db] Startup config check:');
console.log('      PG_URI exists:', !!process.env.PG_URI);
console.log('      PG_SSL_MODE:', process.env.PG_SSL_MODE || '(not set)');
console.log('      PG_CA_CERT exists:', !!process.env.PG_CA_CERT);
console.log('      PG_CA_PATH exists:', !!process.env.PG_CA_PATH);

if (!process.env.PG_URI) {
  console.error('[db] ERROR: PG_URI is not set. Did you load .env before importing lib/db.js?');
}

const uri = process.env.PG_URI;
const mode = (process.env.PG_SSL_MODE || process.env.PG_SSL || 'require').toLowerCase();

let ssl = false;

if (mode === 'disable') {
  ssl = false;
} else if (mode === 'require') {
  ssl = { rejectUnauthorized: false };
} else if (mode === 'verify') {
  const caInline = process.env.PG_CA_CERT;
  const caPath = process.env.PG_CA_PATH;
  let ca;

  if (caInline && caInline.includes('BEGIN CERTIFICATE')) {
    console.log('[db] Using inline CA cert from PG_CA_CERT.');
    ca = caInline;
  } else if (caPath && fs.existsSync(caPath)) {
    console.log('[db] Using CA file from PG_CA_PATH:', caPath);
    ca = fs.readFileSync(caPath, 'utf8');
  } else {
    console.error('[db] ERROR: PG_SSL_MODE=verify requires PG_CA_CERT or PG_CA_PATH.');
    throw new Error('PG_SSL_MODE=verify requires PG_CA_CERT or PG_CA_PATH');
  }

  ssl = { rejectUnauthorized: true, ca };
} else {
  console.error('[db] ERROR: Unknown PG_SSL_MODE:', mode);
  throw new Error(`Unknown PG_SSL_MODE: ${mode}`);
}

export const pool = new Pool({
  connectionString: uri,
  ssl,
  max: parseInt(process.env.PG_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Log resolved host and SSL mode
const host = (() => {
  try { return new URL(uri).host; } catch { return '(parse error)'; }
})();
console.log(`[db] host=${host} ssl=${mode} ca=${ssl && ssl.ca ? 'loaded' : (ssl === false ? 'disabled' : 'no-ca')}`);
