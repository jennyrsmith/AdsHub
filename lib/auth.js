export function requireApiKey(req, res, next) {
  const want = process.env.SYNC_API_KEY;
  const got = req.get('x-api-key');
  if (!want) return res.status(500).json({ error: 'server-misconfig', detail: 'SYNC_API_KEY missing' });
  if (got !== want) return res.status(401).json({ error: 'unauthorized' });
  next();
}
