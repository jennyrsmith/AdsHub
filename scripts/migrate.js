import dotenv from 'dotenv';
dotenv.config();

// Load database pool after env vars are available
const { pool, closeDb } = await import('../lib/db.js');
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function migrate() {
  const client = await pool.connect();
  let currentFile;
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const f of files) {
      currentFile = f;
      const { rows } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename=$1',
        [f],
      );
      if (rows.length) continue;

      console.log(`[migrate] Running ${f}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(filename) VALUES ($1)', [f]);
      console.log(`[migrate] Finished ${f}`);
    }
    await client.query('COMMIT');
    console.log('[migrate] All migrations complete');
  } catch (err) {
    await client.query('ROLLBACK');
    err.migrationFile = currentFile;
    throw err;
  } finally {
    client.release();
  }
}

let exitCode = 0;
try {
  await migrate();
} catch (err) {
  exitCode = 1;
  console.error(
    `[migrate] Failed migration file: ${err.migrationFile || 'unknown'}`,
  );
  if (err instanceof AggregateError) {
    for (const e of err.errors) {
      console.error(e.message);
      console.error(e.stack);
    }
  } else {
    console.error(err.message);
    console.error(err.stack);
  }
}

await closeDb();
process.exit(exitCode);

