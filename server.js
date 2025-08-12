import express from 'express';
import dotenv from 'dotenv';
import { migrate } from './scripts/migrate.js';
import { pool } from './lib/db.js';
import aiCreativeRoutes from './routes/aiCreativeRoutes.js';
import { finalizeYesterdayIfNeeded, pullToday } from './cronHelpers.js';
import { runDailyCreativeRecs } from './dailyCreative.js';
import { getDashboardLastSync } from './syncState.js';

dotenv.config();
await migrate();

const app = express();
app.use(express.json());

function requireKey(req,res,next){
  const k = req.headers['x-api-key'];
  if (!process.env.SYNC_API_KEY || k !== process.env.SYNC_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/healthz', async (_req,res)=>{
  try { await pool.query('select 1'); res.json({status:'ok'}); }
  catch { res.status(500).json({status:'error'}); }
});
app.get('/readyz', (_req,res)=> res.json({status:'ok'}));

app.use('/api', requireKey);
app.use('/api', aiCreativeRoutes);

app.get('/api/last-sync', async (_req,res)=>{
  const data = await getDashboardLastSync();
  res.json(data);
});

app.post('/api/sync', async (req,res)=>{
  const scope = (req.body?.scope || 'all').toLowerCase();
  try {
    if (scope === 'init') return res.json({ queued: true, note: 'Run `npm run backfill` on server once' });
    if (scope === 'yesterday') { await finalizeYesterdayIfNeeded(); return res.json({ ok: true, scope }); }
    if (scope === 'today') { await pullToday(); return res.json({ ok: true, scope }); }
    if (scope === 'ai') { const out = await runDailyCreativeRecs(30); return res.json({ ok:true, ...out, scope }); }
    await finalizeYesterdayIfNeeded();
    await pullToday();
    const out = await runDailyCreativeRecs(30);
    res.json({ ok: true, ...out, scope:'all' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'sync failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
