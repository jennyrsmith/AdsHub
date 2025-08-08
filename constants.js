export const INSIGHT_FIELDS = [
  'campaign_name',
  'adset_name',
  'ad_name',
  'impressions',
  'clicks',
  'spend',
  'cpc',
  'ctr',
  'purchase_roas',
  'date_start',
  'date_stop',
];

export const HEADERS = ['account_id', ...INSIGHT_FIELDS];

export const SHEET_NAME = 'Facebook Ads';

// YouTube reporting
export const YOUTUBE_HEADERS = [
  'campaign_name',
  'impressions',
  'clicks',
  'cost',
  'conversions',
  'date_start',
  'date_stop',
];

export const YOUTUBE_SHEET_NAME = 'YouTube Ads';

// Map of ad account IDs to their respective timezones
// Example: { '1234567890': 'America/Chicago' }
export const ACCOUNT_TIMEZONES = {};
