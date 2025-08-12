#!/usr/bin/env bash
set -euo pipefail

# Paths
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="$REPO_DIR/certs"
CERT_FILE="$CERT_DIR/db-ca.pem"

echo "[1/6] Stashing local changes (if any)…"
cd "$REPO_DIR"
git add -A || true
git stash push -m "pre-pull-$(date +%s)" || true

echo "[2/6] Fetching & pulling main…"
git fetch origin
git checkout main
git pull --ff-only origin main

echo "[3/6] Restoring cert if present on disk…"
if [[ -f "$CERT_FILE" ]]; then
  echo "  Found $CERT_FILE"
else
  echo "  WARNING: $CERT_FILE missing. Place your DO CA cert there if you require strict SSL."
fi

echo "[4/6] Installing deps…"
npm install

echo "[5/6] Running migrations…"
npm run migrate

echo "[6/6] Done. Start server with: npm start"
