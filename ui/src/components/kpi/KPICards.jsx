import React from 'react';

const kpis = [
  { label: 'Spend', value: '$12,345' },
  { label: 'Revenue', value: '$23,456' },
  { label: 'ROAS', value: '1.90' },
  { label: 'Impressions', value: '1.2M' },
  { label: 'Clicks', value: '34K' }
];

export default function KPICards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 my-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="bg-surface rounded-lg shadow-card border border-border p-4">
          <div className="text-sm text-muted">{kpi.label}</div>
          <div className="text-xl font-semibold mt-1">{kpi.value}</div>
        </div>
      ))}
    </div>
  );
}
