import React, { useState } from 'react';

export default function FiltersBar() {
  const [state, setState] = useState({
    q: '',
    platform: 'all',
    date: '7d',
    format: 'daily',
    sort: 'spend',
    breakdown: 'none'
  });

  function update(field) {
    return (e) => setState({ ...state, [field]: e.target.value });
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
      <input
        className="border border-border rounded px-3 py-2 flex-1"
        placeholder="Search"
        value={state.q}
        onChange={update('q')}
      />
      <select
        className="border border-border rounded px-3 py-2"
        value={state.platform}
        onChange={update('platform')}
      >
        <option value="all">All Platforms</option>
        <option value="facebook">Facebook</option>
        <option value="google">Google</option>
      </select>
      <select
        className="border border-border rounded px-3 py-2"
        value={state.date}
        onChange={update('date')}
      >
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
      </select>
      <select
        className="border border-border rounded px-3 py-2"
        value={state.format}
        onChange={update('format')}
      >
        <option value="daily">Daily</option>
        <option value="total">Total</option>
      </select>
      <select
        className="border border-border rounded px-3 py-2"
        value={state.sort}
        onChange={update('sort')}
      >
        <option value="spend">Sort: Spend</option>
        <option value="revenue">Sort: Revenue</option>
      </select>
      <select
        className="border border-border rounded px-3 py-2"
        value={state.breakdown}
        onChange={update('breakdown')}
      >
        <option value="none">No Breakdown</option>
        <option value="device">Device</option>
      </select>
    </div>
  );
}
