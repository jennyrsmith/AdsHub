import DataGrid from 'react-data-grid';

const columns = [
  { key: 'date_start', name: 'Date', sortable: true },
  { key: 'platform', name: 'Platform', sortable: true },
  { key: 'account_id', name: 'Account' },
  { key: 'campaign_name', name: 'Campaign', sortable: true },
  { key: 'adset_name', name: 'Ad Set' },
  { key: 'ad_name', name: 'Ad' },
  { key: 'impressions', name: 'Impr.', sortable: true },
  { key: 'clicks', name: 'Clicks', sortable: true },
  { key: 'spend', name: 'Spend', sortable: true },
  { key: 'revenue', name: 'Revenue', sortable: true },
  { key: 'roas', name: 'ROAS', sortable: true }
];

export default function ResultsGrid({ rows, total, limit, offset, sort, onSort, onPageChange, onLimitChange, loading }) {
  const sortParts = sort ? sort.split(':') : [];
  const sortColumn = sortParts[0];
  const sortDirection = sortParts[1] === 'desc' ? 'DESC' : 'ASC';

  function handleSort(columns) {
    if (columns.length === 0) {
      onSort('');
    } else {
      const c = columns[0];
      onSort(`${c.columnKey}:${c.direction}`);
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <DataGrid
        columns={columns}
        rows={rows}
        sortColumns={sort ? [{ columnKey: sortColumn, direction: sortDirection }] : []}
        onSortColumnsChange={handleSort}
        className="rdg-light"
      />
      <div style={{ marginTop: '0.5rem' }}>
        <span>Results: {rows.length} of {total}</span>
        <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))}>
          <option value={500}>500</option>
          <option value={1000}>1000</option>
          <option value={2000}>2000</option>
        </select>
        <button disabled={offset === 0} onClick={() => onPageChange(Math.max(0, offset - limit))}>Prev</button>
        <button disabled={offset + limit >= total} onClick={() => onPageChange(offset + limit)}>Next</button>
        {loading && <span> Loading...</span>}
      </div>
    </div>
  );
}
