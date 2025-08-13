import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

function buildSsl() {
  const caPath = process.env.PG_CA_PATH;
  if (caPath && fs.existsSync(caPath)) {
    return { ca: fs.readFileSync(caPath, 'utf8') };
  }
  const sslMode = (process.env.PG_SSL || process.env.PG_SSLMODE || '').toLowerCase();
  if (sslMode === 'require') {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export const pool = new Pool({
  connectionString: process.env.PG_URI,
  ssl: buildSsl()
});

export async function query(sql, params) {
  const res = await pool.query(sql, params);
  return res.rows;
}

export async function ping() {
  const r = await pool.query('select 1 as ok');
  return r.rows?.[0]?.ok === 1;
}
