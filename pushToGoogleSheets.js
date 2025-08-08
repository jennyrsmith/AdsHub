import { google } from 'googleapis';
import dotenv from 'dotenv';
import { log, logError, timeUTC } from './logger.js';
import { HEADERS, SHEET_NAME } from './constants.js';

dotenv.config();

export async function pushToGoogleSheets(insightsArray) {
  log(`Pushing ${insightsArray.length} records to Google Sheets at ${timeUTC()}`);
  if (!process.env.GOOGLE_SHEET_ID) {
    throw new Error('Missing GOOGLE_SHEET_ID in environment variables');
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const rows = insightsArray.map((item) => HEADERS.map((h) => item[h]));

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${SHEET_NAME}!A:Z`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: SHEET_NAME,
      valueInputOption: 'RAW',
      requestBody: {
        values: [HEADERS, ...rows],
      },
    });
    log(`✅ Sheets sync completed at ${timeUTC()}`);
  } catch (err) {
    await logError(`Sheets sync failed at ${timeUTC()}`, err);
    throw err;
  }
}

