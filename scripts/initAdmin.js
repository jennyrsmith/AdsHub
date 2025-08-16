// scripts/initAdmin.js
// Securely creates the initial admin user from environment variables
import bcrypt from 'bcrypt';
import { pool } from '../lib/db.js';

// Get admin credentials from environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_ROLE = 'admin';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log('ℹ️  No admin credentials provided via environment variables.');
  console.log('   Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables to create admin user.');
  process.exit(0);
}

(async () => {
  try {
    console.log('🔐 Initializing admin user...');
    
    // Hash the password securely
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // Ensure users table exists with role column
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'viewer',
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Insert or update admin user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET 
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role
       RETURNING id`,
      [ADMIN_EMAIL, hash, ADMIN_ROLE]
    );

    console.log(`✅ Admin user initialized: ${ADMIN_EMAIL}`);
    console.log(`👤 User ID: ${result.rows[0].id}`);
    console.log(`🛡️  Role: ${ADMIN_ROLE}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to initialize admin user:', err.message);
    process.exit(1);
  }
})();