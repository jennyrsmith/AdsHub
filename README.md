# AdsHub

A Node.js service that pulls Facebook and YouTube Ads insights and syncs them to PostgreSQL and Google Sheets.

It runs as two processes:

- **Web** – `server.js` serves the REST API and static UI.
- **Worker** – `cron.js` schedules recurring sync and reporting jobs.
Shared modules live under `lib/` and are used by both processes.

## Dashboard UI

The dashboard provides a modern, Stripe-style overview of your ad performance.

![Dashboard screenshot](docs/dashboard.png)

### Commands

- Development: `npm run ui`
- Production preview: `npm run ui:build && npm run start:web`

Create `/ui/.env.local` and set `VITE_SYNC_API_KEY` to enable authenticated actions in development.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment variables**
   Create a `.env` file with:
   ```env
   FB_ACCESS_TOKEN=your_token
   FB_BUSINESS_ID=1013395692075293
   FB_AD_ACCOUNTS=act_420838866444927,act_1538360642912126
   FB_APP_ID=your_fb_app_id
   FB_APP_SECRET=your_fb_app_secret
   PG_URI=postgres://user:pass@host/db
   GOOGLE_SHEET_ID=your_sheet_id
   GOOGLE_APPLICATION_CREDENTIALS=credentials.json
   GOOGLE_ADS_CUSTOMER_ID=123-456-7890
   GOOGLE_ADS_DEVELOPER_TOKEN=your_google_ads_dev_token
   SLACK_WEBHOOK_URL=https://hooks.slack.com/... # optional
   ERROR_ALERT_EMAIL=alerts@example.com # optional
   SYNC_API_KEY=some-long-random-string
   SHEETS_ENABLED=true
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

### Daily rollups

`daily_rollup` stores aggregated spend, revenue, impressions, and clicks per platform per day. It has primary key `(platform, date)` and an index on `date` for range queries. A materialized view `mv_summary_30d` pre-aggregates totals for the last 30 days.

Nightly, the worker refreshes rollups for yesterday and the last 30‑day window and then refreshes the materialized view. The `/api/summary` endpoint uses these rollups for 7‑ and 30‑day ranges by default.

## Google Sheets
Place `credentials.json` for a service account in the project root. The sheet includes `Facebook Ads` and `YouTube Ads` tabs.

### Local dev

Set `SHEETS_ENABLED=false` to run without Google Sheets.
To enable Sheets, provide `GOOGLE_SHEET_ID` and `GOOGLE_APPLICATION_CREDENTIALS` and set `SHEETS_ENABLED=true`.

## Local Demo Mode

Quickly explore the UI without real API credentials.

### .env

```
DEMO_MODE=true
SHEETS_ENABLED=false
PG_URI=...
SYNC_API_KEY=...
```

### Run

```
npm run migrate
npm run demo:seed
npm run dev:all
```

### Optional clean

```
npm run demo:clear
```

Demo rows use `account_id` like `act_demo_fb` / `act_demo_yt` and `campaign_id` prefixed `demo_` for safe deletion.

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

Defaults:
- No body => pulls the previous full day
- Provide `{ "scope": "all", "since": "YYYY-MM-DD", "until": "YYYY-MM-DD" }` for an explicit range

Example:
```bash
curl -X POST http://localhost:3005/api/sync \
  -H "x-api-key: $SYNC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scope":"facebook"}'
```

### GET `/api/summary?range=7|30&source=raw|rollup|auto`
Returns spend, impressions, clicks, and ROAS for the last N days by platform. For 7- and 30-day ranges, rollups are used by default (`source=auto`). Set `source=raw` to force scanning raw tables or `source=rollup` to bypass the fallback logic.

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

## RUNBOOK

```bash
# Load env
set -a; source .env; set +a

# Seed login (runs table create if missing)
EMAIL="jenny@beautybyearth.com" PASSWORD="bBEHappy#120!ADS" npm run seed:user

# Start / restart app
pm2 restart adshub || pm2 start ecosystem.config.cjs
pm2 logs --lines 50

# Health & API
curl -sS https://ads.beautybyearth.com/readyz | jq
curl -sS -H "x-api-key: $SYNC_API_KEY" "https://ads.beautybyearth.com/api/summary?range=7" | jq
curl -sS -H "x-api-key: $SYNC_API_KEY" "https://ads.beautybyearth.com/api/rows?limit=5" | jq
```

Acceptance:

- `/readyz` returns `{ ok:true }`
- `/api/summary` returns JSON (not HTML) when given `x-api-key`
- Visiting `https://ads.beautybyearth.com` shows Login, accepts the seeded user, and loads the dashboard.
- Nginx serves HTTPS with a valid certificate.

### GET `/api/fb/diag`
Returns diagnostics for the configured Facebook token and accounts. Requires header `x-api-key: SYNC_API_KEY`.

```json
{ "ok": true, "tokenOwner": { "id": "123", "name": "Owner" }, "accounts": [{ "id": "act_1", "canRead": true }], "missingPermissions": [] }
```

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

Populate daily rollups over a range:

```
npm run rollup:backfill
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

## Local Dev End-to-End
- Backend:
  npm run migrate
  npm start   # http://localhost:3000/readyz should return 200
- Frontend:
  Create /ui/.env.local with:
    VITE_API_BASE=
    VITE_SYNC_API_KEY=<same value as SYNC_API_KEY in root .env>
  Then:
    npm --prefix ui install
    npm run ui   # Opens http://localhost:5173 (or 5174)
- Verify:
  curl -s "http://localhost:3000/api/summary?range=7" -H "x-api-key: $SYNC_API_KEY"
  curl -s "http://localhost:3000/api/rows?start=2025-08-05&end=2025-08-11&limit=5" -H "x-api-key: $SYNC_API_KEY"
- Troubleshooting:
  401/403 → bad/missing x-api-key
  500 → backend exception (check server logs)
  Network errors → backend not running or proxy misconfigured

## Private Deployment (Option 3: Public IP with Allow-List)

### A. Configure env
1. Copy `.env.example` to `.env` and fill in values.
2. Set `SYNC_API_KEY` and `PG_URI` for your DigitalOcean Postgres instance.
3. Optionally set `UI_USER` and `UI_PASS` to require basic auth for the UI.
4. Set `CORS_ORIGINS` to trusted domains (comma-separated). Leave empty to block browser origins.

### B. Start app (PM2 or systemd)
Run the web server with your process manager of choice.

### C. DigitalOcean Firewall
Allow inbound ports **22** and **3000** only from your IP(s) and deny all other inbound traffic.

### D. (Optional) UFW on droplet
```bash
chmod +x ops/ufw-allowlist.sh
sudo ./ops/ufw-allowlist.sh init
sudo ./ops/ufw-allowlist.sh add <YOUR_IP>
```

### E. Verify
From an allowed IP:
```bash
curl -s http://<DROPLET_IP>:3000/healthz
curl -s -H "x-api-key: $SYNC_API_KEY" "http://<DROPLET_IP>:3000/api/summary?range=7"
```
From a blocked IP you should see a connection timeout or firewall deny.

### F. UI access
If basic auth is enabled, the browser will prompt for `UI_USER` and `UI_PASS`.
The UI's fetches already send the `x-api-key` header from `VITE_SYNC_API_KEY`.

### UI Live Data
- Configure `/ui/.env.local` (dev) or `.env.production` (build):
  - `VITE_API_BASE` = http://localhost:3000 (dev) or https://<droplet-ip> (prod)
  - `VITE_SYNC_API_KEY` = your API key (matches server)
- Run dev UI: `npm run ui`
- Backend should be running: `npm start`
- Endpoints used: /api/last-sync, /api/sync (POST), /api/summary, /api/rows, /api/export.csv

## Server Update Workflow

To pull latest code on the server and run migrations safely:

```bash
chmod +x scripts/update-from-github.sh
./scripts/update-from-github.sh
```

- Local changes are stashed automatically.
- certs/db-ca.pem is used if present; otherwise pool falls back to sslmode=require with rejectUnauthorized:false.
- Migrations print exact failing file + SQL error on failure.

---

### 3) What you’ll run on the server

```bash
# from /root/AdsHub
chmod +x scripts/update-from-github.sh
./scripts/update-from-github.sh

If you need strict SSL with CA verification:

# Ensure the cert exists (the file you pasted earlier)
ls certs/db-ca.pem

# Optionally set explicit path (not required since we auto-check certs/db-ca.pem)
export PG_CA_PATH=/root/AdsHub/certs/db-ca.pem
```
