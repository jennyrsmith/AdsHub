import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { apiFetch } from '../lib/api.js';
import { showToast } from '../lib/toast.js';
import { formatCurrency, formatNumber } from '../lib/format.js';

export default function ChannelChart({ start, end }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ start, end, platform: 'all' });
        const res = await apiFetch(`/api/summary?${params.toString()}`);
        setData(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error(err);
        showToast('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [start, end]);

  if (loading && data.length === 0) {
    return <div style={{ height: 200, background: 'var(--color-bg-alt)', marginTop: 'var(--space-xl)' }} />;
  }

  return (
    <div style={{ height: 300, marginTop: 'var(--space-xl)' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="platform" />
          <YAxis yAxisId="left" tickFormatter={formatCurrency} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={formatNumber} />
          <Tooltip formatter={(value, name) => name === 'roas' ? formatNumber(value) : formatCurrency(value)} />
          <Legend />
          <Bar yAxisId="left" dataKey="spend" name="Spend" fill="var(--color-primary)" />
          <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="var(--color-success)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
