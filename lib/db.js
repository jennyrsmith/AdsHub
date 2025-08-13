import { Pool } from 'pg';
import fs from 'fs';

const uri = process.env.PG_URI;
const sslMode = (process.env.PG_SSL || 'verify').toLowerCase(); // 'verify' | 'require' | 'disable'
const caPath = process.env.PG_CA_CERT; // e.g. /etc/ssl/certs/do-postgres-ca.crt

let ssl;
if (sslMode === 'disable') {
  ssl = false;
} else if (sslMode === 'require') {
  ssl = { rejectUnauthorized: false };
} else {
  // verify
  const ca = caPath && fs.existsSync(caPath) ? fs.readFileSync(caPath, 'utf8') : undefined;
  ssl = ca ? { ca } : { rejectUnauthorized: true };
}

export const pool = new Pool({
  connectionString: uri,
  ssl
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
