import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import api from './routes/api.js';

const app = express();
app.set('trust proxy', true);

app.use(morgan('tiny'));
app.use(express.json({ limit: '2mb' }));
app.use(cors({
  origin: true, // allow UI on a different host
  credentials: false
}));

// health endpoints (no API key)
app.get('/healthz', (_req, res) => res.json({
  ok: true,
  service: 'adshub-api',
  version: process.env.npm_package_version || '0.0.0',
  sheetsEnabled: String(process.env.SHEETS_ENABLED) === 'true'
}));
app.get('/readyz', (_req, res) => res.json({ ok: true }));

// mount API
app.use('/api', api);

// 404 guard (after mounting API)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'not-found' });
  }
  res.status(404).send('Not found');
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  console.log(`[api] listening on http://${host}:${port}`);
});
