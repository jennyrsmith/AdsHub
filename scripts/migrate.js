import 'dotenv/config';
import { pool } from '../db.js';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    create table if not exists schema_migrations(
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

async function run() {
  console.log('[migrate] using', new URL(process.env.PG_URI).host);
  await ensureMigrationsTable();
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const exists = await pool.query('select 1 from schema_migrations where id=$1', [file]);
    if (exists.rowCount) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log('Running migration', file);
    await pool.query('begin');
    try {
      await pool.query(sql);
      await pool.query('insert into schema_migrations(id) values($1)', [file]);
      await pool.query('commit');
      console.log('Finished', file);
    } catch (e) {
      await pool.query('rollback');
      console.error('Migration failed', file, e);
      process.exit(1);
    }
  }
  console.log('Migrations complete');
  process.exit(0);
}

run().catch(e => {
  console.error('Migration run failed', e);
  process.exit(1);
});
