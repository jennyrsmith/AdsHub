// lib/env.js
// Smart environment file loading based on NODE_ENV
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const NODE_ENV = process.env.NODE_ENV || 'development';

// Skip .env file loading in production (DigitalOcean sets env vars directly)
if (NODE_ENV === 'production') {
  console.log(`🚀 Production mode: Using environment variables from platform (NODE_ENV=${NODE_ENV})`);
} else {
  // Determine which .env file to load for development
  let envFile;
  if (NODE_ENV === 'development') {
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
}

export { NODE_ENV };
