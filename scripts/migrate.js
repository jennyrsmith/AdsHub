import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../lib/db.js';
import { log, logError } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrate() {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const client = await pool.connect();
  try {
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())'
    );
    for (const file of files) {
      const version = file;
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE version=$1', [version]);
      if (applied.rowCount) continue;
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      const statements = sql
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      log(`Running migration ${version}`);
      const start = Date.now();
      await client.query('BEGIN');
      try {
        for (const stmt of statements) {
          await client.query(stmt);
        }
        await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [version]);
        await client.query('COMMIT');
        const ms = Date.now() - start;
        log(`Finished ${version} in ${ms}ms`);
      } catch (err) {
        await client.query('ROLLBACK');
        const failed = err?.message || '';
        await logError(`Migration ${version} failed: ${failed}`, err);
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(async () => {
      await pool.end();
      log('Migrations complete');
    })
    .catch(async (err) => {
      await pool.end();
      await logError('Migration run failed', err);
      process.exit(1);
    });
}

