import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../lib/db.js';

const router = express.Router();

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
    console.log('🔐 Login attempt:', req.body);
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ ok: false, message: 'Email and password are required' });
    }

    console.log('🔍 Looking for user:', email);
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    console.log('👤 Users found:', rows.length);
    
    if (!rows.length) {
      console.log('❌ User not found');
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    const user = rows[0];
    console.log('🔑 Verifying password for user ID:', user.id);
    const match = await bcrypt.compare(password, user.password_hash);
    console.log('🔐 Password match:', match);
    
    if (!match) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    req.session.user = { id: user.id, email: user.email, role: user.role };
    console.log('✅ Login successful, session created');
    res.json({ ok: true, user: req.session.user });
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
  if (req.session?.user) {
    return res.json({ ok: true, user: req.session.user });
  }
  res.status(401).json({ ok: false, error: 'unauthorized' });
});

export default router;
