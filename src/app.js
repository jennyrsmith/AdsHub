// src/app.js
import express from 'express';
import { dbReady } from '../lib/db.js';

export function createApp() {
  const app = express();

  app.use((req, _res, next) => {
    console.log('REQ', req.method, req.url);
    next();
  });

  // Liveness: app is up
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ ok: true, service: 'adshub-api' });
  });

  // Readiness: DB reachable
  app.get('/readyz', async (_req, res) => {
    const ok = await dbReady(2000);
    if (ok) {
      res.status(200).json({ ok: true });
    } else {
      res.status(503).json({ ok: false, reason: 'db-error' });
    }
  });

  // (Optional) Root route
  app.get('/', (_req, res) => {
    res.type('text/plain').send('AdsHub API');
  });

  return app;
}

