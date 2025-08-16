// lib/env.js
// Smart environment file loading based on NODE_ENV
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const NODE_ENV = process.env.NODE_ENV || 'development';

// Determine which .env file to load
let envFile;
if (NODE_ENV === 'production') {
  envFile = '.env';
} else if (NODE_ENV === 'development') {
  envFile = '.env.dev';
} else {
  envFile = '.env';
}

// Check if the file exists
if (fs.existsSync(envFile)) {
  console.log(`🔧 Loading environment from: ${envFile} (NODE_ENV=${NODE_ENV})`);
  dotenv.config({ path: envFile });
} else {
  console.log(`⚠️  Environment file ${envFile} not found, using default .env`);
  dotenv.config();
}

export { NODE_ENV };
