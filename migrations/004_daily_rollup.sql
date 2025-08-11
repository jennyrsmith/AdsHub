-- Daily rollup table and 30-day summary MV

CREATE TABLE IF NOT EXISTS daily_rollup (
    platform TEXT NOT NULL,
    date DATE NOT NULL,
    spend NUMERIC NOT NULL DEFAULT 0,
    revenue NUMERIC NOT NULL DEFAULT 0,
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY(platform, date)
);

CREATE INDEX IF NOT EXISTS daily_rollup_date ON daily_rollup(date);

-- Materialized view for last 30 days summary by platform
CREATE MATERIALIZED VIEW mv_summary_30d AS
SELECT platform,
       SUM(spend) AS spend,
       SUM(revenue) AS revenue,
       SUM(impressions) AS impressions,
       SUM(clicks) AS clicks
FROM daily_rollup
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY platform;

CREATE UNIQUE INDEX mv_summary_30d_platform ON mv_summary_30d(platform);

