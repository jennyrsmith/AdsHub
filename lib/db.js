import { Pool } from 'pg';
import fs from 'fs';

const uri = process.env.PG_URI;
if (!uri) throw new Error('PG_URI not set');

const mode = (process.env.PG_SSL || 'verify').toLowerCase();
let ssl;

if (mode === 'disable' || mode === 'off' || mode === 'false') {
  ssl = false;
} else if (mode === 'require') {
  // accept server cert without checking CA (not ideal, but works)
  ssl = { rejectUnauthorized: false };
} else {
  // verify with CA (recommended)
  const caPath = process.env.PG_CA_CERT;
  if (!caPath || !fs.existsSync(caPath)) {
    throw new Error(`PG_SSL=verify but CA not found at PG_CA_CERT=${caPath || '(unset)'}`);
  }
  ssl = { rejectUnauthorized: true, ca: fs.readFileSync(caPath, 'utf8') };
}

export const pool = new Pool({
  connectionString: uri,
  ssl,
  // optional but helpful with managed PG
  max: parseInt(process.env.PG_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Log what we resolved (no secrets)
const host = (() => {
  try { return new URL(uri).host; } catch { return '(parse error)'; }
})();
console.log(`[db] host=${host} ssl=${mode} ca=${ssl && ssl.ca ? 'loaded' : (ssl===false ? 'disabled' : 'no-ca')}`);
