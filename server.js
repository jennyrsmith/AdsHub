import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import { log, logError } from './logger.js';
import { fetchFacebookInsights } from './facebookInsights.js';
import { saveToDatabase } from './saveToDatabase.js';
import { pushToGoogleSheets } from './pushToGoogleSheets.js';
import {
  fetchYouTubeInsights,
  saveYouTubeToDatabase,
  pushYouTubeToSheets,
} from './youtubeInsights.js';
import {
  ensureSyncLogTable,
  getLastSyncTimes,
  upsertSyncLog,
  pool,
} from './syncLog.js';
import { HEADERS, YOUTUBE_HEADERS } from './constants.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function requireEnv(key) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var ${key}`);
  }
}

requireEnv('PG_URI');
requireEnv('SYNC_API_KEY');
ensureSyncLogTable().catch((err) => logError('sync_log init failed', err));

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
    const fbRes = await pool.query(
      'SELECT COALESCE(SUM(spend),0) as spend, COALESCE(SUM(impressions),0) as impressions, COALESCE(SUM(clicks),0) as clicks, COALESCE(SUM(purchase_roas * spend),0) as revenue FROM facebook_ad_insights WHERE date_start >= $1',
      [startDate]
    );
    const ytRes = await pool.query(
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
    res.json([
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
    ]);
  } catch (err) {
    next(err);
  }
});

app.get('/api/export.csv', checkApiKey, async (req, res) => {
  const { platform = 'all', start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ error: 'start and end required' });
  }
  if (!['facebook', 'youtube', 'all'].includes(platform)) {
    return res.status(400).json({ error: 'invalid platform' });
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
  const batchSize = 1000;
  const ALL_HEADERS = ['platform', ...new Set([...HEADERS, ...YOUTUBE_HEADERS])];

  async function streamRows(p, headers, table) {
    let offset = 0;
    const selectCols = headers.join(', ');
    while (true) {
      const { rows } = await pool.query(
        `SELECT ${selectCols} FROM ${table} WHERE date_start >= $1 AND date_start <= $2 ORDER BY date_start LIMIT $3 OFFSET $4`,
        [start, end, batchSize, offset]
      );
      if (rows.length === 0) break;
      for (const row of rows) {
        let values;
        if (platform === 'all') {
          const data = { platform: p, ...row };
          values = ALL_HEADERS.map((h) => data[h] ?? '');
        } else {
          values = headers.map((h) => row[h] ?? '');
        }
        res.write(values.join(',') + '\n');
      }
      offset += rows.length;
    }
  }

  try {
    if (platform === 'facebook') {
      res.write(HEADERS.join(',') + '\n');
      await streamRows('facebook', HEADERS, 'facebook_ad_insights');
    } else if (platform === 'youtube') {
      res.write(YOUTUBE_HEADERS.join(',') + '\n');
      await streamRows('youtube', YOUTUBE_HEADERS, 'youtube_ad_insights');
    } else {
      res.write(ALL_HEADERS.join(',') + '\n');
      await streamRows('facebook', HEADERS, 'facebook_ad_insights');
      await streamRows('youtube', YOUTUBE_HEADERS, 'youtube_ad_insights');
    }
    res.end();
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

app.listen(PORT, () => {
  log(`Server listening on ${PORT}`);
});
