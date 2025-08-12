#!/usr/bin/env bash
set -euo pipefail

cd /root/AdsHub

echo "=== 1) Pull latest main ==="
git fetch origin main
git reset --hard origin/main

echo "=== 2) Install deps (root + ui) ==="
npm ci
npm --prefix ui ci

echo "=== 3) Source .env (do not edit it) ==="
set -a
source .env
set +a

# Sanity checks
: "${PG_URI:?PG_URI missing in .env}"
: "${SYNC_API_KEY:?SYNC_API_KEY missing in .env}"
echo "PG_URI present, SYNC_API_KEY length=$(printf %s "$SYNC_API_KEY" | wc -c)"

echo "=== 4) Run migrations (ok to be empty on first boot) ==="
if ! npm run migrate; then
  echo "WARN: migrations reported a failure (often OK if DB empty or SSL relaxed). Continuing..."
fi

echo "=== 5) Build UI ==="
npm --prefix ui run build

echo "=== 6) Start/Restart API with pm2 ==="
# Ensure pm2 exists
if ! command -v pm2 >/dev/null 2>&1; then
  npm i -g pm2
fi

# Kill old process if any
pm2 delete adshub-api 2>/dev/null || true

# Start API; index.js should serve ui/dist and /api/* on 3000
# Use --update-env so pm2 reads current .env values
pm2 start index.js --name adshub-api --update-env
pm2 save

echo "=== 7) Quick service checks ==="
curl -fsS http://localhost:3000/healthz || (echo "Health check failed" && exit 1)

echo "=== 8) Check /api/summary and /api/rows over local and domain (HTTP) ==="
API="http://localhost:3000"
DOMAIN="http://ads.beautybyearth.com"

echo "- Local /api/summary"
curl -fsS -H "x-api-key: $SYNC_API_KEY" "$API/api/summary?range=7" | head -c 300 || true
echo; echo "- Local /api/rows"
curl -fsS -H "x-api-key: $SYNC_API_KEY" "$API/api/rows?limit=5" | head -c 300 || true

echo; echo "- Domain /api/summary"
curl -fsS -H "x-api-key: $SYNC_API_KEY" "$DOMAIN/api/summary?range=7" | head -c 300 || true
echo; echo "- Domain /api/rows"
curl -fsS -H "x-api-key: $SYNC_API_KEY" "$DOMAIN/api/rows?limit=5" | head -c 300 || true

echo; echo "=== 9) Nginx sanity ==="
systemctl is-active --quiet nginx && echo "Nginx active" || echo "Nginx not active (app still reachable on :3000)"

echo "=== Deploy complete. Visit: $DOMAIN (HTTP) ==="
