import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import os from 'node:os';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, getPool } from './lib/db.js';
import aiCreativeRoutes from './routes/aiCreativeRoutes.js';
import { fetchFacebookInsights } from './facebookInsights.js';
import { fetchYouTubeInsights } from './youtubeInsights.js';
import { getDashboardLastSync } from './syncState.js';
import { yesterdayRange, todayRange } from './lib/date.js';
import googleAuthRoutes from './routes/googleAuthRoutes.js';
import authRoutes from './routes/auth.js';
import { sessionMiddleware, requireLogin } from './middleware/auth/session.js';
import { diagnose, startupDiagnostics } from './services/facebookClient.js';

const app = express();
app.use((req,res,next)=>{ console.log("REQ", req.method, req.path); next(); });
app.use(express.json());
app.use(sessionMiddleware);

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const VERSION = process.env.npm_package_version || '0.0.0';
const SHEETS_ENABLED = String(process.env.SHEETS_ENABLED || 'false').toLowerCase() === 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Public routes ---
app.use('/auth', authRoutes);

// --- Health endpoints ---
app.get('/healthz', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'adshub-api',
    version: VERSION,
    uptime: process.uptime(),
    host: os.hostname(),
    sheetsEnabled: SHEETS_ENABLED
  });
});

app.get('/readyz', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(503).json({ ok: false, reason: 'db-error', error: e.message });
  }
});

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!process.env.SYNC_API_KEY || key !== process.env.SYNC_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/api/summary', requireApiKey, async (req, res) => {
  try {
    const { rows } = await getPool().query(`
      SELECT
        COALESCE(SUM(spend),0)::float8 AS spend,
        COALESCE(SUM(revenue),0)::float8 AS revenue,
        CASE WHEN SUM(spend) > 0 THEN (SUM(revenue)/SUM(spend))::float8 ELSE 0 END AS roas,
        COALESCE(SUM(impressions),0)::int AS impressions,
        COALESCE(SUM(clicks),0)::int AS clicks
      FROM daily_rollup
      WHERE date >= CURRENT_DATE - 7
    `);
    res.json({ range: 7, ...rows[0] });
  } catch (e) {
    console.error('summary error:', e.message);
    res.status(500).json({ error: 'server-error' });
  }
});

app.get('/api/rows', requireApiKey, async (req, res) => {
  try {
    const limit = Math.min(500, parseInt(req.query.limit || '100', 10));
    const { rows } = await getPool().query(`
      SELECT date, platform, campaign_name, adset_name, ad_name,
             spend, revenue, roas, ctr, clicks, impressions
      FROM daily_rollup
      ORDER BY date DESC
      LIMIT $1
    `, [limit]);

    res.json({ rows, total: rows.length });
  } catch (e) {
    console.error('rows error:', e.message);
    res.status(500).json({ error: 'server-error' });
  }
});

app.get('/api/fb/diag', requireApiKey, async (_req, res) => {
  try {
    const report = await diagnose();
    res.json({ ok: true, ...report });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// --- Authenticated API routes ---
app.use('/api', requireLogin);
app.use('/api', googleAuthRoutes);
app.use('/api', aiCreativeRoutes);

app.get('/api/last-sync', async (_req, res) => {
  const data = await getDashboardLastSync();
  res.json(data);
});

app.post('/api/sync', async (req, res) => {
  const body = req.body || {};
  const { since, until, scope = 'all' } = body;
  const base = since && until ? { since, until } : {};
  const doFb = scope === 'all' || scope === 'facebook';
  const doYt = scope === 'all' || scope === 'youtube';
  const range = since && until ? { since, until } : (process.env.SYNC_MODE === 'today' ? todayRange() : yesterdayRange());
  try {
    const fb = doFb ? fetchFacebookInsights(base).catch((e) => ({ error: true, message: e.message })) : null;
    const yt = doYt ? fetchYouTubeInsights(base).catch((e) => ({ error: true, message: e.message })) : null;
    const [fbRes, ytRes] = await Promise.all([fb, yt]);
    const out = { ok: true, range };
    if (fbRes !== null) out.facebook = fbRes.error ? fbRes : { count: fbRes.length };
    if (ytRes !== null) out.youtube = ytRes.error ? ytRes : { count: ytRes.length };
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'sync failed' });
  }
});

// --- Static UI ---
app.use(express.static(path.join(__dirname, 'ui', 'dist')));

app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, 'ui', 'dist', 'index.html'));
});

app.get('*', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'ui', 'dist', 'index.html'));
});

// --- Startup log ---
app.listen(PORT, HOST, () => {
  const dbHost = (() => {
    try {
      const conn = process.env.DATABASE_URL || process.env.PG_URI;
      const u = new URL(conn);
      return u.hostname + ':' + (u.port || '5432');
    } catch {
      return 'unknown';
    }
  })();
  console.log(
    `[start] adshub-api v${VERSION} listening on http://${HOST}:${PORT} (${process.env.NODE_ENV || 'dev'})`
  );
  console.log(`[config] DB host=${dbHost} sheetsEnabled=${SHEETS_ENABLED} pg_ca=${process.env.PG_CA_PATH || '(none)'}`);
  startupDiagnostics();
});

export default app;

