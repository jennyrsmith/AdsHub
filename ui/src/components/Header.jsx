import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { apiFetch } from '../lib/api.js';
import { showToast } from '../lib/toast.js';
import 'react-day-picker/dist/style.css';

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

export default function Header({ brand, platform, start, end, onChange, onSyncStart, onSyncEnd }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState({ from: start ? new Date(start) : undefined, to: end ? new Date(end) : undefined });

  function setPreset(days) {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days + 1);
    setRange({ from, to });
    onChange({ start: formatDate(from), end: formatDate(to) });
  }

  async function handleSync(target) {
    try {
      onSyncStart?.();
      await apiFetch('/api/sync', { method: 'POST', body: { target } });
      showToast('Sync started', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to load data');
    } finally {
      onSyncEnd?.();
      setOpen(false);
    }
  }

  return (
    <header style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)', position: 'sticky', top: 0, zIndex: 10 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <strong>{brand}</strong>
          <span style={{ fontSize: '12px', background: 'var(--color-bg-alt)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>{import.meta.env.MODE === 'production' ? 'Prod' : 'Dev'}</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }}></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <select value={platform} onChange={(e) => onChange({ platform: e.target.value })}>
            <option value="all">All</option>
            <option value="facebook">Facebook</option>
            <option value="youtube">YouTube</option>
          </select>
          <button onClick={() => setPreset(7)}>Last 7</button>
          <button onClick={() => setPreset(30)}>Last 30</button>
          <DayPicker mode="range" selected={range} onSelect={(r) => {
            setRange(r);
            if (r?.from && r?.to) {
              onChange({ start: formatDate(r.from), end: formatDate(r.to) });
            }
          }} numberOfMonths={1} />
          <div style={{ position: 'relative' }}>
            <button onClick={() => setOpen(!open)}>Sync Now ▾</button>
            {open && (
              <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: 'var(--space-sm)', cursor: 'pointer' }} onClick={() => handleSync('all')}>All</div>
                <div style={{ padding: 'var(--space-sm)', cursor: 'pointer' }} onClick={() => handleSync('facebook')}>Facebook</div>
                <div style={{ padding: 'var(--space-sm)', cursor: 'pointer' }} onClick={() => handleSync('youtube')}>YouTube</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
