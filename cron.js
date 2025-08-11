import cron from 'node-cron';
import chalk from 'chalk';
import fs from 'fs';
import dotenv from 'dotenv';
import { fetchFacebookInsights } from './facebookInsights.js';
import { saveToDatabase } from './saveToDatabase.js';
import { pushToGoogleSheets } from './pushToGoogleSheets.js';
import { exportToCSV } from './exportToCsv.js';
import {
  fetchYouTubeInsights,
  saveYouTubeToDatabase,
  pushYouTubeToSheets,
} from './youtubeInsights.js';
import { runReport } from './reportSummary.js';
import { log, logError, timeUTC } from './logger.js';
import { exec } from 'child_process';
import util from 'util';
import { closeDb } from './lib/db.js';
import { connectRedis, closeRedis } from './lib/redis.js';
import { migrate } from './scripts/migrate.js';

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
  await migrate();
} catch (err) {
  await logError('migration failed', err);
  process.exit(1);
}

const timezone = 'America/Chicago';

connectRedis().catch((err) => logError('redis connect failed', err));

const jobs = [];
jobs.push(
  cron.schedule(
    '0 3,9,15,21 * * *',
    async () => {
      log(chalk.cyan(`⏳ Starting Google Sheets sync at ${timeUTC()}`));
      try {
        const fbInsights = await fetchFacebookInsights();
        exportToCSV(fbInsights);
        await pushToGoogleSheets(fbInsights);
        const ytInsights = await fetchYouTubeInsights();
        await pushYouTubeToSheets(ytInsights);
        log(chalk.green(`✅ Sheets sync completed at ${timeUTC()}`));
      } catch (err) {
        await logError(`❌ Sheets sync failed at ${timeUTC()}`, err);
      }
    },
    { timezone }
  )
);

jobs.push(
  cron.schedule(
    '0 0 * * *',
    async () => {
      log(chalk.cyan(`⏳ Starting database sync at ${timeUTC()}`));
      try {
        const fbInsights = await fetchFacebookInsights();
        exportToCSV(fbInsights);
        await saveToDatabase(fbInsights);
        const ytInsights = await fetchYouTubeInsights();
        await saveYouTubeToDatabase(ytInsights);
        log(chalk.green(`✅ Synced to DB at ${timeUTC()}`));
      } catch (err) {
        await logError(`❌ Database sync failed at ${timeUTC()}`, err);
      }
    },
    { timezone }
  )
);

jobs.push(
  cron.schedule(
    '0 8 * * *',
    async () => {
      log(chalk.cyan(`⏳ Sending report summary at ${timeUTC()}`));
      try {
        await runReport();
        log(chalk.green(`✅ Report sent at ${timeUTC()}`));
      } catch (err) {
        await logError(`❌ Report failed at ${timeUTC()}`, err);
      }
    },
    { timezone }
  )
);

const execAsync = util.promisify(exec);
let healthcheckFailures = 0;
jobs.push(
  cron.schedule(
    '0 * * * *',
    async () => {
      try {
        await execAsync('node healthcheck.js');
        healthcheckFailures = 0;
      } catch (err) {
        healthcheckFailures++;
        if (healthcheckFailures >= 2) {
          await logError('Healthcheck failed twice in a row', err);
        } else {
          await logError('Healthcheck failed', err);
        }
      }
    },
    { timezone }
  )
);

log(chalk.yellow('Cron jobs scheduled'));

function shutdown() {
  log(chalk.yellow('Shutting down cron'));
  for (const job of jobs) job.stop();
  Promise.all([
    closeDb().catch((err) => logError('db close failed', err)),
    closeRedis().catch((err) => logError('redis close failed', err)),
  ]).finally(() => process.exit(0));
}

process.on('SIGTERM', shutdown);

