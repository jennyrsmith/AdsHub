-- Ensure revenue columns default to 0

ALTER TABLE facebook_ad_insights
  ADD COLUMN IF NOT EXISTS revenue NUMERIC,
  ALTER COLUMN revenue SET DEFAULT 0;

ALTER TABLE youtube_ad_insights
  ADD COLUMN IF NOT EXISTS revenue NUMERIC,
  ALTER COLUMN revenue SET DEFAULT 0;

