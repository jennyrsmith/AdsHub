# AdsHub

A Node.js service that pulls Facebook and YouTube Ads insights and syncs them to PostgreSQL and Google Sheets.

It runs as two processes:

- **Web** – `server.js` serves the REST API and static UI.
- **Worker** – `cron.js` schedules recurring sync and reporting jobs.
Shared modules live under `lib/` and are used by both processes.

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
   FB_APP_ID=your_fb_app_id
   FB_APP_SECRET=your_fb_app_secret
   PG_URI=postgres://user:pass@host/db
   GOOGLE_SHEET_ID=your_sheet_id
   GOOGLE_ADS_CUSTOMER_ID=123-456-7890
   GOOGLE_ADS_DEVELOPER_TOKEN=your_google_ads_dev_token
   SLACK_WEBHOOK_URL=https://hooks.slack.com/... # optional
   ERROR_ALERT_EMAIL=alerts@example.com # optional
   SYNC_API_KEY=some-long-random-string
   ```

3. **Run**
   - Fetch data once: `npm start`
   - Start worker: `npm run cron`
   - Start web server: `npm run server`
   - Health script: `npm run healthcheck`

## Database & Migrations
Migrations live under `migrations/` and are plain SQL files prefixed with a UTC timestamp (e.g. `001_baseline.sql`).

Run them locally with:

```bash
npm run migrate
```

Both `server.js` and `cron.js` apply pending migrations on startup so production instances stay up to date automatically.

### Baseline schema
`facebook_ad_insights` and `youtube_ad_insights` share the same columns:

- `date_start` DATE
- `account_id` TEXT
- `campaign_id` TEXT
- `campaign_name` TEXT
- `adset_name` TEXT
- `ad_name` TEXT
- `impressions` INT
- `clicks` INT
- `spend` NUMERIC
- `revenue` NUMERIC DEFAULT 0
- `platform` TEXT

Unique key:

- `UNIQUE(platform, account_id, campaign_id, date_start)`

Indexes:

- `(date_start, platform)`
- `(campaign_name)`
- `(account_id)`

`sync_log` tracks last successful sync:

- `platform` TEXT PRIMARY KEY
- `finished_at` TIMESTAMPTZ

To add a new migration, create a new timestamped file in `migrations/`, then run `npm run migrate` to apply it.

## Google Sheets
Place `credentials.json` for a service account in the project root. The sheet includes `Facebook Ads` and `YouTube Ads` tabs.

## Scheduling
`cron.js` schedules:
- Facebook & YouTube Sheets sync at 03:00, 09:00, 15:00, and 21:00 UTC-6 (America/Chicago)
- Nightly database sync at 00:00
- Healthcheck hourly with Slack/email alert after two failures
- Morning summary at 08:00
Logs are written to `logs/cron.log`.

## CSV Export
Each sync writes a CSV copy in the `data/` folder named `facebook-insights-YYYY-MM-DD.csv`.

## Manual Control API
Start the server with:

```bash
npm run server
```

If a static dashboard exists in `ui/dist`, the server will also serve those files at the root path.

### GET `/api/last-sync`
Returns the most recent successful sync timestamps for each platform:

```json
{ "facebook": "2024-01-01T00:00:00.000Z", "youtube": "2024-01-01T00:00:00.000Z" }
```

### POST `/api/sync`
Trigger an on-demand sync. Requires header `x-api-key: SYNC_API_KEY`.

Body (optional):
```json
{ "platform": "facebook" | "youtube" | "all" }
```

Example:
```bash
curl -X POST http://localhost:3005/api/sync \
  -H "x-api-key: $SYNC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"platform":"facebook"}'
```

### GET `/api/summary?range=7|30`
Returns spend, impressions, clicks, and ROAS for the last N days by platform.

### GET `/api/rows`
Query params:

| param | description |
|-------|-------------|
| `platform` | `facebook`, `youtube` or `all` (default) |
| `start` | start date `YYYY-MM-DD` (required) |
| `end` | end date `YYYY-MM-DD` (required) |
| `q` | optional text search across campaign/adset/ad name |
| `sort` | `field:asc|desc` where field in `date_start, spend, clicks, impressions, roas, campaign_name` |
| `limit` | max rows per page (default 500, max 2000) |
| `offset` | pagination offset (default 0) |

Returns `{"rows": [...], "total": number}` with a combined view of Facebook and YouTube records.

### GET `/api/export.csv`
Same filters as `/api/rows` and protected by header `x-api-key: SYNC_API_KEY`.
Streams a CSV with columns:

`date_start, platform, account_id, campaign_id, campaign_name, adset_name, ad_name, impressions, clicks, spend, revenue, roas`

Exports are rate limited to 5 requests per minute per IP.

Fetch last sync example:

```bash
curl http://localhost:3005/api/last-sync
```

## Performance
- Narrow date ranges when querying `/api/rows` or `/api/export.csv` for faster responses.
- Large exports may take time to stream.

### Query plan logging
To inspect query plans locally, run:

```bash
node planLogger.js
```

## Backfill
Run historical pulls between two dates:

```
npm run backfill 2024-01-01 2024-01-31
```

## Deployment to Render
1. Push this repo to GitHub.
2. Render reads `render.yaml` to provision both a web service (`server.js`) and a background worker (`cron.js`).
3. Set the required environment variables: `FB_ACCESS_TOKEN`, `FB_AD_ACCOUNTS`, `FB_APP_ID`, `FB_APP_SECRET`, `PG_URI`, `GOOGLE_SHEET_ID`, `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `SLACK_WEBHOOK_URL`, optional `ERROR_ALERT_EMAIL`, and `SYNC_API_KEY`.
4. Deploy; future commits to the `main` branch trigger automatic deploys.

## Health Endpoints

- `GET /healthz` – returns `{ status: 'ok', db: 'ok'|'down', redis: 'ok'|'down', version }`.
- `GET /readyz` – responds `200` only when the database is reachable and migrations have run.

## Token Rotation
- Refresh the Facebook long-lived token every ~45 days:
  ```bash
  npm run rotate-token -- --write
  ```
  Omitting `--write` prints the new token without updating `.env`.

## Security
- Rotate your Facebook App Secret regularly and generate a new long-lived `FB_ACCESS_TOKEN`.
- `.env` and `credentials.json` are excluded from git via `.gitignore`.
- When persistent failures occur the logger will note `Would send email to ...` using `ERROR_ALERT_EMAIL`.
