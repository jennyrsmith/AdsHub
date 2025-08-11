export async function apiFetch(path, options = {}) {
  const apiKey = import.meta.env.VITE_SYNC_API_KEY;
  const opts = {
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
      ...(options.headers || {}),
    },
    ...options,
  };
  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
  }
  const base = import.meta.env.VITE_API_BASE || '';
  const res = await fetch(`${base}${path}`, opts);
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || res.statusText);
  }
  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return await res.json();
  }
  return res;
}
