// lib/localAuth.js
// Simple in-memory authentication for local development
import bcrypt from 'bcrypt';

// In-memory user store for local development
const localUsers = new Map();

// Initialize admin user
const initLocalAdmin = async () => {
  const adminEmail = 'jenny@beautybyearth.com';
  const adminPassword = 'bBEHappy#120!ADS';
  const hash = await bcrypt.hash(adminPassword, 12);
  
  localUsers.set(adminEmail, {
    id: 1,
    email: adminEmail,
    password_hash: hash,
    role: 'admin'
  });
  
  // Add team users
  const ryanPassword = 'RyanCEO@BBE$2025!aDshub';
  const ryanHash = await bcrypt.hash(ryanPassword, 12);
  localUsers.set('ryan@beautybyearth.com', {
    id: 2,
    email: 'ryan@beautybyearth.com',
    password_hash: ryanHash,
    role: 'admin'
  });
  
  const naazPassword = 'NaazBBE#2025!TeamLead';
  const naazHash = await bcrypt.hash(naazPassword, 12);
  localUsers.set('naazdeep@beautybyearth.com', {
    id: 3,
    email: 'naazdeep@beautybyearth.com',
    password_hash: naazHash,
    role: 'admin'
  });
  
  const manuelPassword = 'ManuelBBE&2025!DeV';
  const manuelHash = await bcrypt.hash(manuelPassword, 12);
  localUsers.set('manuel@beautybyearth.com', {
    id: 4,
    email: 'manuel@beautybyearth.com',
    password_hash: manuelHash,
    role: 'admin'
  });
  
  console.log('🔐 Local users initialized for development');
};

// Initialize users on module load
initLocalAdmin();

export const localAuth = {
  async findUserByEmail(email) {
    return localUsers.get(email) || null;
  },
  
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
};
