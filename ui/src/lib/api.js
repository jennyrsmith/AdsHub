const API_BASE = import.meta.env.VITE_API_BASE || "";
const API_KEY  = import.meta.env.VITE_SYNC_API_KEY || "";

async function apiFetch(path, { method = "GET", headers = {}, body, signal } = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "x-api-key": API_KEY,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    signal
  });

  // try JSON first, then text
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = data?.message || data?.error || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const Api = {
  lastSync: () => apiFetch("/api/last-sync"),
  sync:     (scope = "all") => apiFetch("/api/sync", { method: "POST", body: { scope } }),
  summary:  (params) => apiFetch(`/api/summary${toQs(params)}`),
  rows:     (params) => apiFetch(`/api/rows${toQs(params)}`),
  exportCsv:(params) => `${API_BASE}/api/export.csv${toQs(params)}`,
};

function toQs(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}
