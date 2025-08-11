import axios from 'axios';
import { google } from 'googleapis';
import pkg from 'pg';
import dotenv from 'dotenv';
import { log, logError, timeUTC } from './logger.js';
import { YOUTUBE_HEADERS, YOUTUBE_SHEET_NAME } from './constants.js';
import { pushRowsToSheet } from './pushToGoogleSheets.js';

dotenv.config();

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.PG_URI });

export async function fetchYouTubeInsights() {
  if (process.env.DEMO_MODE === 'true') {
    console.log('DEMO_MODE: skipping external fetch');
    return [];
  }
  if (!process.env.GOOGLE_ADS_CUSTOMER_ID) {
    throw new Error('Missing GOOGLE_ADS_CUSTOMER_ID');
  }
  if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
    throw new Error('Missing GOOGLE_ADS_DEVELOPER_TOKEN');
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/adwords'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const query =
    "SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, segments.date FROM campaign WHERE segments.date DURING YESTERDAY AND campaign.advertising_channel_type = 'VIDEO'";
  const url = `https://googleads.googleapis.com/v14/customers/${process.env.GOOGLE_ADS_CUSTOMER_ID}/googleAds:searchStream`;
  const res = await axios.post(
    url,
    { query },
    {
      headers: {
        Authorization: `Bearer ${token.token}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      },
    }
  );
  const insights = [];
  for (const stream of res.data || []) {
    for (const row of stream.results || []) {
      const { campaign, metrics, segments } = row;
      insights.push({
        campaign_name: campaign.name,
        impressions: Number(metrics.impressions) || 0,
        clicks: Number(metrics.clicks) || 0,
        cost: Number(metrics.costMicros ?? metrics.cost_micros) / 1e6,
        conversions: Number(metrics.conversions) || 0,
        date_start: segments.date,
        date_stop: segments.date,
      });
    }
  }
  return insights;
}

export async function saveYouTubeToDatabase(insightsArray) {
  log(`Saving ${insightsArray.length} YouTube records to database at ${timeUTC()}`);
  if (!process.env.PG_URI) {
    throw new Error('Missing PG_URI in environment variables');
  }
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS youtube_ad_insights (
      id SERIAL PRIMARY KEY,
      campaign_name TEXT,
      impressions INTEGER,
      clicks INTEGER,
      cost NUMERIC,
      conversions NUMERIC,
      date_start DATE,
      date_stop DATE,
      fetched_at TIMESTAMP,
      UNIQUE (campaign_name, date_start)
    )`);

    const insertText = `INSERT INTO youtube_ad_insights
      (campaign_name, impressions, clicks, cost, conversions, date_start, date_stop, fetched_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (campaign_name, date_start) DO NOTHING`;
    const fetchedAt = new Date();
    for (const item of insightsArray) {
      const values = [
        item.campaign_name,
        item.impressions,
        item.clicks,
        item.cost,
        item.conversions,
        item.date_start,
        item.date_stop,
        fetchedAt,
      ];
      await client.query(insertText, values);
    }
    log(`✅ Synced YouTube data to DB at ${timeUTC()}`);
  } catch (err) {
    await logError(`YouTube database sync failed at ${timeUTC()}`, err);
    throw err;
  } finally {
    client.release();
  }
}

export async function pushYouTubeToSheets(insightsArray) {
  return pushRowsToSheet(insightsArray, YOUTUBE_SHEET_NAME, YOUTUBE_HEADERS);
}
