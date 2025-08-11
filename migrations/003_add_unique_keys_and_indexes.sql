-- Add unique keys and helpful indexes

-- Unique constraints via unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS facebook_ad_insights_unique
  ON facebook_ad_insights(platform, account_id, campaign_id, date_start);

CREATE UNIQUE INDEX IF NOT EXISTS youtube_ad_insights_unique
  ON youtube_ad_insights(platform, account_id, campaign_id, date_start);

-- Common indexes
CREATE INDEX IF NOT EXISTS facebook_ad_insights_date_platform
  ON facebook_ad_insights(date_start, platform);

CREATE INDEX IF NOT EXISTS youtube_ad_insights_date_platform
  ON youtube_ad_insights(date_start, platform);

CREATE INDEX IF NOT EXISTS facebook_ad_insights_campaign_name
  ON facebook_ad_insights(campaign_name);

CREATE INDEX IF NOT EXISTS youtube_ad_insights_campaign_name
  ON youtube_ad_insights(campaign_name);

CREATE INDEX IF NOT EXISTS facebook_ad_insights_account_id
  ON facebook_ad_insights(account_id);

CREATE INDEX IF NOT EXISTS youtube_ad_insights_account_id
  ON youtube_ad_insights(account_id);

