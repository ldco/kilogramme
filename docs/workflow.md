# Kilo PRD-Driven Development Workflow

## Overview

Three‑agent ecosystem inside Kilo TUI: **Plan → Execute → Review → Fix**.

```
         ┌──────────────────────────────────────────────────────────┐
         │                    Kilo TUI (one session)                 │
         │                                                          │
         │  ┌──────────────┐                                        │
         │  │   prd agent   │  Creates feature PRDs                 │
         │  │  (interview)  │  → docs/<feature>.md                  │
         │  └──────┬───────┘                                        │
         │         │ PRD file                                        │
         │         ▼                                                 │
         │  ┌──────────────┐     ┌──────────────────┐              │
         │  │ ralph agent   │────│ ralph MCP server  │              │
         │  │ (execution)   │    │ .ralph/state.json │              │
         │  └──────┬───────┘    └──────────────────┘              │
         │         │                                                 │
         │         │ (two inputs)                                    │
         │         ├── Feature PRD → implement stories              │
         │         └── Review PRD → fix findings                    │
         │         ▼                                                 │
         │  ┌──────────────┐                                        │
         │  │code-reviewer │  Deep 8-dimension audit                │
         │  │  (audit)     │  → docs/review-<area>.md               │
         │  └──────┬───────┘                                        │
         │         │ Review PRD (executable by ralph)               │
         │         └────────────────────────────────→ ralph agent   │
         │                                                          │
         │  Agent switching inside TUI — no commands to remember.   │
         └──────────────────────────────────────────────────────────┘
```

## Tool Summary

| Role | Agent | How to Trigger | Output | Input |
|---|---|---|---|---|
| Planner | **prd** | Switch to `prd` agent, describe feature | `docs/<feature>.md` (US-XXX stories) | Natural language |
| Executor | **ralph** | Switch to `ralph` agent, "Execute docs/x.md" | Verified commits, `<promise>COMPLETE</promise>` | PRD file |
| Auditor | **code-reviewer** | Switch to `code-reviewer`, "Review the project" | `docs/review-<area>.md` (findings as stories) | Entire codebase |

## Agent: `prd` — Structured Interview → Feature PRD

**Goal**: Turn a natural‑language feature idea into a structured PRD file with US‑XXX user stories.

**How to use**:
```
1. Open Kilo TUI
2. Switch to prd agent
3. Type: "I want user authentication for my Nuxt site"
4. Agent asks structured questions (5-10):
   → Auth methods? Password, OAuth, 2FA?
   → Session strategy? Cookie, JWT, both?
   → Rate limiting requirements?
   → Password policy?
   → Account lockout?
   → Security compliance? (152-FZ, GDPR)
5. Agent detects stack automatically (reads project files)
6. Agent saves docs/user-auth.md with 5-15 US-XXX stories
7. Agent: "PRD created. Switch to ralph agent to execute."
```

**Rules**:
- Always interviews — no free-form exploration
- Always outputs to `docs/<kebab-case-name>.md`
- Stories have priority, dependency chain, and testable acceptance criteria
- Dependency graph must be a DAG — no circular deps

**Permissions**:
- Full read, glob, grep, semantic_search (explore codebase)
- Edit: `docs/*.md` only (output PRD)
- MCP: allow (context7 for docs, tausik for memory)

---

## Agent: `code-reviewer` — Deep Audit → Review PRD

**Goal**: Perform a comprehensive multi‑dimensional codebase review and output findings as an executable PRD.

**How to use**:
```
1. Switch to code-reviewer agent
2. Type: "Review the auth module for security issues"
3. Agent deep audits 8 dimensions:
   A. Architecture — coupling, layering, patterns
   B. Security (OWASP Top 10) — secrets, validation, auth, CSRF, headers
   C. Code Quality — dead code, error handling, types
   D. Performance — N+1 queries, caching, pagination
   E. Dependencies — outdated, vulnerable, unused
   F. Testing — coverage, edge cases, flakiness
   G. Configuration — env vars, secrets, Docker, CI/CD
   H. Conventions — consistency with project patterns
4. Agent saves docs/review-auth.md with US-XXX findings
   → P1 findings: security vulnerabilities, broken auth, data loss
   → P2 findings: architecture issues, perf bottlenecks
   → P3 findings: minor quality, conventions, tech debt
5. Agent: "Review complete. N findings. Switch to ralph to fix."
```

**Uses all MCP tools**: tausik (memory), context7 (docs), puppeteer (UI audit), sqlite (schema review), puppetmaster (PM framework audit).

**Permissions**:
- Edit: `docs/review-*.md` only (never changes source code)
- MCP: allow (all audit tools)

---

## Agent: `ralph` — PRD Execution Engine

**Goal**: Execute any PRD (feature or review) story‑by‑story. One story per iteration. Verify, learn, commit, repeat.

**How to use**:
```
1. Switch to ralph agent
2. Type: "Execute docs/user-auth.md"
3. Agent calls ralph MCP to load PRD state
4. Loop:
   ralph_next_story() → US-001: implement password hashing
   → Verify (tausik_verify / npm test)
   → Fix if fails (3 attempts max)
   → ralph_verify_story("US-001", evidence)
   → ralph_learn() if pattern discovered
   → git commit -m "feat(auth): US-001 — Password hashing"
   → ralph_next_story() → US-002: login endpoint
   → ...repeat...
   → ralph_next_story() → { done: true }
5. ralph_complete() → <promise>COMPLETE</promise>
```

**State management**: The **ralph MCP server** (`mcp-servers/ralph/`) stores PRD state in `.ralph/state.json`. The agent never holds the full PRD in context — it gets one story at a time via `ralph_next_story()`. This prevents context window blowout.

**Coordination**: The agent calls all available MCP tools:
- `tausik_verify` for quality gates
- `tausik_memory_add/search` for project memory
- `context7_query-docs` for documentation
- `puppeteer_*` for visual testing
- `git_git_*` for commits and diffs
- `pm_review_run` for PM framework quality

**Failure handling**:
- After 3 failures on the same story → `ralph_block_story(id, reason)` → agent moves to next story
- Blocked stories documented for human intervention
- `ralph_learn("dead_end", ...)` records the failure pattern

---

## Complete Flow Example

```bash
# 1. PLAN a new feature
#    Open Kilo TUI, switch to prd agent
#    > "I want a real-time notification system with WebSockets"
#    [agent asks 5-8 structured questions]
#    → Saved: docs/notifications.md (10 stories)

# 2. EXECUTE the feature
#    Switch to ralph agent
#    > "Execute docs/notifications.md"
#    [agent iterates: US-001 → US-002 → ... → US-010]
#    [each: implement → verify → commit]
#    → All 10 stories done, verified, committed

# 3. AUDIT the implementation
#    Switch to code-reviewer agent
#    > "Review the notifications module for security and performance"
#    [agent deep audits across 8 dimensions]
#    → Saved: docs/review-notifications.md (6 findings)

# 4. FIX findings
#    Switch to ralph agent
#    > "Execute docs/review-notifications.md"
#    [agent fixes P1 and P2 findings, verifies, commits]
#    → <promise>COMPLETE</promise>
```

## PRD File Format

All three agents produce and consume the same format — `docs/<name>.md` with US-XXX user stories:

```markdown
# Feature: <kebab-case-name>

<1-2 paragraph description>

## User Stories

### US-001 — <Short action-oriented title>
**Priority:** 1
**Depends on:** (none)
As a <role>, I want <goal> so that <benefit>.

**Acceptance Criteria:**
- <specific, testable criterion>
- <specific, testable criterion>

### US-002 — <Short title>
**Priority:** 1
**Depends on:** US-001
...
```

| Agent | Creates | Stories represent |
|---|---|---|
| **prd** | `docs/<feature>.md` | Feature requirements |
| **code-reviewer** | `docs/review-<area>.md` | Findings to fix |
| **ralph** | (consumes only) | — |

This means: code-reviewer findings can be fed to ralph for autonomous fixing. The loop is closed.

## Key Principles

1. **No external tools** — everything inside Kilo TUI, agent switching only
2. **No extra commands** — "Execute docs/x.md" is the only syntax to remember
3. **PRD is the universal interface** — plan, audit, and fix all use the same format
4. **MCP offloads state** — the ralph MCP server keeps agent context small (one story at a time)
5. **Every finding is executable** — code-reviewer output is a valid PRD that ralph can run
6. **Stack-agnostic** — works with Node, Rust, Python, Go, Elixir, PHP, PM Framework

## State Files

| File | Created by | Format | Purpose |
|---|---|---|---|
| `docs/<feature>.md` | prd agent | US-XXX stories | Feature specification |
| `docs/review-<area>.md` | code-reviewer | US-XXX stories | Audit findings |
| `.ralph/state.json` | ralph MCP server | JSON | Execution progress, learnings |
| `.ralph/learnings.md` | ralph MCP server | Markdown | Discovered patterns and gotchas |
| `.ralph/COMPLETE` | ralph MCP server | Text (timestamp) | Sentinel: marks PRD as done |
