import { useEffect, useRef, useState } from 'react';
import ResultsGrid, { allColumns } from './DataGrid.jsx';
import { apiFetch } from '../lib/api.js';
import { showToast } from '../lib/toast.js';

export default function TablePage({ platform, start, end, q, sort, limit, offset, onChange }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [visibleCols, setVisibleCols] = useState(allColumns.map(c => c.key));
  const [colOpen, setColOpen] = useState(false);
  const searchRef = useRef();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ platform, start, end, limit, offset });
        if (q) params.set('q', q);
        if (sort) params.set('sort', sort);
        const res = await apiFetch(`/api/rows?${params.toString()}`);
        setRows(res.rows || []);
        setTotal(res.total || 0);
      } catch (err) {
        console.error(err);
        showToast('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [platform, start, end, q, sort, limit, offset]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === '/' && searchRef.current) {
        e.preventDefault();
        searchRef.current.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const debounced = useRef();
  function handleSearch(e) {
    const val = e.target.value;
    clearTimeout(debounced.current);
    debounced.current = setTimeout(() => onChange({ q: val, offset: 0 }), 300);
  }

  const cols = allColumns.filter(c => visibleCols.includes(c.key));

  function toggleColumn(key) {
    setVisibleCols(v => v.includes(key) ? v.filter(k => k !== key) : [...v, key]);
  }

  return (
    <section style={{ marginTop: 'var(--space-xl)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
        <h2 style={{ margin: 0 }}>Performance Rows</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <input ref={searchRef} placeholder="Search" defaultValue={q} onChange={handleSearch} style={{ padding: 'var(--space-sm)' }} />
          <select value={limit} onChange={(e) => onChange({ limit: Number(e.target.value), offset: 0 })}>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setColOpen(o => !o)}>Columns ▾</button>
            {colOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: 'var(--space-sm)', zIndex: 5 }}>
                {allColumns.map(col => (
                  <label key={col.key} style={{ display: 'block' }}>
                    <input type="checkbox" checked={visibleCols.includes(col.key)} onChange={() => toggleColumn(col.key)} /> {col.name}
                  </label>
                ))}
                <button onClick={() => setVisibleCols(allColumns.map(c => c.key))}>Reset view</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {loading && rows.length === 0 ? (
        <div style={{ height: 200, background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }} />
      ) : rows.length === 0 ? (
        <div>No data</div>
      ) : (
        <ResultsGrid rows={rows} sort={sort} onSort={(s) => onChange({ sort: s, offset: 0 })} columns={cols} />
      )}
      <div style={{ marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <span>Showing {rows.length} of {total}</span>
        <button disabled={offset === 0} onClick={() => onChange({ offset: Math.max(0, offset - limit) })}>Prev</button>
        <button disabled={offset + limit >= total} onClick={() => onChange({ offset: offset + limit })}>Next</button>
        {loading && <span>Loading...</span>}
      </div>
    </section>
  );
}
