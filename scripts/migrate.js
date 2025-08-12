import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../db.js';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
    for (const f of files) {
      const { rows } = await client.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [f]);
      if (rows.length) continue;

      console.log(`[migrate] Running ${f}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(filename) VALUES ($1)', [f]);
      console.log(`[migrate] Finished ${f}`);
    }
    await client.query('COMMIT');
    console.log('[migrate] All migrations complete');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[migrate] Failed:', e);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrate().then(() => process.exit(0));

