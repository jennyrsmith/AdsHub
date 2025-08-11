import { google } from 'googleapis';
import dotenv from 'dotenv';
import { log, logError, timeUTC } from './logger.js';
import { HEADERS, SHEET_NAME } from './constants.js';

dotenv.config();

const SHEETS_ENABLED = process.env.SHEETS_ENABLED !== 'false';

function warnOnce() {
  if (!globalThis.__sheetsWarned) {
    console.warn('Sheets disabled; skipping Google Sheets initialization.');
    globalThis.__sheetsWarned = true;
  }
}

let pushSummaryToSheet;
let pushRowsToSheet;

if (!SHEETS_ENABLED) {
  warnOnce();
  pushSummaryToSheet = async () => {};
  pushRowsToSheet = async () => {};
} else {
  pushRowsToSheet = async (
    insightsArray,
    sheetName = SHEET_NAME,
    headers = HEADERS
  ) => {
    log(
      `Pushing ${insightsArray.length} records to Google Sheets at ${timeUTC()}`
    );
    if (!process.env.GOOGLE_SHEET_ID) {
      throw new Error('Missing GOOGLE_SHEET_ID in environment variables');
    }

    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const client = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: client });
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;

      const rows = insightsArray.map((item) => headers.map((h) => item[h]));

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: sheetName,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers, ...rows],
        },
      });
      log(`✅ Sheets sync completed at ${timeUTC()}`);
    } catch (err) {
      await logError(`Sheets sync failed at ${timeUTC()}`, err);
      throw err;
    }
  };

  // For now summary and rows share the same implementation
  pushSummaryToSheet = async (...args) => pushRowsToSheet(...args);
}

export { pushSummaryToSheet, pushRowsToSheet };

