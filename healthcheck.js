import pkg from 'pg';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { log, logError } from './logger.js';

dotenv.config();

const { Pool } = pkg;

async function run() {
  try {
    if (!process.env.PG_URI) {
      throw new Error('Missing PG_URI');
    }
    const pool = new Pool({ connectionString: process.env.PG_URI });
    const client = await pool.connect();
    try {
      const res = await client.query(
        'SELECT date_start, campaign_name, spend FROM facebook_ad_insights ORDER BY date_start DESC LIMIT 10'
      );
      res.rows.forEach((r) => {
        log(`DB Row: ${r.date_start.toISOString().slice(0,10)} | ${r.campaign_name} | ${r.spend}`);
      });
    } finally {
      client.release();
    }
  } catch (err) {
    await logError('Healthcheck database query failed', err);
  }

  if (process.env.GOOGLE_SHEET_ID) {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: 'credentials.json',
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/drive.metadata.readonly',
        ],
      });
      const client = await auth.getClient();
      const drive = google.drive({ version: 'v3', auth: client });
      const file = await drive.files.get({
        fileId: process.env.GOOGLE_SHEET_ID,
        fields: 'modifiedTime',
      });
      log(`Google Sheet last modified: ${file.data.modifiedTime}`);
    } catch (err) {
      await logError('Healthcheck Google Sheets check failed', err);
    }
  }
}

run().catch((err) => logError('Healthcheck failed', err));
