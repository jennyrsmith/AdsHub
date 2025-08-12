import axios from 'axios';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { log } from './logger.js';
import { yesterdayRange, todayRange } from './lib/date.js';

dotenv.config();

export async function fetchYouTubeInsights(opts = {}) {
  const { since, until } = opts;
  const dateRange = since && until ? { since, until } : (process.env.SYNC_MODE === 'today' ? todayRange() : yesterdayRange());
  log(`Fetching YouTube insights ${dateRange.since}..${dateRange.until}`);
  if (process.env.DEMO_MODE === 'true') return [];
  if (!process.env.GOOGLE_ADS_CUSTOMER_ID) {
    throw new Error('Missing GOOGLE_ADS_CUSTOMER_ID');
  }
  if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
    throw new Error('Missing GOOGLE_ADS_DEVELOPER_TOKEN');
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/adwords'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const query = `SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, segments.date FROM campaign WHERE segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}' AND campaign.advertising_channel_type = 'VIDEO'`;
  const url = `https://googleads.googleapis.com/v14/customers/${process.env.GOOGLE_ADS_CUSTOMER_ID}/googleAds:searchStream`;
  const res = await axios.post(url, { query }, {
    headers: {
      Authorization: `Bearer ${token.token}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    },
  });
  const rows = [];
  for (const stream of res.data || []) {
    for (const row of stream.results || []) {
      const { campaign, metrics, segments } = row;
      const spend = Number(metrics.costMicros ?? metrics.cost_micros) / 1e6;
      const clicks = Number(metrics.clicks) || 0;
      const impressions = Number(metrics.impressions) || 0;
      rows.push({
        date_start: segments.date,
        campaign_name: campaign.name,
        adset_name: null,
        ad_name: null,
        impressions,
        clicks,
        spend,
        cpc: clicks > 0 ? spend / clicks : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        purchase_roas: 0,
        revenue: 0,
      });
    }
  }
  return rows;
}
