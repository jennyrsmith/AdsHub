// lib/db.js
import { Pool } from 'pg';
import fs from 'fs';
import url from 'url';

const uri = process.env.PG_URI;
if (!uri) throw new Error('PG_URI not set');

const sslMode = (process.env.PG_SSL || 'verify').toLowerCase(); // verify | require | disable
let ssl;
if (sslMode === 'disable') {
  ssl = false;
} else if (sslMode === 'require') {
  ssl = { rejectUnauthorized: false };
} else {
  // verify (default)
  const caPath = process.env.PG_CA_CERT;
  ssl = caPath && fs.existsSync(caPath)
    ? { ca: fs.readFileSync(caPath, 'utf8') }
    : { rejectUnauthorized: true };
}

export const pool = new Pool({
  connectionString: uri,
  ssl,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_MS || 30000),
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_MS || 10000),
});

// log DB host once for sanity
try {
  const u = new url.URL(uri);
  console.log(`[db] host=${u.hostname}:${u.port || 5432} db=${u.pathname.replace('/','')}`);
} catch {}
