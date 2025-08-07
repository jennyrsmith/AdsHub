import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const FB_API_BASE_URL = 'https://graph.facebook.com/v18.0';

/**
 * Helper to pause execution for a given time
 * @param {number} ms milliseconds to wait
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Make a GET request with retry logic for rate limits and server errors
 * @param {string} url
 * @param {object} params
 * @param {number} retries
 */
async function makeRequest(url, params = {}, retries = 5, attempt = 0) {
  try {
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    // Retry on rate limit (429) or server errors (5xx)
    if ((status === 429 || status >= 500) && attempt < retries) {
      const wait = Math.pow(2, attempt) * 1000;
      console.warn(`${new Date().toISOString()} - Request failed with status ${status}. Retrying in ${wait}ms...`);
      await delay(wait);
      return makeRequest(url, params, retries, attempt + 1);
    }
    console.error(`${new Date().toISOString()} - Request to ${url} failed:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch insights for a single ad account
 * @param {string} accountId
 * @param {string} date YYYY-MM-DD
 * @param {string} accessToken
 * @returns {Promise<Array<object>>}
 */
async function fetchInsightsForAccount(accountId, date, accessToken) {
  const actId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const url = `${FB_API_BASE_URL}/${actId}/insights`;
  const params = {
    access_token: accessToken,
    fields: 'campaign_name,adset_name,ad_name,impressions,clicks,spend,cpc,ctr,purchase_roas,date_start,date_stop',
    time_range: JSON.stringify({ since: date, until: date }),
    level: 'campaign',
    limit: 500,
  };

  const results = [];
  let data = await makeRequest(url, params);
  results.push(...data.data.map((item) => ({ ...item, account_id: accountId })));

  // Handle pagination
  while (data.paging?.next) {
    data = await makeRequest(data.paging.next);
    results.push(...data.data.map((item) => ({ ...item, account_id: accountId })));
  }

  return results;
}

/**
 * Fetch yesterday's Facebook Ads insights for all ad accounts in FB_AD_ACCOUNTS
 * @returns {Promise<Array<object>>} aggregated results for all accounts
 */
export async function fetchFacebookInsights() {
  const accessToken = process.env.FB_ACCESS_TOKEN;
  const accountEnv = process.env.FB_AD_ACCOUNTS;
  if (!accessToken) {
    throw new Error('Missing FB_ACCESS_TOKEN in environment variables');
  }
  if (!accountEnv) {
    throw new Error('Missing FB_AD_ACCOUNTS in environment variables');
  }

  const accountIds = accountEnv
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const date = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD

  const allResults = [];
  await Promise.all(
    accountIds.map(async (id) => {
      try {
        const accountResults = await fetchInsightsForAccount(id, date, accessToken);
        allResults.push(...accountResults);
        console.log(
          `${new Date().toISOString()} - Fetched ${accountResults.length} records for account ${id}`
        );
      } catch (err) {
        console.error(
          `${new Date().toISOString()} - Error fetching data for account ${id}:`,
          err.response?.data || err.message
        );
      }
    })
  );

  return allResults;
}

