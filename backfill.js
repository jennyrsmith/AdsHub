import fs from 'fs';
import path from 'path';
import pkg from 'pg';
import dotenv from 'dotenv';
import { DateTime } from 'luxon';
import { fetchInsightsForAccount } from './facebookInsights.js';
import { saveToDatabase } from './saveToDatabase.js';
import { HEADERS } from './constants.js';
import { log, logError } from './logger.js';

dotenv.config();

const [startArg, endArg] = process.argv.slice(2);
if (!startArg || !endArg) {
  console.error('Usage: node backfill.js START_DATE END_DATE');
  process.exit(1);
}

const startDate = DateTime.fromISO(startArg);
const endDate = DateTime.fromISO(endArg);
if (!startDate.isValid || !endDate.isValid || startDate > endDate) {
  console.error('Invalid date range');
  process.exit(1);
}

const accessToken = process.env.FB_ACCESS_TOKEN;
const accountEnv = process.env.FB_AD_ACCOUNTS;
if (!accessToken || !accountEnv) {
  console.error('Missing FB_ACCESS_TOKEN or FB_AD_ACCOUNTS');
  process.exit(1);
}
if (!process.env.PG_URI) {
  console.error('Missing PG_URI');
  process.exit(1);
}

const accountIds = accountEnv.split(',').map((id) => id.trim()).filter(Boolean);
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.PG_URI });
const csvDir = path.join('data', 'backfill');
if (!fs.existsSync(csvDir)) {
  fs.mkdirSync(csvDir, { recursive: true });
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function getLastDate(accountId) {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT MAX(date_start) as max FROM facebook_ad_insights WHERE account_id = $1', [accountId]);
    return res.rows[0]?.max ? DateTime.fromJSDate(res.rows[0].max) : null;
  } finally {
    client.release();
  }
}

async function run() {
  for (const id of accountIds) {
    let current = startDate;
    const last = await getLastDate(id);
    if (last && last >= current) {
      current = last.plus({ days: 1 });
    }
    while (current <= endDate) {
      const dateStr = current.toISODate();
      try {
        log(`Backfill ${id} for ${dateStr}`);
        const insights = await fetchInsightsForAccount(id, dateStr, accessToken);
        if (insights.length) {
          await saveToDatabase(insights);
          const rows = insights.map((item) => HEADERS.map((h) => item[h] ?? ''));
          const csv = [HEADERS, ...rows].map((r) => r.join(',')).join('\n');
          const file = path.join(csvDir, `${id}_${dateStr}.csv`);
          fs.writeFileSync(file, csv);
        }
      } catch (err) {
        await logError(`Backfill failed for ${id} on ${dateStr}`, err);
      }
      await sleep(1000 + Math.floor(Math.random() * 1000));
      current = current.plus({ days: 1 });
    }
  }
  await pool.end();
}

run()
  .then(() => process.exit(0))
  .catch(async (err) => {
    await logError('Backfill encountered an error', err);
    process.exit(1);
  });
