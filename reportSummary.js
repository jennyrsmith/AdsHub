import axios from 'axios';
import pkg from 'pg';
import dotenv from 'dotenv';
import { log } from './logger.js';

dotenv.config();

const { Pool } = pkg;
import { pool } from './lib/db.js';

export async function runReport() {
  if (!process.env.PG_URI) {
    throw new Error('Missing PG_URI');
  }
  const client = await pool.connect();
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const fbRes = await client.query(
      'SELECT COALESCE(SUM(spend),0) as spend, COALESCE(SUM(impressions),0) as impressions, COALESCE(SUM(clicks),0) as clicks FROM facebook_ad_insights WHERE date_start = $1',
      [yesterday]
    );
    const ytRes = await client.query(
      'SELECT COALESCE(SUM(cost),0) as cost, COALESCE(SUM(impressions),0) as impressions, COALESCE(SUM(clicks),0) as clicks FROM youtube_ad_insights WHERE date_start = $1',
      [yesterday]
    );
    const fb = fbRes.rows[0];
    const yt = ytRes.rows[0];
    const message = `Ad Summary for ${yesterday}:\nFacebook - $${Number(fb.spend).toFixed(2)} spend, ${fb.impressions} impressions, ${fb.clicks} clicks\nYouTube - $${Number(yt.cost).toFixed(2)} spend, ${yt.impressions} impressions, ${yt.clicks} clicks`;
    log(message);
    if (process.env.SLACK_WEBHOOK_URL) {
      await axios.post(process.env.SLACK_WEBHOOK_URL, { text: message });
    }
    if (process.env.ERROR_ALERT_EMAIL) {
      console.log(`Would send email to ${process.env.ERROR_ALERT_EMAIL}: ${message}`);
    }
  } finally {
    client.release();
  }
}
