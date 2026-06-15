# Kilo Common Framework

Shared Kilo Code configuration, engineering rules, MCP servers, and agent ecosystem for the agentic development workflow.

## What's Inside

| Path | Purpose |
|---|---|
| `kilo.json` | Global configuration — 7 MCP servers, 5 agents, indexing, permissions |
| `instructions/` | Engineering rules, cybersecurity, Russian law, repo-map, aider features |
| `mcp-servers/puppetmaster/` | Puppet Master MCP server — 26 tools for PM framework operations |
| `mcp-servers/ralph/` | Ralph Wiggum MCP server — PRD state management for autonomous story execution |
| `.kilo/agents/` | Agent prompts: `prd`, `ralph`, `code-reviewer` |

## MCP Servers (7)

All MCP servers run as **shared HTTP daemons** via `mcp-proxy` + systemd user services (`ralph` uses local stdio transport instead). See [`docs/kilo-mcp-sharing.md`](docs/kilo-mcp-sharing.md).

| Server | Port | Purpose |
|---|---|---|
| **context7** | 8200 | Version-specific docs on demand (20,000+ libraries) |
| **sqlite** | 8201 | Direct SQLite database access (schema, queries, explain) |
| **puppeteer** | 8202 | Browser automation (screenshots, UI testing, page interaction) |
| **puppetmaster** | 8203 | PM framework operations (config, dev, DB, deploy, knowledge) |
| **tausik** | 8204 | Project management (epics, tasks, memory graph, QA gates) |
| **git** | 8205 | Structured git operations (status, diff, log, commit, branch) |
| **ralph** | local stdio | PRD state management (8 tools: load, next, verify, block, learn, status, complete, detect-stack) |

## Agents

| Agent | Mode | Role | Output |
|---|---|---|---|
| **prd** | primary | Structured interview — asks precise questions, designs features, outputs PRD | `docs/<feature>.md` with US-XXX stories |
| **ralph** | primary | PRD execution engine — one story at a time, verify → learn → commit → repeat | Verified commits, `<promise>COMPLETE</promise>` |
| **code-reviewer** | primary | Deep 8-dimension codebase audit — security, architecture, quality, performance, deps, testing, config, conventions | `docs/review-<area>.md` with executable findings |
| **architect** | primary | Free-form architecture design, ADRs, C4 modeling, trade-off analysis | ADRs, design documents |
| **code-reviewer** (original) | primary | (upgraded — see above) | — |

## PRD Workflow — The Development Loop

```
┌──────────────────────────────────────────────────────────────┐
│                      Kilo TUI (one session)                    │
│                                                               │
│  ┌──────────────┐                                             │
│  │ prd agent    │  "I want user authentication"               │
│  │              │  → interviews (structured Q&A)              │
│  │              │  → detects stack automatically              │
│  │              │  → outputs docs/user-auth.md (8 stories)     │
│  └──────┬───────┘                                             │
│         │ PRD file                                            │
│         ▼                                                     │
│  ┌──────────────┐                                             │
│  │ ralph agent  │  "Execute docs/user-auth.md"                │
│  │              │  → loads PRD via ralph MCP (state offload)  │
│  │              │  → US-001: implement → verify → commit ✓    │
│  │              │  → US-002: implement → verify → commit ✓    │
│  │              │  → ...                                      │
│  │              │  → <promise>COMPLETE</promise>              │
│  └──────┬───────┘                                             │
│         │ Findings PRD                                        │
│         ▼                                                     │
│  ┌──────────────┐                                             │
│  │code-reviewer │  "Review the project"                       │
│  │              │  → 8-dimension deep audit                   │
│  │              │  → outputs docs/review-<area>.md (findings) │
│  │              │  → each finding = executable US-XXX story   │
│  └──────┬───────┘                                             │
│         │ Review PRD (can be fed to ralph to fix)             │
│         ▼                                                     │
│  ┌──────────────┐                                             │
│  │ ralph agent  │  "Execute docs/review-auth.md"              │
│  │              │  → fixes P1 findings first                  │
│  │              │  → verify → learn → commit                  │
│  └──────────────┘                                             │
│                                                               │
│  All agents inside Kilo TUI — switch agent, type, go.         │
│  No external tools, no extra commands.                        │
└──────────────────────────────────────────────────────────────┘
```

### Quick Start

```bash
# 1. Plan a feature
#    Switch to prd agent → "I want user authentication for my Nuxt site"
#    → Agent interviews → saves docs/user-auth.md

# 2. Execute the PRD
#    Switch to ralph agent → "Execute docs/user-auth.md"
#    → Agent implements story-by-story, verifies, commits

# 3. Review the result
#    Switch to code-reviewer agent → "Review the project for security issues"
#    → Agent deep audits → saves docs/review-auth.md

# 4. Fix findings
#    Switch to ralph agent → "Execute docs/review-auth.md"
#    → Agent fixes P1 findings, commits
```

### PRD Compatibility

All three agents use the same PRD file format — `docs/<name>.md` with US-XXX user stories, acceptance criteria, priority, and dependency chains. This means any agent's output can be fed to any other agent:

- `prd` → creates feature PRDs
- `code-reviewer` → creates review PRDs (findings as stories)
- `ralph` → executes any PRD (feature or review)

The **ralph MCP server** (`mcp-servers/ralph/`) manages PRD state on disk (`.ralph/state.json`) so the agent's context window stays small — one story at a time, not the full PRD.

## Full Tool Stack Reference

See [docs/development-tool-stack.md](docs/development-tool-stack.md) for the complete infrastructure documentation (Russian).

## Attribution

This framework uses the [TAUSIK](https://github.com/Kibertum/tausik-core) project management system by [Andrey Yumashev](https://github.com/Kibertum) — a structured agentic workflow engine with epics, tasks, memory graphs, and quality gates.
