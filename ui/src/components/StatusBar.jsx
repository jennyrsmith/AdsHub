import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { showToast } from '../lib/toast.js';

export default function StatusBar({ platform, start, end, q, sort }) {
  const [syncs, setSyncs] = useState({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch('/api/last-sync');
        setSyncs(data);
      } catch (err) {
        console.error(err);
        showToast('Failed to load data');
      }
    }
    load();
  }, []);

  function format(ts) {
    if (!ts) return 'never';
    return new Date(ts).toLocaleString();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ platform, start, end });
      if (q) params.set('q', q);
      if (sort) params.set('sort', sort);
      const csv = await apiFetch(`/api/export.csv?${params.toString()}`);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      showToast('Failed to export data');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-alt)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) 0' }}>
        <div style={{ fontSize: '14px' }}>Last Sync: Facebook {format(syncs.facebook)} • YouTube {format(syncs.youtube)}</div>
        <button onClick={handleExport} disabled={exporting}>{exporting ? 'Exporting...' : 'Export CSV'}</button>
      </div>
    </div>
  );
}
