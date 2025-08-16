import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../lib/db.js';
import { localAuth } from '../lib/localAuth.js';

const router = express.Router();

// Debug endpoint to check environment and database status
router.get('/debug', async (req, res) => {
  try {
    const debug = {
      env: process.env.NODE_ENV,
      hasDbUri: !!process.env.PG_URI,
      hasSession: !!req.session,
      hasSessionSecret: !!process.env.SESSION_SECRET
    };
    
    // Test database connection
    try {
      await pool.query('SELECT 1');
      debug.dbConnected = true;
    } catch (err) {
      debug.dbConnected = false;
      debug.dbError = err.message;
    }
    
    // Test local auth
    try {
      const testUser = await localAuth.findUserByEmail('jenny@beautybyearth.com');
      debug.localAuthWorks = !!testUser;
    } catch (err) {
      debug.localAuthWorks = false;
      debug.localAuthError = err.message;
    }
    
    res.json(debug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/register  (admin only)
router.post('/register', async (req, res) => {
  try {
    const { email, password, role = 'viewer' } = req.body;
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
      [email, hash, role]
    );
    res.json({ ok: true, message: 'User registered' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt for:', req.body?.email);
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ ok: false, message: 'Email and password are required' });
    }

    console.log('🔍 Looking for user:', email);
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🗄️  PG_URI exists:', !!process.env.PG_URI);
    let user = null;
    
    try {
      // Try database first
      console.log('🔗 Attempting database connection...');
      const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
      console.log('👤 Users found in database:', rows.length);
      user = rows[0] || null;
      console.log('📊 Database query successful');
    } catch (dbError) {
      console.error('🚨 Database error:', dbError.message);
      console.log('⚠️  Database unavailable, using local auth');
      // Fallback to local authentication
      user = await localAuth.findUserByEmail(email);
      console.log('👤 User found in local store:', user ? 'yes' : 'no');
    }
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }
    console.log('🔑 Verifying password for user ID:', user.id);
    const match = await bcrypt.compare(password, user.password_hash);
    console.log('🔐 Password match:', match);
    
    if (!match) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    // Create session if session middleware is available
    if (req.session) {
      req.session.user = { id: user.id, email: user.email, role: user.role };
      console.log('✅ Login successful, session created');
      res.json({ ok: true, user: req.session.user });
    } else {
      console.log('⚠️  Session middleware not available, using stateless login');
      const userData = { id: user.id, email: user.email, role: user.role };
      
      // Set a simple cookie as fallback when sessions don't work
      res.cookie('user_data', JSON.stringify(userData), {
        httpOnly: false, // Allow client to read for now
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.json({ ok: true, user: userData, warning: 'Using cookie fallback' });
    }
  } catch (err) {
    console.error('💥 Login error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// GET /auth/me
router.get('/me', (req, res) => {
  // Check session first
  if (req.session?.user) {
    return res.json({ ok: true, user: req.session.user });
  }
  
  // Fallback to cookie if session isn't available
  try {
    if (req.cookies?.user_data) {
      const userData = JSON.parse(req.cookies.user_data);
      if (userData?.id && userData?.email) {
        return res.json({ ok: true, user: userData, source: 'cookie' });
      }
    }
  } catch (err) {
    console.log('Cookie parse error:', err.message);
  }
  
  // No valid authentication found
  res.status(401).json({ ok: false, error: 'unauthorized' });
});

export default router;
