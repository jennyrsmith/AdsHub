-- Baseline schema for AdsHub

-- Track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations(
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Facebook insights table
CREATE TABLE IF NOT EXISTS facebook_ad_insights (
  date_start DATE,
  account_id TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  adset_name TEXT,
  ad_name TEXT,
  impressions INT,
  clicks INT,
  spend NUMERIC,
  revenue NUMERIC,
  platform TEXT
);

ALTER TABLE facebook_ad_insights
  ADD COLUMN IF NOT EXISTS spend NUMERIC,
  ADD COLUMN IF NOT EXISTS impressions INT,
  ADD COLUMN IF NOT EXISTS clicks INT,
  ADD COLUMN IF NOT EXISTS revenue NUMERIC,
  ADD COLUMN IF NOT EXISTS date_start DATE,
  ADD COLUMN IF NOT EXISTS campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS campaign_name TEXT,
  ADD COLUMN IF NOT EXISTS adset_name TEXT,
  ADD COLUMN IF NOT EXISTS ad_name TEXT,
  ADD COLUMN IF NOT EXISTS account_id TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT;

-- YouTube insights table
CREATE TABLE IF NOT EXISTS youtube_ad_insights (
  date_start DATE,
  account_id TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  adset_name TEXT,
  ad_name TEXT,
  impressions INT,
  clicks INT,
  spend NUMERIC,
  revenue NUMERIC,
  platform TEXT
);

ALTER TABLE youtube_ad_insights
  ADD COLUMN IF NOT EXISTS spend NUMERIC,
  ADD COLUMN IF NOT EXISTS impressions INT,
  ADD COLUMN IF NOT EXISTS clicks INT,
  ADD COLUMN IF NOT EXISTS revenue NUMERIC,
  ADD COLUMN IF NOT EXISTS date_start DATE,
  ADD COLUMN IF NOT EXISTS campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS campaign_name TEXT,
  ADD COLUMN IF NOT EXISTS adset_name TEXT,
  ADD COLUMN IF NOT EXISTS ad_name TEXT,
  ADD COLUMN IF NOT EXISTS account_id TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT;

-- Sync log table
CREATE TABLE IF NOT EXISTS sync_log (
  platform TEXT PRIMARY KEY,
  finished_at TIMESTAMPTZ
);

