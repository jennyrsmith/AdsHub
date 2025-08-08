import pkg from 'pg';
import dotenv from 'dotenv';
import { log, logError, timeUTC } from './logger.js';

dotenv.config();

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.PG_URI,
});

export async function saveToDatabase(insightsArray) {
  log(`Saving ${insightsArray.length} records to database at ${timeUTC()}`);
  if (!process.env.PG_URI) {
    throw new Error('Missing PG_URI in environment variables');
  }
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS facebook_ad_insights (
      id SERIAL PRIMARY KEY,
      account_id TEXT,
      campaign_name TEXT,
      adset_name TEXT,
      ad_name TEXT,
      impressions INTEGER,
      clicks INTEGER,
      spend NUMERIC,
      cpc NUMERIC,
      ctr NUMERIC,
      purchase_roas NUMERIC,
      date_start DATE,
      date_stop DATE,
      fetched_at TIMESTAMP,
      UNIQUE (account_id, campaign_name, date_start)
    )`);

    const insertText = `INSERT INTO facebook_ad_insights
      (account_id, campaign_name, adset_name, ad_name, impressions, clicks, spend, cpc, ctr, purchase_roas,
       date_start, date_stop, fetched_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (account_id, campaign_name, date_start) DO NOTHING`;

    const fetchedAt = new Date();
    for (const item of insightsArray) {
      const values = [
        item.account_id,
        item.campaign_name,
        item.adset_name,
        item.ad_name,
        item.impressions,
        item.clicks,
        item.spend,
        item.cpc,
        item.ctr,
        item.purchase_roas,
        item.date_start,
        item.date_stop,
        fetchedAt,
      ];
      await client.query(insertText, values);
    }
    log(`✅ Synced to DB at ${timeUTC()}`);
  } catch (err) {
    await logError(`Database sync failed at ${timeUTC()}`, err);
    throw err;
  } finally {
    client.release();
  }
}

