import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

export async function pushToGoogleSheets(insightsArray) {
  if (!process.env.GOOGLE_SHEET_ID) {
    throw new Error('Missing GOOGLE_SHEET_ID in environment variables');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = 'Facebook Ads';

  const headers = [
    'account_id',
    'campaign_name',
    'adset_name',
    'ad_name',
    'impressions',
    'clicks',
    'spend',
    'cpc',
    'ctr',
    'purchase_roas',
    'date_start',
    'date_stop',
  ];

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
}

