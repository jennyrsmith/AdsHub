import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir)
    .filter(f => /^\d+_.*\.sql$/.test(f))
    .sort((a,b) => Number(a.split('_')[0]) - Number(b.split('_')[0]));

  await pool.query(`create table if not exists schema_migrations (filename text primary key, executed_at timestamptz not null default now())`);

  for (const file of files) {
    const applied = await pool.query('select 1 from schema_migrations where filename=$1', [file]);
    if (applied.rowCount) continue;

    const sql = fs.readFileSync(path.join(dir, file)).toString();
    console.log(new Date().toISOString(), '- Running migration', file);
    try {
      await pool.query('begin');
      await pool.query(sql);
      await pool.query('insert into schema_migrations (filename) values ($1)', [file]);
      await pool.query('commit');
      console.log(new Date().toISOString(), '- Finished', file);
    } catch (err) {
      await pool.query('rollback');
      console.error('Migration failed in', file);
      console.error('Message:', err.message);
      console.error('Detail:', err.detail || '(no detail)');
      console.error('Where:', err.where || '(no where)');
      console.error('Stack:', err.stack);
      throw err;
    }
  }
}

runMigrations()
  .then(() => {
    console.log(new Date().toISOString(), '- Migrations complete');
    return pool.end();
  })
  .catch(async (err) => {
    // Unwrap AggregateError
    if (err?.errors && Array.isArray(err.errors)) {
      err.errors.forEach((e, i) => console.error(`Aggregate suberror ${i+1}:`, e));
    }
    console.error(new Date().toISOString(), '- Migration run failed -', err.name || 'Error');
    try { await pool.end(); } catch {}
    process.exit(1);
  });
