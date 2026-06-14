#!/bin/bash
# ============================================================================
# SETUP MCP DAEMONS — Install shared MCP servers as systemd user services
# ============================================================================
# Converts Kilo MCP servers from per-instance STDIO (child processes) to
# shared HTTP transport via mcp-proxy. All Kilo tabs share the same daemons.
#
# Idempotent — safe to re-run. Services are restarted if already running.
# ============================================================================

set -e

KILO_CONFIG_DIR="${KILO_CONFIG_DIR:-$HOME/.config/kilo}"
SYSTEMD_USER_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
PORTS=(8200 8201 8202 8203 8204 8205)
SERVICES=(
  "kilo-mcp-context7"
  "kilo-mcp-sqlite"
  "kilo-mcp-puppeteer"
  "kilo-mcp-puppetmaster"
  "kilo-mcp-tausik"
  "kilo-mcp-git"
)

echo "=== Kilo MCP Daemon Setup ==="
echo ""

# ---------------------------------------------------------------------------
# 1. Check dependencies
# ---------------------------------------------------------------------------
echo "[1/4] Checking dependencies..."

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "  ✗ $1 NOT FOUND — install it first"
    return 1
  fi
  echo "  ✓ $1 ($(command -v "$1"))"
}

check_cmd node
check_cmd npx

if ! command -v mcp-proxy &>/dev/null; then
  echo "  → Installing mcp-proxy globally..."
  npm install -g mcp-proxy
fi
echo "  ✓ mcp-proxy ($(command -v mcp-proxy))"

if ! command -v tsx &>/dev/null; then
  echo "  → Installing tsx globally..."
  npm install -g tsx
fi
echo "  ✓ tsx ($(command -v tsx))"

for cmd in uvx bash; do
  check_cmd "$cmd"
done

echo ""

# ---------------------------------------------------------------------------
# 2. Install systemd service files
# ---------------------------------------------------------------------------
echo "[2/4] Installing systemd service files..."

mkdir -p "$SYSTEMD_USER_DIR"

cp "$KILO_CONFIG_DIR/systemd/"*.service "$SYSTEMD_USER_DIR/"

echo "  Installed $(ls "$KILO_CONFIG_DIR/systemd/"*.service | wc -l) service files"
echo ""

# ---------------------------------------------------------------------------
# 3. Enable and start services
# ---------------------------------------------------------------------------
echo "[3/4] Enabling and starting services..."

systemctl --user daemon-reload

for svc in "${SERVICES[@]}"; do
  systemctl --user enable --now "$svc" 2>/dev/null || true
done

echo ""

# ---------------------------------------------------------------------------
# 4. Verify
# ---------------------------------------------------------------------------
echo "[4/4] Verifying..."

sleep 2
ALL_OK=true

for i in "${!SERVICES[@]}"; do
  svc="${SERVICES[$i]}"
  port="${PORTS[$i]}"
  status=$(systemctl --user is-active "$svc" 2>/dev/null || echo "inactive")
  if [ "$status" = "active" ]; then
    echo "  ✓ $svc — active, port $port"
  else
    echo "  ✗ $svc — $status"
    ALL_OK=false
  fi
done

echo ""

if $ALL_OK; then
  echo "=== All MCP daemons running ==="
  echo ""
  echo "Memory usage:"
  ps -eo pid,%mem,rss,args --no-headers | grep mcp-proxy | awk '{sum_mem+=$2; sum_rss+=$3; n++} END {printf "  %d daemons  MEM: %.1f%%  RSS: %d kB\n", n, sum_mem, sum_rss}'
  echo ""
  echo "Next step: update kilo.json mcp section to use remote URLs."
  echo "See: docs/kilo-mcp-sharing.md"
else
  echo "=== Some services failed to start — check logs ==="
  echo "  journalctl --user -u kilo-mcp-* -n 20"
  exit 1
fi
