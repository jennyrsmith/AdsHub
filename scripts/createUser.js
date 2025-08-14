// scripts/createUser.js
import bcrypt from 'bcrypt';
import { pool } from '../lib/db.js';

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/createUser.js <email> <password>');
  process.exit(1);
}

(async () => {
  const hash = await bcrypt.hash(password, 12);

  // make sure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1,$2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email, hash]
  );

  console.log(`✅ User upserted: ${email}`);
  process.exit(0);
})().catch(err => {
  console.error('❌ Failed to create user:', err.message);
  process.exit(1);
});
