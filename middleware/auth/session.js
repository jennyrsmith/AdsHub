import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { pool } from '../../lib/db.js';

const PgSession = pgSession(session);

// Use memory store for development, PG store for production
let sessionStore;
if (process.env.NODE_ENV === 'production' && process.env.PG_URI) {
  try {
    sessionStore = new PgSession({
      pool,
      tableName: 'user_sessions'
    });
    console.log('🗄️  Using PostgreSQL session store');
  } catch (err) {
    console.error('⚠️  PostgreSQL session store failed:', err.message);
    console.log('💾 Falling back to memory session store');
    sessionStore = undefined;
  }
} else {
  console.log('💾 Using memory session store for development');
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

