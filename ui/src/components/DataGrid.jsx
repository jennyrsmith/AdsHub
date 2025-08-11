import { DataGrid } from 'react-data-grid';

export const allColumns = [
  { key: 'date', name: 'Date', sortable: true },
  { key: 'platform', name: 'Platform', sortable: true },
  { key: 'account_id', name: 'Account', sortable: true },
  { key: 'campaign_name', name: 'Campaign', sortable: true },
  { key: 'adset_name', name: 'Ad Set', sortable: true },
  { key: 'ad_name', name: 'Ad', sortable: true },
  { key: 'impressions', name: 'Impr.', sortable: true },
  { key: 'clicks', name: 'Clicks', sortable: true },
  { key: 'spend', name: 'Spend', sortable: true },
  { key: 'cpc', name: 'CPC', sortable: true },
  { key: 'ctr', name: 'CTR', sortable: true },
  { key: 'purchase_roas', name: 'ROAS', sortable: true },
];

export default function ResultsGrid({ rows, sort, onSort, columns = allColumns }) {
  const sortParts = sort ? sort.split(':') : [];
  const sortColumn = sortParts[0];
  const sortDirection = sortParts[1] === 'desc' ? 'DESC' : 'ASC';

  function handleSort(cols) {
    if (cols.length === 0) onSort('');
    else {
      const c = cols[0];
      onSort(`${c.columnKey}:${c.direction}`);
    }
  }

  return (
    <DataGrid
      columns={columns}
      rows={rows}
      className="rdg-light"
      rowHeight={32}
      headerRowHeight={32}
      sortColumns={sort ? [{ columnKey: sortColumn, direction: sortDirection }] : []}
      onSortColumnsChange={handleSort}
      style={{ minHeight: 200 }}
    />
  );
}
