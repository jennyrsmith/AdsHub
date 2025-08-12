import { pool } from '../db.js';
export { pool };

let failCount = 0;
let breakerUntil = 0;

export async function queryWithRetry(sql, params = [], attempt = 1) {
  if (Date.now() < breakerUntil) {
    const err = new Error('Database temporarily unavailable');
    err.code = 'EBREAKER';
    throw err;
  }
  try {
    const res = await pool.query(sql, params);
    failCount = 0;
    return res;
  } catch (err) {
    if (['ECONNRESET', 'ETIMEDOUT'].includes(err.code) && attempt < 5) {
      failCount++;
      if (failCount >= 5) {
        breakerUntil = Date.now() + 30000;
      }
      const delay = 100 * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
      return queryWithRetry(sql, params, attempt + 1);
    }
    const wrapped = new Error(`Database query failed: ${err.message}`);
    wrapped.code = err.code;
    throw wrapped;
  }
}

export async function closeDb() {
  await pool.end();
}
