import { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

export default function FiltersBar({ platform, start, end, q, onChange, onExport }) {
  const [range, setRange] = useState({ from: start ? new Date(start) : undefined, to: end ? new Date(end) : undefined });
  const [search, setSearch] = useState(q || '');

  useEffect(() => setSearch(q || ''), [q]);

  useEffect(() => {
    const t = setTimeout(() => onChange({ q: search, offset: 0 }), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (range.from && range.to) {
      onChange({ start: formatDate(range.from), end: formatDate(range.to), offset: 0 });
    }
  }, [range]);

  function setPreset(days) {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days + 1);
    setRange({ from, to });
  }

  return (
    <div style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
      <select value={platform} onChange={(e) => onChange({ platform: e.target.value, offset: 0 })}>
        <option value="all">All</option>
        <option value="facebook">Facebook</option>
        <option value="youtube">YouTube</option>
      </select>
      <button onClick={() => setPreset(7)}>Last 7</button>
      <button onClick={() => setPreset(30)}>Last 30</button>
      <DayPicker
        mode="range"
        selected={range}
        onSelect={setRange}
        numberOfMonths={2}
      />
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <button onClick={onExport}>Export CSV</button>
    </div>
  );
}
