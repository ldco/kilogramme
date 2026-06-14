# Kilo MCP Daemon Architecture — Shared HTTP Transport

> Version: 1.0 | Date: 2026-06-14

## Problem

Each Kilo CLI instance (`kilo` TUI session) spawns MCP servers as **child processes** via STDIO transport. With 6 MCP servers and N terminal tabs, you get **N × 6 redundant processes**, each with its own Node.js/Python runtime, event loop, and memory.

| Tabs | MCP Processes | Total RSS (approx) |
|------|--------------|---------------------|
| 1 | 6 npm exec + 6 backends = 12 | ~1.9 GB |
| 3 | 36 | ~5.5 GB |
| 5 | 60 | ~10 GB |

STDIO MCP is inherently **1:1** — stdin/stdout is a parent-child pipe, not a socket. No sharing is possible at the protocol level.

## Solution

Wrap each STDIO MCP server behind an **HTTP endpoint** using [`mcp-proxy`](https://github.com/punkpeye/mcp-proxy) (1.5M weekly downloads, MIT). MCP daemons run as **systemd user services**, auto-start on login. All Kilo instances connect via `type: "remote"` to `http://127.0.0.1:PORT/mcp`.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Kilo tab 1   │  │ Kilo tab 2   │  │ Kilo tab N   │
│ (project A)  │  │ (project B)  │  │ (project C)  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │  HTTP (remote MCP)
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐     ┌─────▼─────┐     ┌────▼────┐
   │ :8200   │     │ :8201     │ ... │ :8205   │
   │ context7│     │ sqlite    │     │ git     │
   └────┬────┘     └─────┬─────┘     └────┬────┘
        │                │                │
   ┌────▼────┐     ┌─────▼─────┐     ┌────▼────┐
   │ STDIO   │     │ STDIO     │     │ STDIO   │
   │ backend │     │ backend   │     │ backend │
   └─────────┘     └───────────┘     └─────────┘

   systemd user services (auto-start, restart on failure)
```

## Port Allocation

Ports 8200-8205 — deliberately outside the 3000-9000 web development range.

| Service | Port | Wrapper | Underlying command |
|---------|------|---------|-------------------|
| context7 | 8200 | mcp-proxy | `npx -y @upstash/context7-mcp` |
| sqlite | 8201 | mcp-proxy | `npx mcp-sqlite-server` |
| puppeteer | 8202 | mcp-proxy | `npx puppeteer-mcp-claude serve` |
| puppetmaster | 8203 | mcp-proxy | `tsx puppetmaster/src/index.ts` |
| tausik | 8204 | mcp-proxy | `bash tausik/run-server.sh` |
| git | 8205 | mcp-proxy | `uvx mcp-server-git` |

## Results (5 Kilo tabs, measured)

| Metric | Old (STDIO, per-tab) | New (HTTP, shared) | Savings |
|--------|---------------------|-------------------|---------|
| Total RSS | ~10 GB (estimated) | 4.6 GB | **~54%** |
| MCP processes | 30+ (duplicated) | 11 (shared) | **~63%** |
| MCP CPU | Per-tab event loops | ~1% total (shared loop) | **~95%** |
| Kilo startup time | Cold npm exec per tab | Instant (daemons pre-warmed) | — |

## Configuration

### kilo.json (MCP section)

```json
"mcp": {
    "context7":      { "type": "remote", "url": "http://127.0.0.1:8200/mcp", "enabled": true },
    "sqlite":        { "type": "remote", "url": "http://127.0.0.1:8201/mcp", "enabled": true },
    "puppeteer":     { "type": "remote", "url": "http://127.0.0.1:8202/mcp", "enabled": true },
    "puppetmaster":  { "type": "remote", "url": "http://127.0.0.1:8203/mcp", "enabled": true },
    "tausik":        { "type": "remote", "url": "http://127.0.0.1:8204/mcp", "enabled": true },
    "git":           { "type": "remote", "url": "http://127.0.0.1:8205/mcp", "enabled": true }
}
```

## Systemd Services

All services are in `systemd/` directory. Install with `scripts/setup-mcp-daemons.sh`.

Properties:
- **Type:** simple (mcp-proxy runs foreground)
- **Restart:** on-failure, 5 sec delay
- **PATH:** includes npm global bin, uvx
- **Auto-start:** WantedBy=default.target

## Dependencies

- Node.js ≥ 20
- `npm install -g mcp-proxy tsx`
- `uvx` (for git MCP server)
- systemd user instance (default on modern Linux)

## Rollback

```bash
systemctl --user disable --now kilo-mcp-{context7,sqlite,puppeteer,puppetmaster,tausik,git}
rm ~/.config/systemd/user/kilo-mcp-*.service
systemctl --user daemon-reload
# Restore kilo.json to type: "local" with original command arrays
```
