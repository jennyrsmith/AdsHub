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
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!rows.length) return res.status(401).json({ ok: false, message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ ok: false, message: 'Invalid credentials' });

    req.session.user = { id: user.id, email: user.email, role: user.role };
    res.json({ ok: true, user: req.session.user });
  } catch (err) {
    console.error(err);
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
