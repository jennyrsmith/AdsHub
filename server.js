import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import os from 'node:os';
import { pool } from './lib/db.js';
import aiCreativeRoutes from './routes/aiCreativeRoutes.js';
import { finalizeYesterdayIfNeeded, pullToday } from './cronHelpers.js';
import { runDailyCreativeRecs } from './dailyCreative.js';
import { getDashboardLastSync } from './syncState.js';
import googleAuthRoutes from './routes/googleAuthRoutes.js';

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const VERSION = process.env.npm_package_version || '0.0.0';
const SHEETS_ENABLED = String(process.env.SHEETS_ENABLED || 'false').toLowerCase() === 'true';

app.use('/api', googleAuthRoutes);

function requireKey(req, res, next) {
  const k = req.headers['x-api-key'];
  if (!process.env.SYNC_API_KEY || k !== process.env.SYNC_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

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

// existing routes
app.use('/api', requireKey);
app.use('/api', aiCreativeRoutes);

app.get('/api/last-sync', async (_req, res) => {
  const data = await getDashboardLastSync();
  res.json(data);
});

app.post('/api/sync', async (req, res) => {
  const scope = (req.body?.scope || 'all').toLowerCase();
  try {
    if (scope === 'init') return res.json({ queued: true, note: 'Run `npm run backfill` on server once' });
    if (scope === 'yesterday') { await finalizeYesterdayIfNeeded(); return res.json({ ok: true, scope }); }
    if (scope === 'today') { await pullToday(); return res.json({ ok: true, scope }); }
    if (scope === 'ai') { const out = await runDailyCreativeRecs(30); return res.json({ ok: true, ...out, scope }); }
    await finalizeYesterdayIfNeeded();
    await pullToday();
    const out = await runDailyCreativeRecs(30);
    res.json({ ok: true, ...out, scope: 'all' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'sync failed' });
  }
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
});

export default app;

