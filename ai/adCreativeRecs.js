import { DateTime } from "luxon";
import OpenAI from "openai";
import { pool } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const ENABLED = String(process.env.ENABLE_AI || "true").toLowerCase() === "true";

function parseAdName(adName) {
  // Format || Hook || FirstVisual || Offer
  const parts = (adName || "").split("||").map(p => p.trim());
  return {
    format: parts[0] || "Unknown",
    hook: parts[1] || "Unknown",
    first_visual: parts[2] || "Unknown",
    offer: parts[3] || "Unknown"
  };
}

async function fetchRecentAds(days = 30) {
  const since = DateTime.utc().minus({ days }).toISODate();
  const sql = `
    select date_start::date as dt, 'facebook' as platform, ad_name, spend::numeric, impressions::numeric, clicks::numeric, coalesce(revenue,0)::numeric revenue
      from facebook_ad_insights where date_start >= $1
    union all
    select date_start::date, 'youtube', ad_name, spend::numeric, impressions::numeric, clicks::numeric, coalesce(revenue,0)::numeric
      from youtube_ad_insights where date_start >= $1
  `;
  const { rows } = await pool.query(sql, [since]);
  return rows;
}

function summarize(stats) {
  return Object.entries(stats).map(([value, s]) => {
    const spend = s.spend || 0, revenue = s.revenue || 0, imp = s.impressions || 0, clicks = s.clicks || 0;
    return {
      value,
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      ctr: imp > 0 ? (clicks / imp) * 100 : 0,
      cac: clicks > 0 ? spend / clicks : 0
    };
  }).sort((a,b) => b.roas - a.roas);
}

function aggregate(rows) {
  const feature = { format:{}, hook:{}, first_visual:{}, offer:{} };
  const combo = {};
  for (const r of rows) {
    const a = parseAdName(r.ad_name);
    const spend = +r.spend || 0, revenue = +r.revenue || 0, imp = +r.impressions || 0, clicks = +r.clicks || 0;

    for (const k of Object.keys(feature)) {
      const key = a[k];
      feature[k][key] ||= { spend:0, revenue:0, impressions:0, clicks:0 };
      const t = feature[k][key];
      t.spend += spend; t.revenue += revenue; t.impressions += imp; t.clicks += clicks;
    }

    const comboKey = `${a.format} | ${a.hook} | ${a.first_visual} | ${a.offer}`;
    combo[comboKey] ||= { spend:0, revenue:0, impressions:0, clicks:0 };
    combo[comboKey].spend += spend; combo[comboKey].revenue += revenue; combo[comboKey].impressions += imp; combo[comboKey].clicks += clicks;
  }

  return {
    formats: summarize(feature.format),
    hooks: summarize(feature.hook),
    first_visuals: summarize(feature.first_visual),
    offers: summarize(feature.offer),
    patterns: summarize(combo)
  };
}

export async function generateCreativeRecs(days = 30, brand = "Beauty by Earth") {
  if (!ENABLED) return { disabled: true };

  const rows = await fetchRecentAds(days);
  const agg = aggregate(rows);
  const topPatterns = agg.patterns.slice(0, 5);

  const prompt = `
Brand: ${brand}
Window: last ${days} days.
We parsed ad_name as: Format || Hook || FirstVisual || Offer.

Top formats: ${JSON.stringify(agg.formats.slice(0,5))}
Top hooks: ${JSON.stringify(agg.hooks.slice(0,5))}
Top first visuals: ${JSON.stringify(agg.first_visuals.slice(0,5))}
Top offers: ${JSON.stringify(agg.offers.slice(0,5))}
Top combinations: ${JSON.stringify(topPatterns)}

TASK: Write 4–6 concise ad creative recommendations (briefs), NOT ad names.
Base each on winning format/hook/first visual/offer. <120 chars each.
`;

  const resp = await client.responses.create({
    model: MODEL,
    temperature: 0.3,
    max_output_tokens: 400,
    input: [{ role: "user", content: prompt }]
  });

  const recommendations = (resp.output_text || "").split("\n").map(s=>s.trim()).filter(Boolean);

  const day = DateTime.utc().toISODate();
  await pool.query(
    `insert into ai_daily_insights (brand, for_date, summary, top_patterns, recommendations)
     values ($1,$2,$3::jsonb,$4::jsonb,$5)
     on conflict (brand, for_date) do update set
       summary = excluded.summary,
       top_patterns = excluded.top_patterns,
       recommendations = excluded.recommendations`,
    [brand, day, JSON.stringify(agg), JSON.stringify(topPatterns), recommendations.join("\n")]
  );

  return { date: day, summary: agg, top_patterns: topPatterns, recommendations };
}
