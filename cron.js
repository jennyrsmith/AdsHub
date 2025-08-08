import cron from 'node-cron';
import chalk from 'chalk';
import { fetchFacebookInsights } from './facebookInsights.js';
import { saveToDatabase } from './saveToDatabase.js';
import { pushToGoogleSheets } from './pushToGoogleSheets.js';
import { exportToCSV } from './exportToCsv.js';
import { log, logError, timeUTC } from './logger.js';

const timezone = 'America/Chicago';

cron.schedule(
  '0 3,9,15,21 * * *',
  async () => {
    log(chalk.cyan(`⏳ Starting Google Sheets sync at ${timeUTC()}`));
    try {
      const insights = await fetchFacebookInsights();
      exportToCSV(insights);
      await pushToGoogleSheets(insights);
      log(chalk.green(`✅ Sheets sync completed at ${timeUTC()}`));
    } catch (err) {
      await logError(`❌ Sheets sync failed at ${timeUTC()}`, err);
    }
  },
  { timezone }
);

cron.schedule(
  '0 0 * * *',
  async () => {
    log(chalk.cyan(`⏳ Starting database sync at ${timeUTC()}`));
    try {
      const insights = await fetchFacebookInsights();
      exportToCSV(insights);
      await saveToDatabase(insights);
      log(chalk.green(`✅ Synced to DB at ${timeUTC()}`));
    } catch (err) {
      await logError(`❌ Database sync failed at ${timeUTC()}`, err);
    }
  },
  { timezone }
);

log(chalk.yellow('Cron jobs scheduled'));

