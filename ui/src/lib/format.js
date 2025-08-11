const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat(undefined, { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatCurrency(v) {
  if (v === null || v === undefined) return '-';
  return currency.format(v);
}

export function formatNumber(v) {
  if (v === null || v === undefined) return '-';
  return number.format(v);
}

export function formatPercent(v) {
  if (v === null || v === undefined) return '-';
  return percent.format(v);
}
