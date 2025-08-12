import dotenv from 'dotenv';
import { DateTime } from 'luxon';
import { refreshDailyRollup } from './lib/rollups.js';
import { log, logError } from './logger.js';
import { pool } from './lib/db.js';

dotenv.config();

const [startArg, endArg] = process.argv.slice(2);
if (!startArg || !endArg) {
  console.error('Usage: node rollupBackfill.js START_DATE END_DATE');
  process.exit(1);
}

const startDate = DateTime.fromISO(startArg);
const endDate = DateTime.fromISO(endArg);
if (!startDate.isValid || !endDate.isValid || startDate > endDate) {
  console.error('Invalid date range');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  let current = startDate;
  while (current <= endDate) {
    const chunkEnd = DateTime.min(current.plus({ days: 6 }), endDate);
    const s = current.toISODate();
    const e = chunkEnd.toISODate();
    try {
      log(`Backfill rollup ${s} to ${e}`);
      await refreshDailyRollup(s, e);
    } catch (err) {
      await logError(`Rollup backfill failed for ${s} to ${e}`, err);
    }
    await sleep(500);
    current = chunkEnd.plus({ days: 1 });
  }
}

run()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    await logError('Rollup backfill error', err);
    try { await pool.end(); } catch {}
    process.exit(1);
  });
