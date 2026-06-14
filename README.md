# Kilo Common Framework

Shared Kilo Code configuration, engineering rules, and MCP servers for the agentic development workflow.

## What's Inside

| Path | Purpose |
|---|---|
| `kilo.json` | Global configuration — 6 MCP servers, agents, indexing, permissions |
| `instructions/engineering-rules.md` | Stack-agnostic behavioral rules (no placeholders, anti-sycophantic, TypeScript error handling) |
| `mcp-servers/puppetmaster/` | Puppet Master MCP server — 26 tools for PM framework operations |

## MCP Servers (6)

All MCP servers run as **shared HTTP daemons** via `mcp-proxy` + systemd user services. One set of daemons serves all Kilo tabs — no per-instance duplication. See [`docs/kilo-mcp-sharing.md`](docs/kilo-mcp-sharing.md).

| Server | Port | Purpose |
|---|---|---|
| **context7** | 8200 | Version-specific docs on demand (20,000+ libraries) |
| **sqlite** | 8201 | Direct SQLite database access (schema, queries, explain) |
| **puppeteer** | 8202 | Browser automation (screenshots, UI testing, page interaction) |
| **puppetmaster** | 8203 | PM framework operations (config, dev, DB, deploy, knowledge) |
| **tausik** | 8204 | Project management (epics, tasks, memory graph, QA gates) |
| **git** | 8205 | Structured git operations (status, diff, log, commit, branch) |

## Quick Start

```bash
# Clone into global config location
git clone https://github.com/ldco/kilogramme.git ~/.config/kilo

# Install MCP daemons (shared across all Kilo tabs)
bash ~/.config/kilo/scripts/setup-mcp-daemons.sh

# Copy and customize config
cp ~/.config/kilo/kilo.example.json ~/.config/kilo/kilo.json
# → Add your API keys (DeepSeek, Voyage AI)
```

Requires: Node.js ≥ 20, `uvx` (for git MCP), DeepSeek API key, Voyage AI API key.

## Agents

| Agent | Role |
|---|---|
| **architect** | Design planning, uncertainty assessment (🟢🟡🔴 confidence system) |
| **code-reviewer** | Security, performance, maintainability review |
| **docs-specialist** | Technical documentation |
| **test-engineer** | Test writing, debugging, coverage |

## Full Tool Stack Reference

See [docs/development-tool-stack.md](docs/development-tool-stack.md) for the complete infrastructure documentation (Russian).
