import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
import { log, logError } from './logger.js';

dotenv.config();

async function rotateToken(write) {
  const { FB_APP_ID, FB_APP_SECRET, FB_ACCESS_TOKEN } = process.env;
  if (!FB_APP_ID || !FB_APP_SECRET || !FB_ACCESS_TOKEN) {
    console.error('Missing FB_APP_ID, FB_APP_SECRET or FB_ACCESS_TOKEN');
    process.exit(1);
  }
  try {
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${FB_ACCESS_TOKEN}&access_token=${FB_APP_ID}|${FB_APP_SECRET}`;
    const debugRes = await axios.get(debugUrl);
    const expiresAt = debugRes.data.data.expires_at * 1000;
    const remainingDays = (expiresAt - Date.now()) / (1000 * 60 * 60 * 24);
    if (remainingDays > 10) {
      log(`Token is fresh with ${remainingDays.toFixed(1)} days remaining.`);
      return;
    }
    const exchangeUrl = `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${FB_ACCESS_TOKEN}`;
    const exchangeRes = await axios.get(exchangeUrl);
    const newToken = exchangeRes.data.access_token;
    log(`New token: ${newToken}`);
    if (write) {
      const envPath = '.env';
      if (fs.existsSync(envPath)) {
        const env = fs
          .readFileSync(envPath, 'utf8')
          .split('\n')
          .map((line) =>
            line.startsWith('FB_ACCESS_TOKEN=')
              ? `FB_ACCESS_TOKEN=${newToken}`
              : line
          )
          .join('\n');
        fs.writeFileSync(envPath, env);
        log('Updated .env with new token');
      }
    }
  } catch (err) {
    await logError('Token rotation failed', err);
    process.exit(1);
  }
}

const writeFlag = process.argv.includes('--write');
rotateToken(writeFlag);
