import React from 'react';

export default function StatusBar() {
  return (
    <div className="flex items-center justify-between text-sm text-muted py-2">
      <div>Last sync: —</div>
      <div className="space-x-2">
        <button className="bg-brand text-brand-fg px-3 py-1.5 rounded">Sync Now</button>
        <button className="border border-border px-3 py-1.5 rounded bg-surface">Export CSV</button>
      </div>
    </div>
  );
}
