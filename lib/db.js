import pg from 'pg';
const { Pool } = pg;

const useSSL = /\bsslmode=require\b/i.test(process.env.PG_URI || '');
const ssl =
  useSSL
    ? (process.env.PG_CA_PATH
        ? { ca: await (await import('fs')).promises.readFile(process.env.PG_CA_PATH, 'utf8') }
        : { rejectUnauthorized: false })
    : false;

export const pool = new Pool({
  connectionString: process.env.PG_URI,
  ssl
});

// simple helper
export async function query(q, params = []) {
  const client = await pool.connect();
  try {
    const r = await client.query(q, params);
    return r;
  } finally {
    client.release();
  }
}
