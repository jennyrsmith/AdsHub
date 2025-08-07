import cron from 'node-cron';
import { fetchFacebookInsights } from './facebookInsights.js';
import { saveToDatabase } from './saveToDatabase.js';
import { pushToGoogleSheets } from './pushToGoogleSheets.js';

const timezone = 'America/Chicago';

const log = (message) => {
  console.log(`${new Date().toISOString()} - ${message}`);
};

cron.schedule('0 3,9,15,21 * * *', async () => {
  log('Running Google Sheets sync');
  try {
    const insights = await fetchFacebookInsights();
    await pushToGoogleSheets(insights);
    log('Google Sheets sync successful');
  } catch (err) {
    console.error(`${new Date().toISOString()} - Google Sheets sync failed:`, err.message);
  }
}, { timezone });

cron.schedule('0 0 * * *', async () => {
  log('Running database sync');
  try {
    const insights = await fetchFacebookInsights();
    await saveToDatabase(insights);
    log('Database sync successful');
  } catch (err) {
    console.error(`${new Date().toISOString()} - Database sync failed:`, err.message);
  }
}, { timezone });

log('Cron jobs scheduled');

