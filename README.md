# AdsHub

A Node.js service that pulls Facebook Ads insights and syncs them to PostgreSQL and Google Sheets.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment variables**
   Create a `.env` file with:
   ```env
   FB_ACCESS_TOKEN=your_token
   FB_AD_ACCOUNTS=act_123,act_456
   PG_URI=postgres://user:pass@host/db
   GOOGLE_SHEET_ID=your_sheet_id
   SLACK_WEBHOOK_URL=https://hooks.slack.com/... # optional
   ```

3. **Run**
   - Fetch data once: `npm start`
   - Start scheduled jobs: `npm run cron`
   - Health check: `npm run healthcheck`

## Database
The app writes insights to the `facebook_ad_insights` table. Connect using `PG_URI` and the script will create the table if needed.

## Google Sheets
Place `credentials.json` for a service account in the project root. The sheet tab name is `Facebook Ads`.

## Scheduling
`cron.js` schedules:
- Google Sheets sync at 03:00, 09:00, 15:00, and 21:00 UTC-6 (America/Chicago)
- Database sync nightly at 00:00
Logs are written to `logs/cron.log`.

## CSV Export
Each sync writes a CSV copy in the `data/` folder named `facebook-insights-YYYY-MM-DD.csv`.
