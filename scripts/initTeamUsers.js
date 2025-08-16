// scripts/initTeamUsers.js
// Creates team user accounts with secure passwords
import bcrypt from 'bcrypt';
import { pool } from '../lib/db.js';

// Team user credentials with secure passwords
const TEAM_USERS = [
  {
    email: 'ryan@beautybyearth.com',
    password: 'RyanCEO@BBE$2025!aDshub',
    role: 'admin'
  },
  {
    email: 'naazdeep@beautybyearth.com', 
    password: 'NaazBBE#2025!TeamLead',
    role: 'admin'
  },
  {
    email: 'manuel@beautybyearth.com',
    password: 'ManuelBBE&2025!DeV',
    role: 'admin'
  }
];

(async () => {
  try {
    console.log('👥 Initializing team users...');
    
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

    for (const user of TEAM_USERS) {
      // Hash the password securely
      const hash = await bcrypt.hash(user.password, 12);

      // Insert or update user
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET 
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role
         RETURNING id`,
        [user.email, hash, user.role]
      );

      console.log(`✅ User initialized: ${user.email}`);
      console.log(`   👤 User ID: ${result.rows[0].id}`);
      console.log(`   🛡️  Role: ${user.role}`);
      console.log(`   🔑 Password: ${user.password}`);
      console.log('');
    }
    
    console.log('🎉 All team users initialized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to initialize team users:', err.message);
    process.exit(1);
  }
})();
