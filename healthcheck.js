// healthcheck.js
import fs from 'fs';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { log, logError } from './logger.js';
import { pool } from './lib/db.js';

dotenv.config();

const SHEETS_ENABLED = process.env.SHEETS_ENABLED !== 'false';

function warnOnceSheetsDisabled() {
  if (!globalThis.__sheetsWarned) {
    console.warn('[healthcheck] SHEETS_ENABLED=false; skipping Google Sheets checks.');
    globalThis.__sheetsWarned = true;
  }
}

async function run() {
  let exitCode = 0;

  try {
    if (!process.env.PG_URI) {
      throw new Error('Missing PG_URI');
    }

    // DB check (uses shared pool from lib/db.js)
    const client = await pool.connect();
    try {
      const countRes = await client.query(
        "SELECT COUNT(*) FROM facebook_ad_insights WHERE fetched_at >= NOW() - INTERVAL '24 hours'"
      );
      const lastRes = await client.query(
        'SELECT MAX(fetched_at) AS last FROM facebook_ad_insights'
      );

      const rows = Number(countRes.rows[0].count || 0);
      const lastWrite = lastRes.rows[0]?.last;

      log(`[healthcheck] Rows added in last 24h: ${rows}`);
      log(`[healthcheck] Last DB write: ${lastWrite || 'NULL'}`);

      const tooOld =
        !lastWrite || new Date(lastWrite).getTime() < Date.now() - 24 * 60 * 60 * 1000;

      if (tooOld) {
        log('[healthcheck] Last DB write is older than 24 hours');
        exitCode = 1;
      }
    } finally {
      client.release();
    }
  } catch (err) {
    exitCode = 1;
    await logError('[healthcheck] Database check failed', err);
  }

  // Google Sheets check (optional)
  if (SHEETS_ENABLED) {
    try {
      const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const sheetId = process.env.GOOGLE_SHEET_ID;

      if (!sheetId || !credsPath || !fs.existsSync(credsPath)) {
        throw new Error('Missing Google Sheets credentials or key file');
      }

      const auth = new google.auth.GoogleAuth({
        keyFile: credsPath,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/drive.metadata.readonly',
        ],
      });

      const client = await auth.getClient();
      const drive = google.drive({ version: 'v3', auth: client });
      const file = await drive.files.get({
        fileId: sheetId,
        fields: 'modifiedTime',
      });

      const modified = file.data.modifiedTime;
      log(`[healthcheck] Google Sheet last modified: ${modified || 'NULL'}`);

      const tooOld =
        !modified || new Date(modified).getTime() < Date.now() - 24 * 60 * 60 * 1000;

      if (tooOld) {
        log('[healthcheck] Google Sheets sync is older than 24 hours');
        exitCode = 1;
      }
    } catch (err) {
      exitCode = 1;
      await logError('[healthcheck] Google Sheets check failed', err);
    }
  } else {
    warnOnceSheetsDisabled();
  }

  process.exit(exitCode);
}

run().catch(async (err) => {
  await logError('[healthcheck] Uncaught error', err);
  process.exit(1);
});