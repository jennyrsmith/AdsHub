import { DateTime } from 'luxon';
import { pool } from './db.js';
import { log, logError } from '../logger.js';

const timezone = 'America/Chicago';

export async function refreshDailyRollup(startDate, endDate) {
  const start = DateTime.fromISO(startDate, { zone: timezone }).toISODate();
  const end = DateTime.fromISO(endDate, { zone: timezone }).toISODate();
  const started = Date.now();
  log(`rollup ${start} to ${end}`);
  const sql = `INSERT INTO daily_rollup (platform, date, spend, revenue, impressions, clicks)
    SELECT platform, date, SUM(spend) AS spend, SUM(revenue) AS revenue,
           SUM(impressions) AS impressions, SUM(clicks) AS clicks
    FROM (
      SELECT 'facebook'::text AS platform,
             date_start::date AS date,
             spend,
             COALESCE(purchase_roas * spend,0)::numeric AS revenue,
             impressions,
             clicks
        FROM facebook_ad_insights
       WHERE date_start >= $1 AND date_start <= $2
      UNION ALL
      SELECT 'youtube'::text AS platform,
             date_start::date AS date,
             cost AS spend,
             0::numeric AS revenue,
             impressions,
             clicks
        FROM youtube_ad_insights
       WHERE date_start >= $1 AND date_start <= $2
    ) AS s
    GROUP BY platform, date
    ON CONFLICT (platform, date) DO UPDATE SET
      spend = EXCLUDED.spend,
      revenue = EXCLUDED.revenue,
      impressions = EXCLUDED.impressions,
      clicks = EXCLUDED.clicks`;
  try {
    await pool.query(sql, [start, end]);
    const ms = Date.now() - started;
    log(`rollup ${start} to ${end} done in ${ms}ms`);
  } catch (err) {
    await logError(`rollup ${start} to ${end} failed`, err);
    throw err;
  }
}

export async function refreshMvSummary30d() {
  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_summary_30d');
  } catch (err) {
    if (err.code === '55000') {
      await pool.query('REFRESH MATERIALIZED VIEW mv_summary_30d');
    } else {
      throw err;
    }
  }
}

export async function refreshRecentWindows() {
  const tzNow = DateTime.now().setZone(timezone);
  const yesterday = tzNow.minus({ days: 1 }).toISODate();
  const start30 = tzNow.minus({ days: 30 }).toISODate();
  const started = Date.now();
  try {
    await refreshDailyRollup(yesterday, yesterday);
    await refreshDailyRollup(start30, yesterday);
    await refreshMvSummary30d();
    const ms = Date.now() - started;
    log(`rollup recent windows done in ${ms}ms`);
  } catch (err) {
    await logError('refreshRecentWindows failed', err);
    throw err;
  }
}
