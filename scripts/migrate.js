import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => /^\d+_.*\.sql$/.test(f))
    .sort((a,b) => Number(a.split('_')[0]) - Number(b.split('_')[0]));

  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations(
    filename TEXT PRIMARY KEY,
    executed_at timestamptz NOT NULL DEFAULT now()
  )`);

  for (const file of files) {
    const done = await pool.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [file]);
    if (done.rowCount) continue;

    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`[migrate] Running ${file}`);
    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations(filename) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      console.log(`[migrate] Finished ${file}`);
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error('[migrate] Failed migration file:', file);
      console.error('Message:', err.message);
      console.error('Detail:', err.detail || '(none)');
      console.error('Where:', err.where || '(none)');
      console.error('Stack:', err.stack);
      throw err;
    }
  }
}

migrate()
  .then(async () => { console.log('[migrate] Complete'); await pool.end(); })
  .catch(async (err) => {
    if (err?.errors && Array.isArray(err.errors)) {
      err.errors.forEach((e,i)=>console.error(`Aggregate suberror ${i+1}:`, e));
    }
    await pool.end().catch(()=>{});
    process.exit(1);
  });
