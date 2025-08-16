import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { pool } from '../../lib/db.js';

const PgSession = pgSession(session);

// Try to create PG session store, fallback to memory store
let sessionStore;
try {
  sessionStore = new PgSession({
    pool,
    tableName: 'user_sessions'
  });
  console.log('🗄️  Using PostgreSQL session store');
} catch (err) {
  console.log('⚠️  PostgreSQL session store failed, using memory store');
  sessionStore = undefined; // Will use default memory store
}

export const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
});

export function requireLogin(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ ok: false, message: 'Login required' });
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.session?.user?.role === role) return next();
    return res.status(403).json({ ok: false, message: 'Forbidden' });
  };
}

