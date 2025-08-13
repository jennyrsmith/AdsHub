import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiDir = path.join(__dirname, '..', 'ui');

const env = {
  ...process.env,
  VITE_API_BASE: process.env.VITE_API_BASE || process.env.API_BASE || '',
  VITE_SYNC_API_KEY: process.env.VITE_SYNC_API_KEY || process.env.SYNC_API_KEY || ''
};

const child = spawn('npm', ['run', 'build'], { cwd: uiDir, stdio: 'inherit', env });
child.on('exit', code => process.exit(code));
