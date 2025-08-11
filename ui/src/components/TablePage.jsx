import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FiltersBar from './FiltersBar.jsx';
import ResultsGrid from './DataGrid.jsx';

function defaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default function TablePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const defaults = defaultDates();
  const platform = searchParams.get('platform') || 'all';
  const start = searchParams.get('start') || defaults.start;
  const end = searchParams.get('end') || defaults.end;
  const q = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || '';
  const limit = Number(searchParams.get('limit')) || 500;
  const offset = Number(searchParams.get('offset')) || 0;

  useEffect(() => {
    const params = new URLSearchParams({ platform, start, end, limit, offset });
    if (q) params.set('q', q);
    if (sort) params.set('sort', sort);
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/rows?${params.toString()}`);
        const data = await res.json();
        setRows(data.rows || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error(err);
        // simple alert for errors
        alert('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [platform, start, end, q, sort, limit, offset]);

  function updateParams(upd) {
    const sp = new URLSearchParams(searchParams);
    Object.entries(upd).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') sp.delete(k);
      else sp.set(k, String(v));
    });
    setSearchParams(sp);
  }

  function handleExport() {
    const params = new URLSearchParams({ platform, start, end });
    if (q) params.set('q', q);
    if (sort) params.set('sort', sort);
    const apiKey = import.meta.env.VITE_SYNC_API_KEY;
    fetch(`/api/export.csv?${params.toString()}`, {
      headers: { 'x-api-key': apiKey },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }

  return (
    <div>
      <FiltersBar
        platform={platform}
        start={start}
        end={end}
        q={q}
        onChange={updateParams}
        onExport={handleExport}
      />
      <ResultsGrid
        rows={rows}
        total={total}
        limit={limit}
        offset={offset}
        sort={sort}
        onSort={(s) => updateParams({ sort: s })}
        onPageChange={(off) => updateParams({ offset: off })}
        onLimitChange={(l) => updateParams({ limit: l, offset: 0 })}
        loading={loading}
      />
    </div>
  );
}
