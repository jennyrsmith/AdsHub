export const SORT_FIELDS = new Set(['date_start','spend','clicks','impressions','roas','campaign_name']);

export function parseSort(sort) {
  if (!sort) return 'ORDER BY date_start DESC';
  const [field, dir] = sort.split(':');
  if (!SORT_FIELDS.has(field)) return 'ORDER BY date_start DESC';
  const direction = dir && dir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${field} ${direction}`;
}
