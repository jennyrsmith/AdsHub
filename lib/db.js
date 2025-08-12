import 'dotenv/config';
import fs from 'fs';
import { Pool } from 'pg';

const uri = process.env.PG_URI;
if (!uri) {
  throw new Error('PG_URI is not set');
}

// Prefer explicit CA path if provided; otherwise use certs/db-ca.pem if present; else fallback
let sslConfig = { rejectUnauthorized: false }; // works with DO sslmode=require
try {
  const caPath = process.env.PG_CA_PATH || './certs/db-ca.pem';
  if (fs.existsSync(caPath)) {
    const ca = fs.readFileSync(caPath).toString();
    sslConfig = { rejectUnauthorized: true, ca };
  }
} catch (e) {
  // keep fallback
}

const pool = new Pool({
  connectionString: uri,
  ssl: sslConfig,
  max: Number(process.env.PG_POOL_MAX || 8),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10000),
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 5000)
});

pool.on('error', (err) => {
  console.error('Postgres pool error:', err);
});

export { pool };
