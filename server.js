import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import api from './routes/api.js';
import authRoutes from './routes/auth.js';
import { pool } from './lib/db.js';

const app = express();
app.set('trust proxy', true);

app.use(morgan('tiny'));
app.use(express.json({ limit: '2mb' }));

const origins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    cb(null, origins.includes(origin));
  },
  credentials: true
}));

const PgStore = connectPgSimple(session);
app.use(session({
  store: new PgStore({ pool }),
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
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
app.use('/auth', authRoutes);

// mount API
app.use('/api', api);
// API 404 guard
app.use('/api', (_req, res) => res.status(404).json({ error: 'not-found' }));

// static UI
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'ui', 'dist');
app.use(express.static(distPath));

// 404 guard (after mounting API)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/') ||
      req.path === '/healthz' || req.path === '/readyz') {
    return next();
  }

  if (!req.session?.user && req.path !== '/login') {
    return res.redirect('/login');
  }

  return res.sendFile(path.join(distPath, 'index.html'));
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  console.log(`[api] listening on http://${host}:${port}`);
});
