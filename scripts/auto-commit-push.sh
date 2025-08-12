#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

BRANCH="${1:-main}"

echo "[auto] Stashing local changes (if any)…"
git stash push -u -m "auto-stash $(date -u +'%Y-%m-%dT%H:%M:%SZ')" || true

echo "[auto] Fetch + rebase onto origin/${BRANCH}…"
git fetch origin
git checkout "${BRANCH}"
git rebase "origin/${BRANCH}" || { echo "[auto] Rebase failed. Resolving…"; git rebase --abort; git reset --hard "origin/${BRANCH}"; }

echo "[auto] Restore stashed work (if any)…"
# Try to apply but don’t fail the whole script if conflicts appear
if git stash list | grep -q "auto-stash"; then
  git stash pop || true
fi

echo "[auto] Stage ONLY safe paths…"
# Add only code & migration folders you want tracked
git add \
  migrations/ \
  scripts/*.js \
  lib/**/*.js \
  server.js \
  index.js \
  README.md \
  package.json \
  ui/** \
  --intent-to-add

# Never stage these
git restore --staged .env || true
git restore --staged certs || true
git restore --staged certs/* || true

if git diff --cached --quiet; then
  echo "[auto] Nothing to commit."
else
  MSG="auto: server changes $(hostname) $(date -u +'%Y-%m-%d %H:%M:%SZ')"
  echo "[auto] Commit: ${MSG}"
  git commit -m "${MSG}"
  echo "[auto] Push…"
  git push origin "${BRANCH}"
fi

echo "[auto] Done."
