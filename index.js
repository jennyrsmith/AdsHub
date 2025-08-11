import fs from 'fs';
import dotenv from 'dotenv';
import { fetchFacebookInsights } from './facebookInsights.js';

dotenv.config();

const SHEETS_ENABLED = process.env.SHEETS_ENABLED !== 'false';

function warnOnce() {
  if (!globalThis.__sheetsWarned) {
    console.warn('Sheets disabled; skipping Google Sheets initialization.');
    globalThis.__sheetsWarned = true;
  }
}

function verifyCredentials() {
  const missing = [];
  if (!process.env.PG_URI) missing.push('PG_URI');
  if (SHEETS_ENABLED) {
    const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!process.env.GOOGLE_SHEET_ID || !creds || !fs.existsSync(creds)) {
      missing.push('Google Sheets credentials');
    }
  } else {
    warnOnce();
  }
  if (missing.length) {
    console.error(`Missing required credentials: ${missing.join(', ')}`);
    process.exit(1);
  }
}

verifyCredentials();

try {
  const data = await fetchFacebookInsights();
  console.log(JSON.stringify(data, null, 2));
} catch (err) {
  console.error('Error fetching insights:', err.message);
}

