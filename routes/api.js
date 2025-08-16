import express from 'express';
import { query } from '../lib/db.js';
import { requireApiKey } from '../lib/auth.js';
import { Readable } from 'node:stream';
import { facebookFetch } from '../services/facebookFetch.js';

export const api = express.Router();

// Protect everything under /api (skip for development)
if (process.env.NODE_ENV === 'production') {
  api.use(requireApiKey);
} else {
  console.log('🔓 API key protection disabled for development');
}

// Last sync (optional table sync_log)
api.get('/last-sync', async (_req, res) => {
  try {
    const r = await query(
      `SELECT source, MAX(finished_at) AS last_sync
         FROM sync_log
        WHERE success = true
        GROUP BY source`
    ).catch(() => ({ rows: [] }));
    res.json({ ok: true, rows: r.rows || [] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Summary (7|30 days). Works with either rollups or raw.
api.get('/summary', async (req, res) => {
  try {
    const range = (req.query.range || '7').toString() === '30' ? 30 : 7;
    const source = (req.query.source || 'auto').toString();

    let useRollup = false;
    if (source === 'rollup') {
      useRollup = true;
    } else if (source === 'raw') {
      useRollup = false;
    } else {
      const hasRollup = await query(
        `SELECT to_regclass('public.daily_rollup')::text AS t`
      );
      useRollup = hasRollup.rows?.[0]?.t === 'daily_rollup';
    }

    let rows;
    if (useRollup) {
      rows = (await query(
        `SELECT
           SUM(spend)               AS spend,
           SUM(revenue)             AS revenue,
           SUM(impressions)         AS impressions,
           SUM(clicks)              AS clicks
         FROM daily_rollup
        WHERE date >= CURRENT_DATE - $1::int`,
        [range]
      )).rows?.[0] || {};
    } else {
      rows = (await query(
        `SELECT
           COALESCE(SUM(spend::numeric),0)                        AS spend,
           COALESCE(SUM(revenue::numeric),0)                      AS revenue,
           COALESCE(SUM(impressions::numeric),0)                  AS impressions,
           COALESCE(SUM(clicks::numeric),0)                       AS clicks
         FROM facebook_ad_insights
        WHERE date_start >= CURRENT_DATE - $1::int`,
        [range]
      )).rows?.[0] || {};
    }

    const spend = Number(rows.spend || 0);
    const revenue = Number(rows.revenue || 0);
    const impressions = Number(rows.impressions || 0);
    const clicks = Number(rows.clicks || 0);
    const roas = spend > 0 ? revenue / spend : 0;

    res.json({ ok: true, range, spend, revenue, impressions, clicks, roas });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Rows endpoint with filtering/paging
api.get('/rows', async (req, res) => {
  try {
    const { start, end, limit = 100, offset = 0, search } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });

    const params = [start, end, Number(limit), Number(offset)];
    let where = `date_start >= $1 AND date_start <= $2`;
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (campaign_name ILIKE $${params.length} OR adset_name ILIKE $${params.length} OR ad_name ILIKE $${params.length})`;
    }

    const data = await query(
      `SELECT date_start, campaign_name, adset_name, ad_name,
              spend::numeric, impressions::numeric, clicks::numeric,
              COALESCE(revenue::numeric, 0) AS revenue
         FROM facebook_ad_insights
        WHERE ${where}
        ORDER BY date_start DESC
        LIMIT $3 OFFSET $4`,
      params
    );

    const total = await query(
      `SELECT COUNT(*)::int AS n
         FROM facebook_ad_insights
        WHERE ${where}`,
      params.slice(0, params.length - 2) // only start/end (+search) for count
    );

    res.json({ ok: true, total: total.rows?.[0]?.n || 0, rows: data.rows || [] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// CSV export (streaming)
api.get('/export.csv', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });

    const q = await query(
      `SELECT date_start AS date, campaign_name, adset_name, ad_name,
              spend::numeric, impressions::numeric, clicks::numeric,
              COALESCE(revenue::numeric, 0) AS revenue
         FROM facebook_ad_insights
        WHERE date_start >= $1 AND date_start <= $2
        ORDER BY date_start DESC`,
      [start, end]
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="export_${start}_${end}.csv"`);

    const header = 'date,campaign,adset,ad,spend,impressions,clicks,revenue\n';
    const stream = Readable.from([
      header,
      ...q.rows.map(r =>
        [r.date, r.campaign_name, r.adset_name, r.ad_name, r.spend, r.impressions, r.clicks, r.revenue]
          .map(v => (v == null ? '' : String(v).replace(/"/g, '""')))
          .map(v => (/[,"]/g.test(v) ? `"${v}"` : v))
          .join(',') + '\n'
      )
    ]);
    stream.pipe(res);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Manual sync trigger (stub calls your existing job if present)
api.post('/sync', async (_req, res) => {
  try {
    const r = await facebookFetch();
    res.json({ ok: true, rows: r.inserted });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({ ok: false, error: e.message });
  }
});

export default api;
