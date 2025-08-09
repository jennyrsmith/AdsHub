// Helper utilities for tracking sync completion times in Postgres
import pkg from 'pg';
import dotenv from 'dotenv';
import { logError } from './logger.js';

dotenv.config();

const { Pool } = pkg;
export const pool = new Pool({ connectionString: process.env.PG_URI });

export async function ensureSyncLogTable() {
  const client = await pool.connect();
  try {
    await client.query(
      'CREATE TABLE IF NOT EXISTS sync_log (platform text primary key, finished_at timestamptz)'
    );
  } catch (err) {
    await logError('Failed to ensure sync_log table', err);
    throw err;
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
