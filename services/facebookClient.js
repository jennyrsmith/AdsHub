import axios from 'axios';
import { FB_AD_ACCOUNTS } from '../config/facebook.js';

const API_BASE = 'https://graph.facebook.com/v18.0';
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

export async function getTokenOwner() {
  const url = `${API_BASE}/me`;
  const { data } = await axios.get(url, { params: { access_token: ACCESS_TOKEN, fields: 'id,name' } });
  return data;
}

export async function listAccessibleAccounts() {
  const url = `${API_BASE}/me/adaccounts`;
  const { data } = await axios.get(url, {
    params: { access_token: ACCESS_TOKEN, fields: 'id,account_id,name,account_status', limit: 500 }
  });
  return data.data || [];
}

export async function canReadAccount(actId) {
  const url = `${API_BASE}/${actId}/insights`;
  await axios.get(url, {
    params: {
      access_token: ACCESS_TOKEN,
      limit: 1,
      date_preset: 'last_3d',
      fields: 'account_id'
    }
  });
  return true;
}

export async function diagnose() {
  if (!ACCESS_TOKEN) throw new Error('Missing FB_ACCESS_TOKEN');
  const tokenOwner = await getTokenOwner();
  const accessible = await listAccessibleAccounts();
  const accounts = [];
  const missingPermissions = new Set();
  for (const actId of FB_AD_ACCOUNTS) {
    const info = accessible.find((a) => a.id === actId || `act_${a.account_id}` === actId);
    let canRead = false;
    try {
      await canReadAccount(actId);
      canRead = true;
    } catch (err) {
      const msg = err.response?.data?.error?.message || '';
      if (msg.includes('ads_read')) missingPermissions.add('ads_read');
      if (msg.includes('read_insights')) missingPermissions.add('read_insights');
    }
    accounts.push({ id: actId, canRead, name: info?.name, account_status: info?.account_status });
  }
  return { tokenOwner, accounts, missingPermissions: [...missingPermissions] };
}

export async function startupDiagnostics() {
  if (!ACCESS_TOKEN) {
    console.warn('[fb] FB_ACCESS_TOKEN not set; skipping diagnostics');
    return;
  }
  try {
    const report = await diagnose();
    console.log(`[fb] token owner ${report.tokenOwner.name} (${report.tokenOwner.id})`);
    const missingAccess = FB_AD_ACCOUNTS.filter((id) => !report.accounts.find((a) => a.id === id && a.name));
    if (missingAccess.length) {
      console.warn(`[fb] token lacks access to accounts: ${missingAccess.join(', ')}`);
    }
    const noRead = report.accounts.filter((a) => !a.canRead).map((a) => a.id);
    if (noRead.length) {
      console.warn(`[fb] token cannot read insights for: ${noRead.join(', ')} (missing ads_read/read_insights?)`);
    }
  } catch (e) {
    console.error(`[fb] diagnostics error: ${e.message}`);
  }
}
