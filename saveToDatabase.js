// saveToDatabase.js
import { pool } from "./lib/db.js";

export async function insertOnly(platform, rows) {
  if (!rows?.length) return { inserted: 0 };
  const table = platform === "facebook" ? "facebook_ad_insights" : "youtube_ad_insights";
  const client = await pool.connect();
  try {
    const tmp = rows.map(r => [
      r.date_start, r.campaign_name, r.adset_name, r.ad_name,
      r.impressions, r.clicks, r.spend, r.cpc, r.ctr, r.purchase_roas, r.revenue
    ]);
    const values = tmp.map((_, i) =>
      `($${i*11+1},$${i*11+2},$${i*11+3},$${i*11+4},$${i*11+5},$${i*11+6},$${i*11+7},$${i*11+8},$${i*11+9},$${i*11+10},$${i*11+11})`
    ).join(",");

    const sql = `
      insert into ${table}
        (date_start, campaign_name, adset_name, ad_name, impressions, clicks, spend, cpc, ctr, purchase_roas, revenue)
      values ${values}
      on conflict do nothing
    `;
    await client.query(sql, tmp.flat());
    return { inserted: rows.length };
  } finally {
    client.release();
  }
}

export async function upsertToday(platform, rows) {
  if (!rows?.length) return { upserted: 0 };
  const table = platform === "facebook" ? "facebook_ad_insights" : "youtube_ad_insights";
  const client = await pool.connect();
  try {
    const tmp = rows.map(r => [
      r.date_start, r.campaign_name, r.adset_name, r.ad_name,
      r.impressions, r.clicks, r.spend, r.cpc, r.ctr, r.purchase_roas, r.revenue
    ]);
    const values = tmp.map((_, i) =>
      `($${i*11+1},$${i*11+2},$${i*11+3},$${i*11+4},$${i*11+5},$${i*11+6},$${i*11+7},$${i*11+8},$${i*11+9},$${i*11+10},$${i*11+11})`
    ).join(",");

    const sql = `
      insert into ${table}
        (date_start, campaign_name, adset_name, ad_name, impressions, clicks, spend, cpc, ctr, purchase_roas, revenue)
      values ${values}
      on conflict (date_start, campaign_name, adset_name, ad_name)
      do update set
        impressions=excluded.impressions,
        clicks=excluded.clicks,
        spend=excluded.spend,
        cpc=excluded.cpc,
        ctr=excluded.ctr,
        purchase_roas=excluded.purchase_roas,
        revenue=excluded.revenue
    `;
    await client.query(sql, tmp.flat());
    return { upserted: rows.length };
  } finally {
    client.release();
  }
}
