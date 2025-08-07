import test from 'node:test';
import assert from 'node:assert';
import { fetchFacebookInsights } from './facebookInsights.js';

const token = process.env.FB_ACCESS_TOKEN;
const accounts = process.env.FB_AD_ACCOUNTS;
const shouldSkip =
  !token || token.includes('your_long_lived') || !accounts || accounts.includes('1234567890');

test('fetchFacebookInsights returns an array', { skip: shouldSkip }, async () => {
  const results = await fetchFacebookInsights();
  assert.ok(Array.isArray(results));
  console.log(`Fetched ${results.length} results`);
});

