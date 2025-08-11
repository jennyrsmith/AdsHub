import dotenv from 'dotenv';
import { DateTime } from 'luxon';
import { pool } from '../lib/db.js';

dotenv.config();

async function clearDemo() {
  const started = Date.now();
  const client = await pool.connect();
  const now = DateTime.now();
  const startDate = now.minus({ days: 29 }).toISODate();
  const endDate = now.toISODate();
  try {
    const fb = await client.query(
      `DELETE FROM facebook_ad_insights WHERE account_id=$1 AND campaign_id LIKE 'demo_%' AND date_start >= $2 AND date_start <= $3`,
      ['act_demo_fb', startDate, endDate]
    );
    const yt = await client.query(
      `DELETE FROM youtube_ad_insights WHERE account_id=$1 AND campaign_id LIKE 'demo_%' AND date_start >= $2 AND date_start <= $3`,
      ['act_demo_yt', startDate, endDate]
    );
    const roll = await client.query(
      `DELETE FROM daily_rollup WHERE platform IN ('facebook','youtube') AND date >= $1 AND date <= $2`,
      [startDate, endDate]
    );
    await client.query(`DELETE FROM sync_log WHERE platform IN ('facebook','youtube')`);
    const ms = Date.now() - started;
    console.log(`Cleared ${fb.rowCount} facebook rows, ${yt.rowCount} youtube rows, ${roll.rowCount} rollup rows in ${ms}ms`);
  } finally {
    client.release();
    await pool.end();
  }
}

clearDemo().catch((err) => {
  console.error('demoClear failed', err);
  process.exit(1);
});
