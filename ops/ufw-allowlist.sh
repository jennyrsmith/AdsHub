#!/usr/bin/env bash
# Usage:
#   ./ops/ufw-allowlist.sh add 203.0.113.10
#   ./ops/ufw-allowlist.sh remove 203.0.113.10
#   ./ops/ufw-allowlist.sh status

set -euo pipefail

ACTION="${1:-status}"
IP="${2:-}"

if ! command -v ufw >/dev/null 2>&1; then
  echo "UFW not installed. Install with: apt-get update && apt-get install -y ufw"
  exit 1
fi

case "$ACTION" in
  init)
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow OpenSSH
    ufw enable
    ;;
  add)
    test -n "$IP"
    ufw allow from "$IP" to any port 22 proto tcp
    ufw allow from "$IP" to any port 3000 proto tcp
    ;;
  remove)
    test -n "$IP"
    ufw delete allow from "$IP" to any port 22 proto tcp || true
    ufw delete allow from "$IP" to any port 3000 proto tcp || true
    ;;
  status)
    ufw status verbose
    ;;
  *)
    echo "Usage: $0 {init|add <ip>|remove <ip>|status}"
    exit 2
    ;;
 esac

