import 'dotenv/config';
import fs from 'fs';
import { Pool } from 'pg';

const uri = process.env.PG_URI;
if (!uri) throw new Error('PG_URI is not set');

const mode = (process.env.PG_SSL_MODE || 'require').toLowerCase();
let ssl;
if (mode === 'disable') {
  ssl = false;
} else if (mode === 'require') {
  ssl = { rejectUnauthorized: false };
} else if (mode === 'verify-ca') {
  const caPath = process.env.PG_CA_PATH || './certs/db-ca.pem';
  if (!fs.existsSync(caPath)) {
    throw new Error(`PG_SSL_MODE=verify-ca but CA not found at ${caPath}`);
  }
  ssl = { ca: fs.readFileSync(caPath).toString(), rejectUnauthorized: true };
} else {
  ssl = { rejectUnauthorized: false };
}
console.log(`[db] Using PG_SSL_MODE=${mode}`);

export const pool = new Pool({
  connectionString: uri,
  ssl,
  max: Number(process.env.PG_POOL_MAX || 8),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10000),
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 5000),
});
