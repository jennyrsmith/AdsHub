import 'dotenv/config';
import http from 'http';
import express from 'express';
import { pool } from './lib/db.js';

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const app = express();

app.use((req,res,next)=>{ try{ console.log('REQ', req.method, req.url); }catch(e){} next(); });

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true, service: 'api', ver: '0.0.0' });
});

app.get('/readyz', async (_req, res) => {
  try {
    const ctl = new AbortController();
    const t = setTimeout(()=>ctl.abort(), 3000);
    const r = await pool.query({ text: 'SELECT 1', signal: ctl.signal });
    clearTimeout(t);
    return res.status(200).json({ ok: true, db: 'up', rows: r.rowCount });
  } catch (err) {
    return res.status(503).json({ ok: false, reason: 'db-error', error: String(err && err.message || err) });
  }
});

app.get('/', (_req, res) => res.status(200).send('OK'));

const server = http.createServer(app);
server.listen(PORT, HOST, () => {
  console.log(`[start] adshub-api listening on http://${HOST}:${PORT}`);
});
