export function yyyymmdd(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
}
export function yesterdayRange() {
  const end = new Date(); end.setDate(end.getDate() - 1);
  const start = new Date(end);
  return { since: yyyymmdd(start), until: yyyymmdd(end) };
}
export function todayRange() {
  const now = new Date();
  return { since: yyyymmdd(now), until: yyyymmdd(now) };
}
