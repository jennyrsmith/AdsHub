import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { toast } from '../lib/toast.js';

export default function StatusBar({ platform, start, end, q, sort }) {
  const [syncs, setSyncs] = useState({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    apiFetch('/api/last-sync').then(setSyncs).catch((e) => toast(e.message, 'error'));
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
      const res = await apiFetch(`/api/export.csv?${params.toString()}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast(err.message, 'error');
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
