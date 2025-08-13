import pg from 'pg';
const { Pool } = pg;

const useSSL =
  process.env.PG_SSL_MODE === 'require' ||
  /\bsslmode=require\b/i.test(process.env.PG_URI || '');

let ssl = false;
if (useSSL) {
  if (process.env.PG_CA_PATH) {
    ssl = {
      ca: await (await import('fs')).promises.readFile(process.env.PG_CA_PATH, 'utf8')
    };
  } else {
    ssl = { rejectUnauthorized: false };
  }
}

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

// helper to retrieve the pool
export function getPool() {
  return pool;
}
