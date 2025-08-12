const API_BASE = import.meta.env.VITE_API_BASE || "";
const API_KEY  = import.meta.env.VITE_SYNC_API_KEY || "";

const withBase = (p) => `${API_BASE}${p}`;

export function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach(x => q.append(k, x));
    else q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function apiFetch(path, { method = "GET", headers = {}, body, signal } = {}) {
  const h = { Accept: "application/json", ...headers };
  if (API_KEY) h["x-api-key"] = API_KEY;
  if (body && !h["Content-Type"]) h["Content-Type"] = "application/json";

  const res = await fetch(withBase(path), {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
    signal
  });

  const text = await res.text();
  const isJSON = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJSON ? (text ? JSON.parse(text) : null) : text;

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
