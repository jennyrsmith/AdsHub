import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.PG_URI,
  // TEMPORARY: bypass self-signed cert issues without changing .env
  ssl: { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10000),
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 5000)
});

export function getPool() {
  return pool;
}
