import dotenv from 'dotenv';
dotenv.config();

const FB_BUSINESS_ID = process.env.FB_BUSINESS_ID || '1013395692075293';
if (FB_BUSINESS_ID && !/^\d+$/.test(FB_BUSINESS_ID)) {
  console.error(`[config] Invalid FB_BUSINESS_ID: ${FB_BUSINESS_ID}`);
}

const rawAccounts = process.env.FB_AD_ACCOUNTS || 'act_420838866444927,act_1538360642912126';
const FB_AD_ACCOUNTS = rawAccounts
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const bad = FB_AD_ACCOUNTS.filter((id) => !/^act_\d+$/.test(id));
if (bad.length) {
  console.error(`[config] Invalid FB_AD_ACCOUNTS entries: ${bad.join(', ')}`);
}

export { FB_BUSINESS_ID, FB_AD_ACCOUNTS };
