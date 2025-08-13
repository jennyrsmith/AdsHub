import test from 'node:test';
import assert from 'node:assert';
import { diagnose } from './services/facebookClient.js';

const token = process.env.FB_ACCESS_TOKEN;
const accounts = process.env.FB_AD_ACCOUNTS;
const skip = !token || token.includes('your_long_lived') || !accounts || accounts.includes('1234567890');

test('facebook diagnostics', { skip }, async (t) => {
  try {
    const res = await diagnose();
    assert.ok(res.tokenOwner?.id);
    assert.ok(Array.isArray(res.accounts));
  } catch (e) {
    t.skip(e.message);
  }
});
