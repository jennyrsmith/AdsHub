import fs from 'fs';
import dotenv from 'dotenv';
import { fetchFacebookInsights } from './facebookInsights.js';

dotenv.config();

function verifyCredentials() {
  const missing = [];
  if (!process.env.PG_URI) missing.push('PG_URI');
  if (!process.env.GOOGLE_SHEET_ID || !fs.existsSync('credentials.json')) {
    missing.push('Google Sheets credentials');
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

