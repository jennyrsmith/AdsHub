import 'dotenv/config';
import express from 'express';
import { pool } from './lib/db.js';

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/readyz', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, reason: 'db-error', error: String(err.message || err) });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`[start] adshub-api listening on http://${HOST}:${PORT}`);
});
