import { pool } from './syncLog.js';
import { log } from './logger.js';

export async function logPlans() {
  const client = await pool.connect();
  try {
    const queries = [
      {
        name: 'facebook-summary',
        sql: `EXPLAIN ANALYZE SELECT COALESCE(SUM(spend),0) FROM facebook_ad_insights WHERE date_start >= CURRENT_DATE - INTERVAL '7 days'`,
      },
      {
        name: 'youtube-summary',
        sql: `EXPLAIN ANALYZE SELECT COALESCE(SUM(cost),0) FROM youtube_ad_insights WHERE date_start >= CURRENT_DATE - INTERVAL '7 days'`,
      },
      {
        name: 'rows-query',
        sql: `EXPLAIN ANALYZE SELECT * FROM (
          SELECT date_start, 'facebook' AS platform, account_id, NULL::text AS campaign_id, campaign_name, adset_name, ad_name,
          impressions, clicks, spend, COALESCE(purchase_roas * spend,0)::numeric AS revenue,
          CASE WHEN spend > 0 THEN COALESCE(purchase_roas * spend,0)/spend ELSE NULL END AS roas
          FROM facebook_ad_insights
          WHERE date_start BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE
          UNION ALL
          SELECT date_start, 'youtube' AS platform, NULL::text AS account_id, NULL::text AS campaign_id, campaign_name,
          NULL::text AS adset_name, NULL::text AS ad_name, impressions, clicks, cost AS spend, 0::numeric AS revenue,
          CASE WHEN cost > 0 THEN 0 ELSE NULL END AS roas
          FROM youtube_ad_insights
          WHERE date_start BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE
        ) AS sub ORDER BY date_start DESC LIMIT 100` ,
      },
    ];

    for (const q of queries) {
      const res = await client.query(q.sql);
      const plan = res.rows.map((r) => r['QUERY PLAN']).join('\n');
      log(`${q.name} plan:\n${plan}`);
    }
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  logPlans()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
