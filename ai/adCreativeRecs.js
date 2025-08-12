import { DateTime } from "luxon";
import OpenAI from "openai";
import { pool } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const ENABLED = String(process.env.ENABLE_AI || "true").toLowerCase() === "true";

function parseAdName(adName) {
  // Format || Hook || FirstVisual || Offer
  const parts = adName.split("||").map(p => p.trim());
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
    select date_start::date as dt, 'facebook' as platform,
           ad_name, spend::numeric, impressions::numeric,
           clicks::numeric, coalesce(revenue,0)::numeric revenue
    from facebook_ad_insights where date_start >= $1
    union all
    select date_start::date, 'youtube',
           ad_name, spend::numeric, impressions::numeric,
           clicks::numeric, coalesce(revenue,0)::numeric
    from youtube_ad_insights where date_start >= $1
  `;
  const { rows } = await pool.query(sql, [since]);
  return rows;
}

function aggregateByFeature(rows) {
  const featureStats = { format: {}, hook: {}, first_visual: {}, offer: {} };
  const patternStats = {};

  for (const r of rows) {
    const parsed = parseAdName(r.ad_name);
    const spend = Number(r.spend) || 0;
    const rev = Number(r.revenue) || 0;
    const clicks = Number(r.clicks) || 0;
    const imp = Number(r.impressions) || 0;

    // Single features
    for (const key of Object.keys(featureStats)) {
      const val = parsed[key];
      if (!featureStats[key][val]) {
        featureStats[key][val] = { spend: 0, revenue: 0, clicks: 0, impressions: 0 };
      }
      const fs = featureStats[key][val];
      fs.spend += spend;
      fs.revenue += rev;
      fs.clicks += clicks;
      fs.impressions += imp;
    }

    // Combined pattern: format + hook + first_visual + offer
    const patKey = `${parsed.format} | ${parsed.hook} | ${parsed.first_visual} | ${parsed.offer}`;
    if (!patternStats[patKey]) {
      patternStats[patKey] = { spend: 0, revenue: 0, clicks: 0, impressions: 0 };
    }
    patternStats[patKey].spend += spend;
    patternStats[patKey].revenue += rev;
    patternStats[patKey].clicks += clicks;
    patternStats[patKey].impressions += imp;
  }

  const summarize = stats => Object.entries(stats).map(([val, s]) => ({
    value: val,
    spend: s.spend,
    revenue: s.revenue,
    roas: s.spend > 0 ? s.revenue / s.spend : 0,
    ctr: s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0,
    cac: s.clicks > 0 ? s.spend / s.clicks : 0
  })).sort((a,b) => b.roas - a.roas);

  return {
    formats: summarize(featureStats.format),
    hooks: summarize(featureStats.hook),
    first_visuals: summarize(featureStats.first_visual),
    offers: summarize(featureStats.offer),
    patterns: summarize(patternStats)
  };
}

export async function generateCreativeRecommendations(days = 30, brand = "Beauty by Earth") {
  if (!ENABLED) return { disabled: true };

  const rows = await fetchRecentAds(days);
  const agg = aggregateByFeature(rows);
  const topPatterns = agg.patterns.slice(0, 5);

  const prompt = `
Brand: ${brand}
Analyzed ${days} days of ads.

Top formats: ${JSON.stringify(agg.formats.slice(0,5))}
Top hooks: ${JSON.stringify(agg.hooks.slice(0,5))}
Top first visuals: ${JSON.stringify(agg.first_visuals.slice(0,5))}
Top offers: ${JSON.stringify(agg.offers.slice(0,5))}
Top combinations: ${JSON.stringify(topPatterns)}

TASK: Recommend 3–5 new ad creative ideas to test next,
based ONLY on the high-performing formats, hooks, first visuals, and offers above.
These should be written as actionable creative briefs, not ad names.
Return plain text bullets (<120 chars each).
`;

  const resp = await client.responses.create({
    model: MODEL,
    temperature: 0.3,
    max_output_tokens: 400,
    input: [{ role: "user", content: prompt }]
  });

  const recommendations = (resp.output_text || "").split("\n").filter(Boolean);

  const day = DateTime.utc().toISODate();
  await pool.query(
    `insert into ai_daily_insights
      (brand, for_date, summary, top_patterns, recommendations)
     values ($1,$2,$3::jsonb,$4::jsonb,$5)
     on conflict (brand, for_date) do update set
       summary = excluded.summary,
       top_patterns = excluded.top_patterns,
       recommendations = excluded.recommendations`,
    [brand, day, JSON.stringify(agg), JSON.stringify(topPatterns), recommendations.join("\n")]
  );

  return { date: day, summary: agg, top_patterns: topPatterns, recommendations };
}

