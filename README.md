# Kilo Common Framework

Shared Kilo Code configuration, engineering rules, and MCP servers for the agentic development workflow.

## What's Inside

| Path | Purpose |
|---|---|
| `kilo.json` | Global configuration — 6 MCP servers, agents, indexing, permissions |
| `instructions/engineering-rules.md` | Stack-agnostic behavioral rules (no placeholders, anti-sycophantic, TypeScript error handling) |
| `mcp-servers/puppetmaster/` | Puppet Master MCP server — 26 tools for PM framework operations |

## MCP Servers (6)

| Server | Purpose |
|---|---|
| **context7** | Version-specific docs on demand (20,000+ libraries) |
| **sqlite** | Direct SQLite database access (schema, queries, explain) |
| **puppeteer** | Browser automation (screenshots, UI testing, page interaction) |
| **puppetmaster** | PM framework operations (config, dev, DB, deploy, knowledge) |
| **tausik** | Project management (epics, tasks, memory graph, QA gates) |
| **git** | Structured git operations (status, diff, log, commit, branch) |

## Quick Start

```bash
# Clone into global config location
git clone https://github.com/ldco/<repo-name>.git ~/.config/kilo
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
