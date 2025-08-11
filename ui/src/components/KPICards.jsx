import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { formatCurrency, formatNumber } from '../lib/format.js';
import { toast } from '../lib/toast.js';

const fields = [
  { key: 'spend', label: 'Spend', format: formatCurrency },
  { key: 'revenue', label: 'Revenue', format: formatCurrency },
  { key: 'roas', label: 'ROAS', format: formatNumber },
  { key: 'impressions', label: 'Impressions', format: formatNumber },
  { key: 'clicks', label: 'Clicks', format: formatNumber },
];

export default function KPICards({ platform, start, end }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ start, end, platform });
        const res = await apiFetch(`/api/summary?${params.toString()}`);
        let obj = {};
        if (Array.isArray(res)) {
          if (platform === 'all') {
            for (const r of res) {
              for (const k of Object.keys(r)) {
                if (k === 'platform') continue;
                obj[k] = (obj[k] || 0) + (r[k] || 0);
              }
            }
            obj.roas = obj.spend ? obj.revenue / obj.spend : null;
          } else {
            obj = res.find((r) => r.platform === platform) || {};
          }
        } else {
          obj = res || {};
        }
        setData(obj);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [platform, start, end]);

  if (loading && !data) {
    return <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>{fields.map((f) => <div key={f.key} style={{ flex: 1, height: '80px', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }} />)}</div>;
  }

  if (!data) return <div>No Data</div>;

  return (
    <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>
      {fields.map((f) => {
        const deltaKey = `${f.key}_delta`;
        const delta = data[deltaKey];
        return (
          <div key={f.key} style={{ flex: 1, background: 'var(--color-bg-alt)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-fg-muted)' }}>{f.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '600' }}>{f.format(data[f.key])}</div>
            {delta !== undefined && <div style={{ fontSize: '12px', color: delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{delta >= 0 ? '+' : ''}{f.format ? f.format(delta) : delta}</div>}
          </div>
        );
      })}
    </div>
  );
}
