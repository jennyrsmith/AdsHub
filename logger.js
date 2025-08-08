import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, 'cron.log');

export function log(message) {
  const entry = `${new Date().toISOString()} - ${message}`;
  console.log(entry);
  try {
    fs.appendFileSync(logFile, entry + '\n');
  } catch {}
}

export async function logError(message, error) {
  const entry = `${new Date().toISOString()} - ${message} - ${error?.message || error}`;
  console.error(entry);
  try {
    fs.appendFileSync(logFile, entry + '\n');
  } catch {}
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await axios.post(process.env.SLACK_WEBHOOK_URL, { text: entry });
    } catch (err) {
      console.error(`${new Date().toISOString()} - Failed to send Slack notification: ${err.message}`);
    }
  }
}

export const timeUTC = () => `${new Date().toISOString().slice(11,16)} UTC`;

