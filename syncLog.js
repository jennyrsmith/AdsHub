// Helper utilities for tracking sync completion times and events in Postgres
import { pool } from './lib/db.js';

export async function ensureSyncLogTable() {
  const client = await pool.connect();
  try {
    await client.query(
      'CREATE TABLE IF NOT EXISTS sync_log (platform text primary key, finished_at timestamptz)'
    );
  } finally {
    client.release();
  }
}

export async function getLastSyncTimes() {
  await ensureSyncLogTable();
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT platform, finished_at FROM sync_log');
    const map = { facebook: null, youtube: null };
    for (const row of res.rows) {
      map[row.platform] = row.finished_at;
    }
    return map;
  } finally {
    client.release();
  }
}

export async function upsertSyncLog(platform, finishedAt) {
  await ensureSyncLogTable();
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO sync_log(platform, finished_at) VALUES($1,$2) ON CONFLICT (platform) DO UPDATE SET finished_at = EXCLUDED.finished_at',
      [platform, finishedAt]
    );
  } finally {
    client.release();
  }
}

export async function logSync(scope, info) {
  await pool.query(`create table if not exists sync_events (
    id bigserial primary key,
    scope text,
    info jsonb,
    created_at timestamptz default now()
  )`);
  await pool.query(
    'insert into sync_events (scope, info) values ($1,$2::jsonb)',
    [scope, JSON.stringify(info)]
  );
}
