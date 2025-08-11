import dotenv from 'dotenv';
import { DateTime } from 'luxon';
import { pool } from '../lib/db.js';
import { refreshDailyRollup, refreshMvSummary30d } from '../lib/rollups.js';
import { upsertSyncLog } from '../syncLog.js';

dotenv.config();

function createPrng(seed) {
  let x = seed;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

function randn(prng) {
  let u = 0, v = 0;
  while (u === 0) u = prng();
  while (v === 0) v = prng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

async function seed() {
  const started = Date.now();
  const client = await pool.connect();
  const now = DateTime.now();
  const startDate = now.minus({ days: 29 }).toISODate();
  const endDate = now.toISODate();
  let fbInserted = 0;
  let fbUpdated = 0;
  let ytInserted = 0;
  let ytUpdated = 0;
  try {
    for (let d = 0; d < 30; d++) {
      const date = now.minus({ days: d }).toISODate();
      const daySeed = Number(date.replace(/-/g, ''));
      // Facebook campaigns
      let prng = createPrng(daySeed + 1);
      const fbCount = 3 + Math.floor(prng() * 4);
      for (let i = 1; i <= fbCount; i++) {
        const impressions = Math.floor(1000 + prng() * 9000);
        const ctr = 0.01 + prng() * 0.09;
        const clicks = Math.floor(impressions * ctr);
        const cpc = 0.5 + prng() * 2;
        const spend = Number((clicks * cpc).toFixed(2));
        const roas = Math.max(0, 2 + 0.5 * randn(prng));
        const revenue = Number((spend * roas).toFixed(2));
        const res = await client.query(
          `INSERT INTO facebook_ad_insights (platform, account_id, campaign_id, campaign_name, adset_name, ad_name, impressions, clicks, spend, revenue, date_start)
           VALUES ('facebook',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (platform, account_id, campaign_id, date_start)
           DO UPDATE SET campaign_name=EXCLUDED.campaign_name, adset_name=EXCLUDED.adset_name, ad_name=EXCLUDED.ad_name,
             impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks, spend=EXCLUDED.spend, revenue=EXCLUDED.revenue
           RETURNING xmax = 0 AS inserted`,
          [
            'act_demo_fb',
            `demo_fb_${i}`,
            `Demo FB Campaign ${i}`,
            `Demo FB Adset ${i}`,
            `Demo FB Ad ${i}`,
            impressions,
            clicks,
            spend,
            revenue,
            date,
          ]
        );
        if (res.rows[0].inserted) fbInserted++; else fbUpdated++;
      }
      // YouTube campaigns
      prng = createPrng(daySeed + 2);
      const ytCount = 3 + Math.floor(prng() * 4);
      for (let i = 1; i <= ytCount; i++) {
        const impressions = Math.floor(1000 + prng() * 9000);
        const ctr = 0.01 + prng() * 0.09;
        const clicks = Math.floor(impressions * ctr);
        const cpc = 0.5 + prng() * 2;
        const cost = Number((clicks * cpc).toFixed(2));
        const res = await client.query(
          `INSERT INTO youtube_ad_insights (platform, account_id, campaign_id, campaign_name, impressions, clicks, cost, date_start)
           VALUES ('youtube',$1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (platform, account_id, campaign_id, date_start)
           DO UPDATE SET campaign_name=EXCLUDED.campaign_name, impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks, cost=EXCLUDED.cost
           RETURNING xmax = 0 AS inserted`,
          [
            'act_demo_yt',
            `demo_yt_${i}`,
            `Demo YT Campaign ${i}`,
            impressions,
            clicks,
            cost,
            date,
          ]
        );
        if (res.rows[0].inserted) ytInserted++; else ytUpdated++;
      }
    }
    await refreshDailyRollup(startDate, endDate);
    await refreshMvSummary30d();
    const nowTs = new Date();
    await upsertSyncLog('facebook', nowTs);
    await upsertSyncLog('youtube', nowTs);
    const ms = Date.now() - started;
    console.log(`Seeded demo data fb: ${fbInserted} inserted/${fbUpdated} updated, yt: ${ytInserted} inserted/${ytUpdated} updated in ${ms}ms`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('demoSeed failed', err);
  process.exit(1);
});
