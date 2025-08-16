// Load environment variables from appropriate .env file
import './lib/env.js';

// Import required modules
import express from 'express';
import { pool } from './lib/db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sessionMiddleware } from './middleware/auth/session.js';
import authRoutes from './routes/auth.js';
import { api } from './routes/api.js';

// Setup __dirname for ES modules (since __dirname isn't available by default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the Express app
const app = express();

// DigitalOcean App Platform injects a PORT value at runtime — use it, or fallback to 3000 locally
const PORT = Number(process.env.PORT || 3000);

// Trust the proxy (e.g. App Platform or Nginx) for things like IP and protocol headers
app.set('trust proxy', true);

// ========================================
// ✅ Middleware Setup
// ========================================

// Parse JSON bodies for API requests
app.use(express.json());

// Setup session management
app.use(sessionMiddleware);

// Mount authentication routes
app.use('/auth', authRoutes);

// Mount API routes
app.use('/api', api);

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

// Root route will be handled by the React app catch-all below


// ========================================
// ✅ Serve Vite-built frontend (from ui/dist)
// ========================================

const uiDistPath = path.join(__dirname, 'ui', 'dist');
console.log(`[STATIC] ${uiDistPath}`);

// Serve static assets (JS, CSS, images, etc.) with proper headers
app.use(express.static(uiDistPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  setHeaders: (res, path) => {
    // Set proper MIME types for assets
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// Catch-all route: return index.html for any non-API, non-static GET request
// This enables React Router or Vite SPA routing to work on direct page loads
app.get('*', (req, res) => {
  // Don't serve HTML for API routes, static assets, or files with extensions
  if (req.path.startsWith('/auth') || 
      req.path.startsWith('/api') || 
      req.path.startsWith('/assets') ||
      req.path.includes('.') ||
      req.path.startsWith('/healthz') ||
      req.path.startsWith('/readyz')) {
    return res.status(404).json({ error: 'Not found', path: req.path });
  }
  
  // For valid SPA routes, serve index.html
  const indexPath = path.join(uiDistPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(500).json({ 
      error: 'Frontend build not found', 
      path: indexPath,
      hint: 'Run npm run build to generate the frontend'
    });
  }
  
  res.sendFile(indexPath);
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
