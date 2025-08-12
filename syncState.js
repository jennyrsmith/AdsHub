import { pool } from "./lib/db.js";

async function ensure() {
  await pool.query(`create table if not exists sync_state (
    scope text primary key,
    finished_at timestamptz not null
  )`);
}

export async function getLastSync(scope) {
  await ensure();
  const { rows } = await pool.query('select finished_at from sync_state where scope=$1', [scope]);
  return rows[0]?.finished_at || null;
}

export async function markLastSync(scope, ts = new Date()) {
  await ensure();
  await pool.query(
    `insert into sync_state(scope, finished_at) values($1,$2)
     on conflict(scope) do update set finished_at=excluded.finished_at`,
    [scope, ts]
  );
}

export async function getDashboardLastSync() {
  await ensure();
  const { rows } = await pool.query('select scope, finished_at from sync_state');
  const out = {};
  for (const r of rows) out[r.scope] = r.finished_at;
  return out;
}
