// scripts/createUser.js
import bcrypt from 'bcrypt';
import { getPool } from '../lib/db.js';

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/createUser.js <email> <password>');
  process.exit(1);
}

const hashPassword = async (plain) => {
  const saltRounds = 12;
  return bcrypt.hash(plain, saltRounds);
};

(async () => {
  try {
    const pool = await getPool();
    const hash = await hashPassword(password);
    await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [email, hash]);
    console.log(`✅ User ${email} created`);
    process.exit(0);
  } catch (err) {
    console.error('User creation failed:', err.message);
    process.exit(1);
  }
})();

