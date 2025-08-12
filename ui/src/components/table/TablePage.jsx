import React from 'react';

const rows = [
  { campaign: 'Campaign A', spend: '$1,000', revenue: '$2,000', roas: '2.0' },
  { campaign: 'Campaign B', spend: '$500', revenue: '$800', roas: '1.6' },
  { campaign: 'Campaign C', spend: '$750', revenue: '$1,200', roas: '1.6' }
];

export default function TablePage() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-muted">
          <tr>
            <th className="py-2 px-3">Campaign</th>
            <th className="py-2 px-3">Spend</th>
            <th className="py-2 px-3">Revenue</th>
            <th className="py-2 px-3">ROAS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.campaign} className="border-t border-border">
              <td className="py-2 px-3">{row.campaign}</td>
              <td className="py-2 px-3">{row.spend}</td>
              <td className="py-2 px-3">{row.revenue}</td>
              <td className="py-2 px-3">{row.roas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
