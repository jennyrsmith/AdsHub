// Load environment variables from .env file
import 'dotenv/config';

// Import required modules
import express from 'express';
import { pool } from './lib/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules (since __dirname isn't available by default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the Express app
const app = express();

// DigitalOcean App Platform injects a PORT value at runtime — use it, or fallback to 3000 locally
const PORT = Number(process.env.PORT || 3000);

// Trust the proxy (e.g. App Platform or Nginx) for things like IP and protocol headers
app.set('trust proxy', true);

// --- Health Check Endpoint ---
// Used by App Platform to verify the container is alive
app.get('/healthz', (_req, res) => {
  res.json({
    ok: true,
    service: 'adshub-api',
    env: process.env.NODE_ENV || 'dev'
  });
});

// --- Readiness Probe ---
// Ensures Postgres connection is working before marking app as "ready"
app.get('/readyz', async (_req, res) => {
  try {
    await pool.query('SELECT 1'); // simple query to test DB
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({
      ok: false,
      reason: 'db-error',
      error: String(err?.message || err)
    });
  }
});

// --- Simple Root Route for Sanity Testing ---
// Optional: returns text at the root URL
app.get('/', (_req, res) => res.send('adsHub API is up'));


// ========================================
// ✅ Serve Vite-built frontend (from ui/dist)
// ========================================

const uiDistPath = path.join(__dirname, 'ui', 'dist');
console.log(`[STATIC] ${uiDistPath}`);

// Serve static assets (JS, CSS, images, etc.)
app.use(express.static(uiDistPath));

// Catch-all route: return index.html for any non-API GET request
// This enables React Router or Vite SPA routing to work on direct page loads
app.get('*', (_req, res) => {
  res.sendFile(path.join(uiDistPath, 'index.html'));
});

// Fallback 404 for any non-matched routes/methods
app.use((_req, res) => {
  res.status(404).send('Not found');
});


// ========================================
// ✅ Start the server
// ========================================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[start] adshub-api listening on 0.0.0.0:${PORT} (${process.env.NODE_ENV || 'dev'})`);
});


// ========================================
// ✅ Graceful Shutdown Handler
// Ensures clean disconnect from Postgres and exits the process
// ========================================
const shutdown = (sig) => () => {
  console.log(`[${sig}] shutting down...`);
  server.close(() => {
    pool.end().catch(() => {}); // Close DB pool
    process.exit(0);
  });
};

// Listen for termination signals from App Platform
process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));
