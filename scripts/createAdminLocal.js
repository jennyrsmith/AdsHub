// scripts/createAdminLocal.js
// Create admin user locally for testing
import bcrypt from 'bcrypt';
import { pool } from '../lib/db.js';

const ADMIN_EMAIL = 'jenny@beautybyearth.com';
const ADMIN_PASSWORD = 'bBEHappy#120!ADS';

(async () => {
  try {
    console.log('🔐 Creating admin user locally...');
    
    // Hash the password
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // Create table if it doesn't exist
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
      [ADMIN_EMAIL, hash, 'admin']
    );

    console.log(`✅ Admin user created: ${ADMIN_EMAIL}`);
    console.log(`👤 User ID: ${result.rows[0].id}`);
    console.log(`🛡️  Role: admin`);
    console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
    
    // Test the login
    console.log('\n🧪 Testing password verification...');
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [ADMIN_EMAIL]);
    if (rows.length > 0) {
      const match = await bcrypt.compare(ADMIN_PASSWORD, rows[0].password_hash);
      console.log(`Password verification: ${match ? '✅ SUCCESS' : '❌ FAILED'}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create admin user:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
})();
