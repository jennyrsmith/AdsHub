import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import Cursor from 'pg-cursor';
import { log, logError } from './logger.js';
import { fetchFacebookInsights } from './facebookInsights.js';
import { saveToDatabase } from './saveToDatabase.js';
import { pushToGoogleSheets } from './pushToGoogleSheets.js';
import {
  fetchYouTubeInsights,
  saveYouTubeToDatabase,
  pushYouTubeToSheets,
} from './youtubeInsights.js';
import { getLastSyncTimes, upsertSyncLog } from './syncLog.js';
import { parseSort } from './sort.js';
import { migrate } from './scripts/migrate.js';
import { summaryCache } from './summaryCache.js';
import { pool, queryWithRetry, closeDb } from './lib/db.js';
import { connectRedis, redis, closeRedis } from './lib/redis.js';
import { createRequire } from 'module';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const require = createRequire(import.meta.url);
const { version } = require('./package.json');

function requireEnv(key) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var ${key}`);
  }
}

requireEnv('PG_URI');
requireEnv('SYNC_API_KEY');
let migrationsApplied = false;
try {
  await migrate();
  migrationsApplied = true;
} catch (err) {
  await logError('init failed', err);
  process.exit(1);
}
connectRedis().catch((err) => logError('redis connect failed', err));

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());
app.use((req, res, next) => {
  log(`${req.method} ${req.url}`);
  next();
});

function checkApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key && key === process.env.SYNC_API_KEY) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

const REQUIRE_KEY_PUBLIC = process.env.REQUIRE_KEY_PUBLIC === 'true';
function maybeAuth(req, res, next) {
  if (REQUIRE_KEY_PUBLIC) return checkApiKey(req, res, next);
  return next();
}

app.get('/healthz', async (req, res) => {
  const status = { status: 'ok', db: 'down', redis: 'down', version };
  try {
    await pool.query('SELECT 1');
    status.db = 'ok';
  } catch {}
  try {
    if (redis) {
      await redis.ping();
      status.redis = 'ok';
    }
  } catch {}
  res.json(status);
});

app.get('/readyz', async (req, res) => {
  if (!migrationsApplied) return res.status(503).end();
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok' });
  } catch {
    return res.status(503).end();
  }
});

// helper to construct union queries for facebook/youtube tables
function buildUnionQuery({ platform, start, end, q }) {
  const params = [start, end];
  let qIndex = null;
  if (q) {
    params.push(`%${q}%`);
    qIndex = params.length; // 1-based index after push
  }

  const fbWhere = ["date_start >= $1", "date_start <= $2"];
  const ytWhere = ["date_start >= $1", "date_start <= $2"];
  if (qIndex) {
    fbWhere.push(
      `(campaign_name ILIKE $${qIndex} OR adset_name ILIKE $${qIndex} OR ad_name ILIKE $${qIndex})`
    );
    ytWhere.push(`campaign_name ILIKE $${qIndex}`);
  }

  const fbSelect = `SELECT date_start, 'facebook' AS platform, account_id, NULL::text AS campaign_id, campaign_name, adset_name, ad_name, impressions, clicks, spend, COALESCE(purchase_roas * spend,0)::numeric AS revenue, CASE WHEN spend > 0 THEN COALESCE(purchase_roas * spend,0)/spend ELSE NULL END AS roas FROM facebook_ad_insights WHERE ${fbWhere.join(
    ' AND '
  )}`;

  const ytSelect = `SELECT date_start, 'youtube' AS platform, NULL::text AS account_id, NULL::text AS campaign_id, campaign_name, NULL::text AS adset_name, NULL::text AS ad_name, impressions, clicks, cost AS spend, 0::numeric AS revenue, CASE WHEN cost > 0 THEN 0 ELSE NULL END AS roas FROM youtube_ad_insights WHERE ${ytWhere.join(
    ' AND '
  )}`;

  let unionSql;
  if (platform === 'facebook') unionSql = fbSelect;
  else if (platform === 'youtube') unionSql = ytSelect;
  else unionSql = `${fbSelect} UNION ALL ${ytSelect}`;

  return { unionSql, params };
}

// simple in-memory rate limiter for CSV exports
const exportCounts = new Map();
function rateLimitExport(req, res, next) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 5;
  const ip = req.ip || req.connection.remoteAddress;
  const info = exportCounts.get(ip) || { count: 0, start: now };
  if (now - info.start > windowMs) {
    info.count = 0;
    info.start = now;
  }
  info.count += 1;
  exportCounts.set(ip, info);
  if (info.count > limit) {
    return res.status(429).json({ error: 'Too many export requests' });
  }
  next();
}

app.get('/api/last-sync', maybeAuth, async (req, res, next) => {
  try {
    const times = await getLastSyncTimes();
    res.json({
      facebook: times.facebook ? new Date(times.facebook).toISOString() : null,
      youtube: times.youtube ? new Date(times.youtube).toISOString() : null,
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/sync', checkApiKey, async (req, res) => {
  const platform = req.body.platform || 'all';
  const platforms = platform === 'all' ? ['facebook', 'youtube'] : [platform];
  let recordsSynced = 0;
  const finishedAt = new Date();
  try {
    for (const p of platforms) {
      if (p === 'facebook') {
        const data = await fetchFacebookInsights();
        await saveToDatabase(data);
        await pushToGoogleSheets(data);
        await upsertSyncLog('facebook', new Date());
        recordsSynced += data.length;
      } else if (p === 'youtube') {
        const data = await fetchYouTubeInsights();
        await saveYouTubeToDatabase(data);
        await pushYouTubeToSheets(data);
        await upsertSyncLog('youtube', new Date());
        recordsSynced += data.length;
      }
    }
    res.json({
      platform,
      recordsSynced,
      finishedAt: finishedAt.toISOString(),
    });
  } catch (err) {
    await logError('Sync failed', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/summary', maybeAuth, async (req, res, next) => {
  const range = Number(req.query.range || 7);
  if (![7, 30].includes(range)) {
    return res.status(400).json({ error: 'range must be 7 or 30' });
  }
  try {
    const timezone = 'America/Chicago';
    const startDate = DateTime.now().setZone(timezone).minus({ days: range }).toISODate();
    const cached = summaryCache.get(range);
    if (cached) return res.json(cached);

    const fbRes = await queryWithRetry(
      'SELECT COALESCE(SUM(spend),0) as spend, COALESCE(SUM(impressions),0) as impressions, COALESCE(SUM(clicks),0) as clicks, COALESCE(SUM(purchase_roas * spend),0) as revenue FROM facebook_ad_insights WHERE date_start >= $1',
      [startDate]
    );
    const ytRes = await queryWithRetry(
      'SELECT COALESCE(SUM(cost),0) as spend, COALESCE(SUM(impressions),0) as impressions, COALESCE(SUM(clicks),0) as clicks FROM youtube_ad_insights WHERE date_start >= $1',
      [startDate]
    );
    const fb = fbRes.rows[0];
    const yt = ytRes.rows[0];
    const fbSpend = Number(fb.spend);
    const fbRevenue = Number(fb.revenue) || 0;
    const fbRoas = fbSpend ? fbRevenue / fbSpend : null;
    const ytSpend = Number(yt.spend);
    const ytRevenue = Number(yt.revenue) || null;
    const ytRoas = ytRevenue && ytSpend ? ytRevenue / ytSpend : null;
    const result = [
      {
        platform: 'facebook',
        spend: fbSpend,
        revenue: fbRevenue || null,
        roas: fbRoas,
        impressions: Number(fb.impressions),
        clicks: Number(fb.clicks),
      },
      {
        platform: 'youtube',
        spend: ytSpend,
        revenue: ytRevenue,
        roas: ytRoas,
        impressions: Number(yt.impressions),
        clicks: Number(yt.clicks),
      },
    ];
    summaryCache.set(range, result);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get('/api/rows', maybeAuth, async (req, res, next) => {
  const {
    platform = 'all',
    start,
    end,
    q,
    sort,
    limit = 500,
    offset = 0,
  } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'start and end required' });
  if (!['facebook', 'youtube', 'all'].includes(platform))
    return res.status(400).json({ error: 'invalid platform' });
  const lim = Number(limit) || 500;
  if (lim > 2000) return res.status(400).json({ error: 'limit must be <= 2000' });
  const off = Number(offset) || 0;
  try {
    const { unionSql, params } = buildUnionQuery({ platform, start, end, q });
    const orderClause = parseSort(sort);
    const countRes = await queryWithRetry(
      `SELECT COUNT(*) FROM (${unionSql}) AS sub`,
      params
    );
    const idx = params.length + 1;
    const rowsSql = `SELECT * FROM (${unionSql}) AS sub ${orderClause} LIMIT $${idx} OFFSET $${idx + 1}`;
    const rowsRes = await queryWithRetry(rowsSql, [...params, lim, off]);
    res.json({ rows: rowsRes.rows, total: Number(countRes.rows[0].count) });
  } catch (err) {
    next(err);
  }
});

app.get('/api/export.csv', checkApiKey, rateLimitExport, async (req, res) => {
  const { platform = 'all', start, end, q, sort } = req.query;
  if (!start || !end) {
    return res.status(400).json({ error: 'start and end required' });
  }
  if (!['facebook', 'youtube', 'all'].includes(platform)) {
    return res.status(400).json({ error: 'invalid platform' });
  }

  const headers = [
    'date_start',
    'platform',
    'account_id',
    'campaign_id',
    'campaign_name',
    'adset_name',
    'ad_name',
    'impressions',
    'clicks',
    'spend',
    'revenue',
    'roas',
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
  try {
    const { unionSql, params } = buildUnionQuery({ platform, start, end, q });
    const orderClause = parseSort(sort);
    const client = await pool.connect();
    try {
      const cursor = client.query(new Cursor(`${unionSql} ${orderClause}`, params));
      res.write(headers.join(',') + '\n');
      function read() {
        cursor.read(1000, async (err, rows) => {
          if (err) {
            await logError('export.csv cursor error', err);
            cursor.close(() => client.release());
            return res.end();
          }
          if (!rows.length) {
            cursor.close(() => {
              client.release();
              res.end();
            });
            return;
          }
          for (const row of rows) {
            const values = headers.map((h) => row[h] ?? '');
            res.write(values.join(',') + '\n');
          }
          read();
        });
      }
      read();
    } catch (err) {
      client.release();
      throw err;
    }
  } catch (err) {
    await logError('export.csv failed', err);
    res.status(500).end();
  }
});

const uiPath = path.join(__dirname, 'ui', 'dist');
app.use(express.static(uiPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(uiPath, 'index.html'));
});

app.use(async (err, req, res, next) => {
  await logError('API error', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const server = app.listen(PORT, () => {
  log(`Server listening on ${PORT}`);
});

function shutdown() {
  log('Shutting down');
  server.close(async () => {
    await closeDb().catch((err) => logError('db close failed', err));
    await closeRedis().catch((err) => logError('redis close failed', err));
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
