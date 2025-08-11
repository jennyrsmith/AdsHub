import pkg from 'pg';
import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';
import { log, logError } from './logger.js';

dotenv.config();

const { Pool } = pkg;
const SHEETS_ENABLED = process.env.SHEETS_ENABLED !== 'false';

function warnOnce() {
  if (!globalThis.__sheetsWarned) {
    console.warn('Sheets disabled; skipping Google Sheets initialization.');
    globalThis.__sheetsWarned = true;
  }
}

async function run() {
  let exitCode = 0;
  try {
    if (!process.env.PG_URI) {
      throw new Error('Missing PG_URI');
    }
    if (SHEETS_ENABLED) {
      const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (!process.env.GOOGLE_SHEET_ID || !creds || !fs.existsSync(creds)) {
        throw new Error('Missing Google Sheets credentials');
      }
    } else {
      warnOnce();
    }
    const pool = new Pool({ connectionString: process.env.PG_URI });
    const client = await pool.connect();
    try {
      const countRes = await client.query(
        "SELECT COUNT(*) FROM facebook_ad_insights WHERE fetched_at >= NOW() - INTERVAL '24 hours'"
      );
      const lastRes = await client.query(
        'SELECT MAX(fetched_at) as last FROM facebook_ad_insights'
      );
      const rows = Number(countRes.rows[0].count);
      const lastWrite = lastRes.rows[0].last;
      log(`Rows added in last 24h: ${rows}`);
      log(`Last DB write: ${lastWrite}`);
      if (!lastWrite || new Date(lastWrite) < Date.now() - 24 * 60 * 60 * 1000) {
        log('Last DB write is older than 24 hours');
        exitCode = 1;
      }
    } finally {
      client.release();
    }
  } catch (err) {
    exitCode = 1;
    await logError('Healthcheck database query failed', err);
  }

  if (SHEETS_ENABLED) {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
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
      const modified = file.data.modifiedTime;
      log(`Google Sheet last modified: ${modified}`);
      if (!modified || new Date(modified) < Date.now() - 24 * 60 * 60 * 1000) {
        log('Google Sheets sync is older than 24 hours');
        exitCode = 1;
      }
    } catch (err) {
      exitCode = 1;
      await logError('Healthcheck Google Sheets check failed', err);
    }
  }

  process.exit(exitCode);
}

run().catch(async (err) => {
  await logError('Healthcheck failed', err);
  process.exit(1);
});
