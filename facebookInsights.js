import axios from 'axios';
import dotenv from 'dotenv';
import { DateTime } from 'luxon';
import { log, logError } from './logger.js';
import { INSIGHT_FIELDS } from './constants.js';
import { yesterdayRange, todayRange } from './lib/date.js';
import { FB_AD_ACCOUNTS } from './config/facebook.js';

dotenv.config();

const FB_API_BASE_URL = 'https://graph.facebook.com/v18.0';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function makeRequest(url, params = {}, retries = 5, attempt = 0) {
  try {
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    if ((status === 429 || status >= 500) && attempt < retries) {
      const wait = Math.pow(2, attempt) * 1000;
      await delay(wait);
      return makeRequest(url, params, retries, attempt + 1);
    }
    throw error;
  }
}

export async function fetchInsightsForAccount(accountId, date, accessToken, level = 'campaign') {
  const actId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const url = `${FB_API_BASE_URL}/${actId}/insights`;
  const params = {
    access_token: accessToken,
    fields: INSIGHT_FIELDS.join(','),
    time_range: JSON.stringify({ since: date, until: date }),
    level,
    limit: 500,
  };
  const results = [];
  let data = await makeRequest(url, params);
  results.push(...data.data.map((item) => ({ ...item, account_id: accountId })));
  while (data.paging?.next) {
    data = await makeRequest(data.paging.next);
    results.push(...data.data.map((item) => ({ ...item, account_id: accountId })));
  }
  return results;
}

export async function fetchFacebookInsights(opts = {}) {
  const { since, until, level = 'campaign', accountIds } = opts;
  const dateRange = since && until ? { since, until } : (process.env.SYNC_MODE === 'today' ? todayRange() : yesterdayRange());
  log(`Fetching Facebook insights ${dateRange.since}..${dateRange.until}`);
  if (process.env.DEMO_MODE === 'true') return [];
  const accessToken = process.env.FB_ACCESS_TOKEN;
  if (!accessToken) throw new Error('Missing FB_ACCESS_TOKEN');
  const ids = accountIds && accountIds.length
    ? accountIds
    : FB_AD_ACCOUNTS.map((id) => id.replace(/^act_/, '')).filter(Boolean);
  if (!ids.length) throw new Error('Missing FB_AD_ACCOUNTS');
  const start = DateTime.fromISO(dateRange.since);
  const end = DateTime.fromISO(dateRange.until);
  const allResults = [];
  for (const id of ids) {
    for (let d = start; d <= end; d = d.plus({ days: 1 })) {
      const dateStr = d.toISODate();
      try {
        const rows = await fetchInsightsForAccount(id, dateStr, accessToken, level);
        for (const r of rows) {
          const spend = Number(r.spend) || 0;
          const clicks = Number(r.clicks) || 0;
          const impressions = Number(r.impressions) || 0;
          const roas = Number(r.purchase_roas) || 0;
          allResults.push({
            date_start: dateStr,
            campaign_name: r.campaign_name,
            adset_name: r.adset_name,
            ad_name: r.ad_name,
            impressions,
            clicks,
            spend,
            cpc: clicks > 0 ? spend / clicks : 0,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            purchase_roas: roas,
            revenue: spend * roas,
          });
        }
      } catch (err) {
        await logError(`Error fetching data for account ${id} on ${dateStr}`, err);
      }
    }
  }
  return allResults;
}
