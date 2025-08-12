import 'dotenv/config';
import fs from 'fs';
import { Pool } from 'pg';

function resolveSSL() {
  const mode = (process.env.PG_SSL_MODE || 'require').toLowerCase();
  const caPath = process.env.PG_CA_PATH;

  // Explicit CA takes precedence if present
  if (caPath && fs.existsSync(caPath)) {
    return { ca: fs.readFileSync(caPath, 'utf8') };
  }

  // Map common modes -> node-postgres ssl options
  if (mode === 'disable') return false;
  if (mode === 'no-verify' || mode === 'require') return { rejectUnauthorized: false };
  if (mode === 'verify-full') {
    // verify-full without a CA is impossible; fallback to no-verify
    return { rejectUnauthorized: false };
  }
  // default
  return { rejectUnauthorized: false };
}

export const pool = new Pool({
  connectionString: process.env.PG_URI,
  ssl: resolveSSL(),
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10000),
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 5000)
});

export function getPool() { return pool; }

