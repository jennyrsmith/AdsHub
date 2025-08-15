import { Pool } from 'pg';
import fs from 'fs';

const uri = process.env.PG_URI;
if (!uri) {
  throw new Error('PG_URI not set');
}

// Modes:
//  - require => TLS on, accept server cert without CA (rejectUnauthorized: false)
//  - verify  => TLS on, require CA at PG_CA_PATH (PEM). Will reject if missing.
//  - disable => no TLS (not recommended)
const mode = (process.env.PG_SSL_MODE || 'verify').toLowerCase();

let ssl;
if (mode === 'disable') {
  ssl = false;
} else if (mode === 'require') {
  ssl = { rejectUnauthorized: false };
} else if (mode === 'verify') {
  const caPath = process.env.PG_CA_PATH;
  if (!caPath || !fs.existsSync(caPath)) {
    throw new Error('PG_SSL_MODE=verify requires PG_CA_PATH pointing to a readable CA PEM file');
  }
  ssl = {
    ca: fs.readFileSync(caPath, 'utf8'),
    rejectUnauthorized: true,
  };
} else {
  throw new Error(`Unknown PG_SSL_MODE: ${mode}`);
}

export const pool = new Pool({
  connectionString: uri,
  ssl,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_MS || 30000),
  connectionTimeoutMillis: Number(process.env.PG_CONN_MS || 10000),
});

// convenience helper
export async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// basic startup probe
pool.on('error', (err) => {
  console.error('[pg-pool] Unexpected error on idle client', err);
});

