import axios from 'axios';
import { DateTime } from 'luxon';
import { pool } from '../lib/db.js';

const API_BASE = 'https://graph.facebook.com/v18.0';

function accounts() {
  return (process.env.FB_AD_ACCOUNTS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(id => (id.startsWith('act_') ? id : `act_${id}`));
}

function buildFields() {
  return [
    'date_start',
    'account_id',
    'campaign_name',
    'adset_name',
    'ad_name',
    'spend',
    'impressions',
    'clicks',
    'purchase_roas'
  ].join(',');
}

export async function facebookFetch({ since, until } = {}) {
  const token = process.env.FB_ACCESS_TOKEN;
  if (!token) throw new Error('FB_ACCESS_TOKEN missing');
  const acts = accounts();
  if (!acts.length) throw new Error('FB_AD_ACCOUNTS missing');

  const start = DateTime.fromISO(since || DateTime.utc().minus({ days: 1 }).toISODate());
  const end = DateTime.fromISO(until || start.toISODate());
  let inserted = 0;

  for (const actId of acts) {
    for (let d = start; d <= end; d = d.plus({ days: 1 })) {
      const dateStr = d.toISODate();
      try {
        const url = `${API_BASE}/${actId}/insights`;
        const { data } = await axios.get(url, {
          params: {
            access_token: token,
            time_range: JSON.stringify({ since: dateStr, until: dateStr }),
            fields: buildFields(),
            level: 'ad',
            limit: 500
          }
        });

        for (const row of data.data || []) {
          const roas = Array.isArray(row.purchase_roas) ? Number(row.purchase_roas[0]?.value || 0) : Number(row.purchase_roas || 0);
          const revenue = Number(row.spend || 0) * roas;
          await pool.query(
            `INSERT INTO daily_rollup(
               date_start, account_id, campaign_name, adset_name, ad_name,
               spend, impressions, clicks, revenue
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT (date_start, account_id, campaign_name, adset_name, ad_name)
             DO UPDATE SET spend = EXCLUDED.spend,
                           impressions = EXCLUDED.impressions,
                           clicks = EXCLUDED.clicks,
                           revenue = EXCLUDED.revenue`,
            [
              row.date_start,
              row.account_id || actId,
              row.campaign_name,
              row.adset_name,
              row.ad_name,
              Number(row.spend || 0),
              Number(row.impressions || 0),
              Number(row.clicks || 0),
              revenue
            ]
          );
          inserted++;
        }
      } catch (err) {
        const code = err.response?.data?.error?.code;
        if (code === 190) {
          console.error(JSON.stringify({ oauth: false, code: 190 }));
          const e = new Error('facebook-auth');
          e.status = 401;
          throw e;
        }
        throw err;
      }
    }
  }
  return { inserted };
}
