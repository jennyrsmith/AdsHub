// server.js
import 'dotenv/config';
import express from 'express';
import { pool } from './lib/db.js';

const app = express();

// App Platform injects PORT; bind to 0.0.0.0 so the router can reach you.
const PORT = Number(process.env.PORT || 3000);

// (Optional but nice)
app.set('trust proxy', true);

// Basic health for the platform probe
app.get('/healthz', (_req, res) => {
  res.json({
    ok: true,
    service: 'adshub-api',
    env: process.env.NODE_ENV || 'dev'
  });
});

// Readiness: prove we can hit Postgres
app.get('/readyz', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({
      ok: false,
      reason: 'db-error',
      error: String(err?.message || err)
    });
  }
});

// (Optional simple root)
app.get('/', (_req, res) => res.send('adsHub API is up'));

// Start
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[start] adshub-api listening on 0.0.0.0:${PORT} (${process.env.NODE_ENV || 'dev'})`);
});
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend files (adjust 'dist' if needed)
app.use(express.static(path.join(__dirname, 'ui', 'build')));

// Catch-all route for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'ui', 'build', 'index.html'));
});

// Graceful shutdown for App Platform
const shutdown = (sig) => () => {
  console.log(`[${sig}] shutting down...`);
  server.close(() => {
    pool.end().catch(() => {});
    process.exit(0);
  });
};
process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));