# Kilocode Fork Playbook — Complete Reference

**Purpose:** This document tells the fork agent EXACTLY what to do. It covers three repos, what to keep, what to port, what to add, and what to remove.

**Date:** 2026-06-22 (all 16 MCP servers now remote daemons)
**Status:** Ready for execution

---

## 1. Three Source Repos

| Repo | URL | License | Role |
|------|-----|---------|------|
| **Kilocode** | `github.com/Kilo-Org/kilocode` | MIT | **BASE** — fork this. 22.7k stars, 23,684 commits, VS Code + JetBrains + CLI + Cloud |
| **MiMo-Code** | `github.com/XiaomiMiMo/MiMo-Code` | MIT | **DONOR** — cherry-pick 6 modules from here (memory, workflow, task, dream/distill, goal judge) |
| **Our Extensions** | `~/.config/kilo/` (this repo) | Private | **LAYER** — port MCP servers, instructions, commands, agents, skills into the fork |

### Claude Code (reference only)
`code.claude.com/docs/` — Anthropic's closed-source CLI. Reference for features that neither Kilo nor MiMo have. Do NOT copy code — only implement equivalent features.

---

## 2. What Kilocode Already Has (DO NOT REBUILD)

These exist in the Kilocode source. They are the reason we fork Kilo, not MiMo.

| Feature | Details |
|---------|---------|
| VS Code extension | Mature, primary surface. Marketplace: `kilocode.Kilo-Code` |
| JetBrains plugin | Native Kotlin (12% of codebase). `packages/kilo-jetbrains/` |
| CLI | `@kilocode/cli` npm package. Native binary compilation (Bun → platform binaries) |
| Cloud Agent | `app.kilo.ai/cloud` — run from browser |
| KiloClaw | Always-on background agent: `app.kilo.ai/claw` |
| Code Reviews | Automated PR reviews: `app.kilo.ai/code-reviews` |
| 500+ models | kilo.ai platform routing, zero markup. Includes DeepSeek, Claude, GPT, Gemini |
| Inline autocomplete | Ghost-text suggestions, tab to accept |
| Self-checking | Agent reviews and corrects its own work |
| Voyage AI embeddings | `voyage-code-3` model for semantic code search |
| LanceDB vector store | Local vector DB for embedding storage |
| LSP integration | Type-aware code intelligence |
| Agent Manager | Worktree-based parallel sessions |
| `kilo run --auto` | Fully autonomous CI/CD mode |
| Built-in agents | Code, Plan, Ask, Debug, Review |
| Compaction | `auto: true, prune: true` context management |
| Speech-to-text | Experimental Whisper integration |
| OpenTelemetry | Experimental observability |
| Plugin system | `@kilocode/kilo-indexing`, `@kilocode/plugin-atomic-chat` |
| SolidJS + OpenTUI | TUI framework |
| Tree-sitter | AST parsing for code understanding |
| Nix support | `flake.nix` for reproducible builds |
| Performance benchmarks | `perf/` directory |
| Session sharing | `/share` command creates public URL via Kilo Cloud tunnel ⚠️ **Requires cloud server** — see note below |
| Specs-driven dev | `specs/` directory |

> ⚠️ **CRITICAL NOTE — Session Sharing requires a NoCowboy Cloud Server**
> The `/share` command and the share button in the sidebar history create a public URL via the Kilo Cloud tunnel (`api.kilo.ai`). In the NoCowboy fork, this fails with `InternalServerError` because the cloud gateway is stubbed (`packages/nocowboy-gateway/src/`). To make sharing work, you need to implement a NoCowboy cloud server with:
> - User accounts & authentication
> - Session URL generation & hosting
> - Public read-only session views
> - Authorization (who can share, who can view)
> - The `POST /session/{sessionID}/share` endpoint returning `{ share: { url: string } }`
> Until this server exists, the share UI elements will show an error toast when clicked. Sessions that were shared before the gateway was removed still have `share?.url` values in the session data and can be copied without the API call.

---

## 3. What to Port FROM MiMo-Code (6 modules)

MiMo-Code is at `github.com/XiaomiMiMo/MiMo-Code`. Its core source is in `packages/opencode/src/`. All modules listed below are MIT-licensed and can be ported.

### 3.1 Memory System (CRITICAL — port first)

**MiMo source:** `packages/opencode/src/memory/`

| File | Purpose |
|------|---------|
| `index.ts` | Main memory module — reads/writes MEMORY.md, checkpoint.md, notes.md |
| `service.ts` | Memory service: auto-checkpoint triggers, budgeted token injection, context reconstruction |
| `fts-query.ts` | SQLite FTS5 query builder for full-text search across memory |
| `fts.sql.ts` | FTS5 table definitions (Drizzle ORM) |
| `paths.ts` | File paths: `MEMORY.md`, `checkpoint.md`, `notes.md`, `tasks/<id>/progress.md` |
| `reconcile.ts` | Reconciliation: merge new learnings, remove outdated entries, deduplicate |

**What it does that our session-memory MCP cannot:**
- **Auto-injects** MEMORY.md at session start (ours requires the agent to call `memory_load`)
- **Auto-checkpoints** when context window pressure is detected (ours has no context awareness)
- **Reconstructs context** after compaction: latest checkpoint + memory + task progress + recent messages (ours loses everything on compaction)
- **Budgeted injection** — token budget controls how much memory enters context, ranked by importance (ours dumps everything or nothing)
- **Scratch notes** (`notes.md`) — temporary working area for agents (we don't have this)
- **Per-task progress** (`tasks/<id>/progress.md`) — task logs survive session boundaries (ours is session-scoped via Tausik)

**Integration point:** Wire into Kilocode's agent loop in `packages/opencode/src/agent/`. The memory service must hook into:
1. Session start → load MEMORY.md + last checkpoint
2. Each turn → check context pressure → maybe checkpoint
3. Compaction → reconstruct from checkpoint instead of blind truncation
4. Session end → save checkpoint

**⚠️ Dependency:** MiMo uses the Effect framework (`effect` npm package). Kilocode may not. Porting may require adapting Effect patterns to Kilo's style (Bun APIs, Drizzle ORM, no Effect).

### 3.2 Workflow Runtime + Compose Mode (HIGH)

**MiMo source:** `packages/opencode/src/workflow/`

| File | Purpose |
|------|---------|
| `builtin/` | Built-in workflow definitions (compose skills: plan, execute, review, TDD, debug, verify, merge) |
| `builtin.ts` | Workflow registry for built-in workflows |
| `runtime.ts` | Workflow execution engine — runs steps, handles dependencies, parallel/sequential |
| `runtime-ref.ts` | Runtime reference tracking |
| `sandbox.ts` | Sandboxed execution for workflow steps |
| `persistence.ts` | Workflow state persistence (resume after crash) |
| `workspace.ts` | Workspace management for workflow isolation |
| `workflow.sql.ts` | SQLite-backed workflow storage (Drizzle ORM) |
| `events.ts` | Workflow lifecycle events |
| `meta.ts` | Workflow metadata |
| `resolve.ts` | Dependency resolution between workflow steps |

**What it does that our orchestrator MCP cannot:**
- **Native runtime** — runs inside the agent loop, not via external `kilo -p` processes
- **Sandbox execution** — isolated execution environment per step
- **Persistence** — workflow state survives crashes and session restarts
- **Built-in compose skills** — full lifecycle: plan → TDD → implement → review → fix → verify → merge
- **Workspace isolation** — each workflow step can have its own working directory

**Integration point:** Add as a new agent mode alongside Code/Plan/Ask/Debug/Review. The compose agent is selected via Tab in the TUI and takes a spec file as input.

### 3.3 Task Tree (MEDIUM)

**MiMo source:** `packages/opencode/src/task/`

| File | Purpose |
|------|---------|
| `index.ts` | Task module main |
| `schema.ts` | Task schema — hierarchical IDs: T1, T1.1, T1.2, T1.1.1 |
| `task.sql.ts` | SQLite-backed task storage (Drizzle ORM) |
| `registry.ts` | Task registry — tracks active/completed/blocked tasks |
| `gate.ts` | Quality gates per task |
| `gate-state.ts` | Gate state management |
| `events.ts` | Task lifecycle events |

**NOTE:** Our Tausik MCP is RICHER than MiMo's task system (70+ tools, epics/stories/tasks, memory graph, QA gates, sessions, roles, stacks, decisions, explorations). Port MiMo's task tree ID format (T1/T1.1) but keep Tausik as primary project management. Bridge: Tausik task slugs map to MiMo's T-IDs for checkpoint integration.

### 3.4 Dream Command (HIGH — unique feature)

**MiMo source:** Built-in command (exact path TBD — check `packages/opencode/src/command/`)

**What it does:**
1. Scans recent session traces
2. For each session, extracts: build commands, architecture patterns, debugging insights, user preferences, gotchas, dead ends
3. Writes extracted knowledge to `MEMORY.md`
4. Removes entries contradicted by newer learnings
5. Deduplicates

**Neither Claude Code nor Kilocode has this.** It's a competitive advantage.

### 3.5 Distill Command (HIGH — unique feature)

**MiMo source:** Built-in command (exact path TBD)

**What it does:**
1. Scans recent session traces
2. Identifies repeated manual workflows (e.g., "user always runs lint → test → commit")
3. Packages high-confidence patterns into reusable skills, commands, or subagents
4. Presents candidates to user for approval before saving

**Neither Claude Code nor Kilocode has this.** Self-improving agent.

### 3.6 Goal Judge (MEDIUM)

**MiMo source:** `packages/opencode/src/agent/agent.ts` (stop condition evaluation)

**What it does:**
- When the agent reports a goal is met, an independent judge model evaluates the evidence
- Judge checks: "Is this goal TRULY satisfied? Be skeptical. Check edge cases."
- If judge says FAIL → agent continues working
- If judge says PASS → agent stops
- Prevents premature "optimistic stops" during autonomous work

**Integration point:** Modify the agent stop logic in Kilocode's agent loop.

---

## 4. What to Port FROM Our Extensions (~/.config/kilo/)

### 4.1 MCP Servers — KEEP these (no MiMo equivalent)

| Server | Port | Tools | LOC | Purpose |
|--------|------|-------|-----|---------|
| **tausik** | :8204 (remote) | 70+ | external | Project management: epics/stories/tasks, memory graph, QA gates, sessions, roles, stacks, decisions, explorations, dead ends, verify, audit |
| **constitution** | :8216 (remote) | 4 | 51 | AST-based code quality rules: check_file, check_project, list_rules, status |
| **score-engine** | :8219 (remote) | 4 | 90 | NoCowboy quality scoring: score_compute, score_breakdown, score_badge, score_history |
| **contract-guard** | :8218 (remote) | 2 | 87 | API contract breaking-change detection: contract_check, contract_status |
| **ncp-validator** | :8217 (remote) | 3 | 112 | NCP spec validation: ncp_validate, ncp_list, ncp_diff |
| **ralph** | :8210 (remote) | 8 | 43 | PRD state machine: load_prd, next_story, verify_story, block_story, learn, status, complete, detect_stack |
| **puppetmaster** | :8203 (remote) | 26 | 50 | PM framework operations: pm_dev, pm_build, pm_deploy, pm_config_*, pm_db_*, pm_lint, pm_test, pm_review_*, pm_contribute_*, pm_knowledge |
| **context7** | :8200 (remote) | 2 | external | Version-specific docs for 20K+ libraries |
| **sqlite** | :8201 (remote) | 5 | external | Direct SQLite database access |
| **puppeteer** | :8202 (remote) | 15+ | external | Browser automation |
| **git** | :8205 (remote) | 10+ | external | Structured git operations |

**Registration:** These connect via `kilo.json` MCP config section. All 16 servers run as systemd user services behind `mcp-proxy` HTTP endpoints (ports 8200-8219).

**Infrastructure:** See `~/.config/kilo/systemd/` for 16 systemd service files.

### 4.2 MCP Servers — REMOVE these (replaced by native MiMo features)

These currently run as remote daemons (ports 8211-8215, pre-built to JS, zero tsx overhead) but should be removed from the fork:

| Server (current port) | Replaced By | Reason |
|-----------------------|-------------|--------|
| **session-memory** (:8211) | MiMo `src/memory/` | Native memory is auto-injected, has checkpoints, budgeted injection. Our file-based MCP requires agent to manually call tools. |
| **orchestrator** (:8213) | MiMo `src/workflow/` | Native workflow has sandbox, persistence, compose skills. Our MCP spawns blind `kilo -p` processes. |
| **team-coordinator** (:8215) | MiMo `src/team/` or Kilo Agent Manager | Native team coordination or Kilo's worktree-based parallel sessions are superior. |
| **plugin-registry** (:8214) | Kilo's native plugin system + MCP marketplace | Kilo already has a plugin system and marketplace. |
| **hooks** (:8212) — **PARTIALLY KEEP** | Keep for channels tools (`channels_post`, `channels_read`, `channels_listen`). Hook tools (`hooks_register`, `hooks_fire`, etc.) are redundant if Kilo gets native hooks. |

### 4.3 Instructions — KEEP ALL (13 files + 3 rules)

| File | Purpose | Lines |
|------|---------|-------|
| `engineering-rules.md` | Git, code quality, security, i18n, error handling rules. **CRITICAL** — contains anti-suppression rules, no-workarounds rules, sudo policy. | ~200 |
| `no-shortcuts.md` | 10 behavioral rules: fix root cause, no excuses, complete implementations, no workarounds, no scope reduction, no lazy patterns, verification, honesty, accountability, severity≠hack license | ~300 |
| `cybersecurity.md` | OWASP Top 10 mapping, security headers, CSRF, rate limiting, input validation, CSP, encryption | ~300 |
| `russian-law.md` | 152-FZ personal data, GDPR mapping, cookie law, Roskomnadzor compliance, consent templates | ~400 |
| `repo-map.md` | Aider-style repo survey protocol: Phase 1 (structure), Phase 2 (module map), Phase 3 (plan) | ~80 |
| `aider-features.md` | Atomic changes, auto-commit, conventional commits, lint-on-edit, git-integrated workflow | ~120 |
| `structured-output.md` | JSON output format for CI/CD, headless CLI, pipe-friendly responses | ~80 |
| `auto-memory.md` | Cross-session knowledge: session start load, auto-save discoveries, session end consolidate | ~80 |
| `hooks-system.md` | Hook events, registration, types (command/http/mcp_tool), firing conventions | ~50 |
| `channels.md` | Push events from CI/alerts/chat into sessions via webhook | ~60 |
| `multi-provider.md` | LiteLLM proxy setup for multi-provider (redundant after fork — Kilo has 500+ models natively) | ~80 |
| `path-rules-loader.md` | Path-scoped rules with YAML frontmatter `paths:` globs | ~55 |
| `sandbox.md` | Sandbox execution: Docker, firejail, permission rules | ~40 |
| `rules/api-patterns.md` | API rules: Zod validation, error format, CSRF, rate limiting, pagination | ~18 |
| `rules/database.md` | DB rules: no raw SQL, parameterized queries, indexes, migrations, transactions | ~24 |
| `rules/frontend.md` | Frontend rules: component library, states, a11y, semantic HTML, lazy loading | ~24 |

**Post-fork cleanup:** Remove `multi-provider.md` (Kilo has native 500+ models). Keep `auto-memory.md` but update it to reference the native memory system instead of the session-memory MCP.

### 4.4 Commands — KEEP ALL (16 files)

| Command | Description | Post-Fork Notes |
|---------|-------------|-----------------|
| `/plan` | Design task with architect agent, save to docs/plans/ | Keep as-is |
| `/act` | Execute the most recent plan | Keep as-is |
| `/commit` | Conventional commit with quality check | Keep as-is |
| `/diff` | Show working tree changes | Keep as-is |
| `/repomap` | Aider-style module map | Keep as-is |
| `/lintcheck` | Lint + typecheck + tests | Keep as-is |
| `/checkpoint` | Git tag save point | Keep — supplement MiMo's auto-checkpoints |
| `/restore` | Restore to checkpoint | Keep |
| `/uncheckpoint` | Revert to latest checkpoint | Keep |
| `/undo` | Revert last AI change | Keep |
| `/json` | Structured JSON output | Keep |
| `/memory` | Browse/search project memory | Update to use native memory instead of session-memory MCP |
| `/goal` | Keep working until condition met | Update to use MiMo's goal judge |
| `/init` | Generate AGENTS.md from codebase analysis | Keep as-is |
| `/bg` | Start background agent via tmux | Keep — supplement Kilo's Agent Manager |
| `/schedule` | Schedule recurring tasks via cron | Keep as-is |

**Add from MiMo (new commands):**
| Command | Description |
|---------|-------------|
| `/dream` | Scan session traces → extract knowledge → update MEMORY.md |
| `/distill` | Discover repeated workflows → generate skills/commands |

### 4.5 Agents — KEEP ALL (5 file-based + 1 inline)

| Agent | File | Steps | Purpose |
|-------|------|-------|---------|
| **architect** | Inline in kilo.json | N/A | ADRs, C4 modeling, ISO 25010 evaluation. Read-only + docs edit. |
| **prd** | `.kilo/agents/prd.md` | 30 | PRD interview: Discovery → Scope → Constraints → Output. Outputs `docs/<name>.md` with US-XXX stories. |
| **ralph** | `.kilo/agents/ralph.md` | 200 | PRD execution engine: load → next → implement → verify → commit → repeat. Never stops until done. |
| **code-reviewer** | `.kilo/agents/code-reviewer.md` | 80 | 8-dimension deep audit: Architecture, Security, Quality, Performance, Deps, Testing, Config, Conventions. Outputs `docs/review-<name>.md`. |
| **explore** | `.kilo/agents/explore.md` | 20 | Fast read-only codebase exploration. Cannot write/edit. |
| **plan** | `.kilo/agents/plan.md` | 25 | Planning research: gather context, propose plans with files/deps/risks/criteria. |

**NOTE:** Kilo already has Code, Plan, Ask, Debug, Review agents built in. Our agents (prd, ralph, code-reviewer, architect) are ADDITIVE — they serve different purposes (PRD interview, iterative execution, deep audit, architecture). Register them as custom agents in the fork.

### 4.6 Skills — KEEP ALL (8 skills)

| Skill | Location | Purpose |
|-------|----------|---------|
| `frontend-design` | `~/.kilo/skills/` | Anthropic's production-grade frontend UI design skill |
| `web-design-guidelines` | `~/.kilo/skills/` | Vercel's Web Interface Guidelines review skill |
| `memory-manager` | `~/.kilo/skills/` | Cross-session memory save/consolidate/archive |
| `skill-evaluator` | `~/.kilo/skills/` | Test cases + evaluation for skills |
| `ralph-tui-prd` | `~/.kilocode/skills/` | PRD generator for ralph-tui |
| `ralph-tui-create-json` | `~/.kilocode/skills/` | PRD → JSON converter |
| `ralph-tui-create-beads` | `~/.kilocode/skills/` | PRD → Beads converter |
| `ralph-tui-create-beads-rust` | `~/.kilocode/skills/` | PRD → Beads-Rust converter |

### 4.7 Shell Wrappers — KEEP USEFUL ONES

| Wrapper | Keep? | Reason |
|---------|-------|--------|
| `kilo-bg` | ✅ Keep | Background agents via tmux — supplements Agent Manager |
| `kilo-view` | ✅ Keep | Dashboard for background agents |
| `kilo-schedule` | ✅ Keep | Cron-based scheduled tasks |
| `kilo-sandbox` | ✅ Keep | Docker/firejail isolation |
| `kilo-prd` | ✅ Keep | PRD workflow wrapper |
| `kilo-ralph` | ✅ Keep | Ralph execution wrapper |
| `kilo-channel-webhook` | ✅ Keep | HTTP → channel inbox bridge |
| `kilo-proxy` | ❌ Remove | Replaced by Kilo's native 500+ model routing |

---

## 5. Claude Code Features to ADD (neither Kilo nor MiMo have these)

These are features from Claude Code that would be valuable in the fork. Implement from scratch (do NOT copy Anthropic code — reference-only).

| Feature | Claude Code Doc | Priority | Description |
|---------|----------------|----------|-------------|
| **Ultraplan** | `code.claude.com/docs/en/ultraplan.md` | HIGH | Plan in cloud, draft on web, execute in terminal |
| **Ultrareview** | `code.claude.com/docs/en/ultrareview.md` | HIGH | Deep multi-agent code review in cloud |
| **Routines** | `code.claude.com/docs/en/routines.md` | MEDIUM | Scheduled recurring tasks on cloud infrastructure (vs our cron-based `kilo-schedule`) |
| **Remote Control** | `code.claude.com/docs/en/remote-control.md` | MEDIUM | Continue local session from phone/browser |
| **Channels (native)** | `code.claude.com/docs/en/channels.md` | MEDIUM | Push events into sessions from CI/chat/alerts (we have MCP version — make native) |
| **Deep Links** | `code.claude.com/docs/en/deep-links.md` | LOW | `kilo-cli://` URL scheme for runbooks/alerts |
| **Artifacts** | `code.claude.com/docs/en/artifacts.md` | LOW | Share live interactive pages at private URLs |
| **Statusline** | `code.claude.com/docs/en/statusline.md` | LOW | Custom status bar showing context/costs/git |
| **Worktrees** | `code.claude.com/docs/en/worktrees.md` | LOW | Git worktree isolation for parallel sessions (Kilo has Agent Manager — similar) |

---

## 6. Quality Comparison: Our Extensions vs MiMo (WHICH IS BETTER)

For each feature that overlaps between our extensions and MiMo's native implementation, this table shows which is better and what the fork agent should do.

| Feature | Our Implementation | MiMo Implementation | Which is Better | Fork Action |
|---------|-------------------|---------------------|-----------------|-------------|
| **Memory** | session-memory MCP (file-based, 237 LOC, 5 tools) | Native SQLite FTS5 (6 files, auto-inject, checkpoints, budgeted injection, reconciliation) | **MiMo is FAR better** — auto-inject, checkpoints, context reconstruction | **USE MIMO's.** Remove our session-memory MCP. |
| **Task management** | Tausik MCP (70+ tools, epics/stories/tasks, memory graph, QA gates, sessions, roles) | Native task tree (7 files, T1/T1.1 IDs, SQLite, gates) | **OURS is FAR better** — Tausik is vastly richer | **KEEP OURS.** Port MiMo's T-ID format only. |
| **Workflow/Orchestration** | orchestrator MCP (214 LOC, spawns `kilo -p` processes) | Native workflow runtime (10 files, sandbox, persistence, compose skills) | **MiMo is FAR better** — native runtime, sandbox, persistence | **USE MIMO's.** Remove our orchestrator MCP. |
| **Team coordination** | team-coordinator MCP (197 LOC, file-based inbox, tmux spawn) | Native `src/team/` | **MiMo is better** — native team with shared context | **USE MIMO's.** Remove our team-coordinator MCP. |
| **Hooks** | hooks MCP (341 LOC, 5 events, command/http/mcp_tool handlers + channels) | No separate hooks system (hooks are in agent loop) | **OURS is more flexible** for custom automation | **KEEP channels tools.** Remove hook tools if Kilo gets native hooks. |
| **Plugin system** | plugin-registry MCP (155 LOC, search/install/remove) | Native plugin system via `.mimocode/plugins/` | **Kilo's native is better** — Kilo has MCP marketplace | **REMOVE ours.** Use Kilo's native. |
| **Goal mode** | `/goal` command (instructions-based, agent self-evaluates) | Native goal judge (independent model evaluates) | **MiMo is better** — independent judge prevents false positives | **USE MIMO's.** Update our `/goal` command to use judge. |
| **Background agents** | kilo-bg/kilo-view (tmux wrappers) | Native `src/actor/` (lifecycle, cancel, background) | **MiMo's native is better** for subagents. Our tmux approach is better for full sessions. | **KEEP BOTH.** Native actors for subagents, tmux wrappers for full background sessions. |
| **Channels** | hooks MCP channels_post/read/listen (file-based inbox + HTTP webhook) | Native `src/inbox/` | **Similar** — both file-based. MiMo's is native. | **PORT MIMO's inbox.** Keep our webhook bridge as supplement. |
| **Code quality rules** | Constitution MCP (AST-based rules, 4 tools) | Nothing | **OURS is unique** — no equivalent anywhere | **KEEP.** |
| **Quality scoring** | Score Engine MCP (NoCowboy scoring, 4 tools) | Nothing | **OURS is unique** | **KEEP.** |
| **PRD execution** | Ralph MCP + agent (load/next/verify/block/learn/commit loop) | Compose mode (plan→execute→review→TDD→debug→verify→merge) | **Different approaches, both valuable** | **KEEP BOTH.** Ralph for PRD-driven work, Compose for spec-driven work. |
| **Self-improvement** | None | `/dream` (extract knowledge) + `/distill` (discover workflows → create skills) | **MiMo is unique** | **PORT MIMO's.** |
| **Multi-provider** | kilo-proxy (LiteLLM wrapper) | 16+ AI SDK providers native | **Kilo's 500+ models is best** — supersedes both | **REMOVE kilo-proxy.** Use Kilo's native. |
| **Semantic search** | Kilo's Voyage AI + LanceDB (native) | MiMo's tree-sitter only (no embeddings) | **KILO is FAR better** | **KEEP KILO's.** |

---

## 7. Execution Steps (Ordered)

### Step 1: Fork Kilocode
```bash
git clone https://github.com/Kilo-Org/kilocode.git our-fork
cd our-fork
bun install
bun run dev  # verify it works
```

### Step 2: Clone MiMo-Code as reference
```bash
git clone https://github.com/XiaomiMiMo/MiMo-Code.git /tmp/mimo-reference
# DO NOT merge repos. Cherry-pick files only.
```

### Step 3: Port MiMo Memory System
1. Copy `MiMo-Code/packages/opencode/src/memory/` → `our-fork/packages/opencode/src/memory/`
2. Adapt Effect framework patterns to Kilo's style (Bun APIs, no Effect)
3. Add SQLite migration for FTS5 tables in `our-fork/packages/opencode/migration/`
4. Wire into agent loop: `packages/opencode/src/agent/agent.ts`
   - Session start → `Memory.load(projectPath)`
   - Each turn → `Memory.checkPressure(contextTokens)` → maybe checkpoint
   - Compaction → `Memory.reconstruct(checkpoint, memory, recentMessages)`
   - Session end → `Memory.checkpoint()`
5. Add `MEMORY.md`, `checkpoint.md`, `notes.md` paths to project data dir
6. Test: start session → make discoveries → end session → start new session → verify memory persists

### Step 4: Port MiMo Workflow + Compose
1. Copy `MiMo-Code/packages/opencode/src/workflow/` → `our-fork/packages/opencode/src/workflow/`
2. Adapt Effect patterns
3. Register `compose` as a new agent mode in agent config
4. Add Tab-switching support in TUI for compose mode
5. Test: `/compose specs/feature.md` → runs plan→TDD→implement→review→fix→verify→merge

### Step 5: Port MiMo Task Tree
1. Copy `MiMo-Code/packages/opencode/src/task/` → `our-fork/packages/opencode/src/task/`
2. Adapt to Kilo's DB schema
3. Bridge: Tausik task slugs ↔ MiMo T-IDs for checkpoint integration
4. Test: create task tree T1→T1.1→T1.2, verify progress persists across sessions

### Step 6: Port Dream/Distill Commands
1. Find command implementations in `MiMo-Code/packages/opencode/src/command/` or `src/cli/`
2. Port `/dream` — session trace analysis → memory extraction → MEMORY.md update
3. Port `/distill` — workflow pattern discovery → skill/command/agent generation
4. Test: run 3+ sessions → `/dream` → verify MEMORY.md has accurate entries
5. Test: run 5+ sessions with repeated patterns → `/distill` → verify it proposes a skill

### Step 7: Port Goal Judge
1. Find stop-condition logic in `MiMo-Code/packages/opencode/src/agent/agent.ts`
2. Modify Kilo's agent stop logic: when agent claims done, spawn judge subagent
3. Judge model configurable (same model or different)
4. Test: `/goal "all tests pass"` → agent claims done with failing test → judge rejects → agent continues

### Step 8: Register Our MCP Servers
1. Copy MCP server sources from `~/.config/kilo/mcp-servers/` to fork's config
2. Register in fork's config format (same as kilo.json `mcp` section):
   - Remote (existing): tausik (:8204), puppetmaster (:8203), context7 (:8200), sqlite (:8201), puppeteer (:8202), git (:8205)
   - Remote (systemd/mcp-proxy): ralph (:8210), constitution (:8216), ncp-validator (:8217), contract-guard (:8218), score-engine (:8219)
   - **DO NOT register:** session-memory (:8211), hooks (:8212), orchestrator (:8213), plugin-registry (:8214), team-coordinator (:8215)
5. Test: all MCP servers connect and respond to `tools/list`

### Step 9: Port Instructions, Commands, Agents, Skills
1. Copy `instructions/*.md` + `instructions/rules/*.md` → fork's instructions dir
2. Remove `multi-provider.md` (native 500+ models makes it redundant)
3. Update `auto-memory.md` to reference native memory system instead of session-memory MCP
4. Copy `commands/*.md` → fork's commands dir
5. Update `/memory` command to use native memory tools
6. Update `/goal` command to reference goal judge
7. Copy `.kilo/agents/*.md` → fork's agents dir
8. Register agents in fork's config: architect (inline), prd, ralph, code-reviewer, explore, plan
9. Copy skills from `~/.kilo/skills/` and `~/.kilocode/skills/` → fork's skills dir
10. Copy shell wrappers from `~/.local/bin/kilo-*` (except kilo-proxy)

### Step 10: Build and Verify
```bash
bun run build                    # compile native binaries
bun run dev                      # test in dev mode
bun turbo typecheck              # type check
bun test                         # run tests
```

Verify:
- [ ] CLI starts and responds
- [ ] VS Code extension loads
- [ ] Memory persists across sessions (start → discover → end → restart → memory loaded)
- [ ] Checkpoints created on context pressure
- [ ] Context reconstructed after compaction
- [ ] Dream extracts knowledge correctly
- [ ] Distill proposes workflow patterns
- [ ] Goal judge prevents premature stops
- [ ] Compose mode runs full lifecycle
- [ ] All MCP servers connect (tausik, constitution, score-engine, etc.)
- [ ] All 16 commands work
- [ ] All 6 agents work
- [ ] All 8 skills load
- [ ] 500+ models route correctly
- [ ] Voyage AI embeddings + LanceDB semantic search work
- [ ] Inline autocomplete works
- [ ] `kilo run --auto` works
- [ ] kilo-bg background sessions work
- [ ] kilo-schedule cron tasks work

---

## 8. File Locations Reference

### This Repo (~/.config/kilo/)
```
instructions/           → 13 instruction files + 3 rules
commands/               → 16 slash commands
.kilo/agents/           → 5 agent definitions (+ architect inline in kilo.json)
mcp-servers/            → 11 MCP server source directories
  constitution/         → AST code rules (51 LOC) — remote :8216 (systemd/mcp-proxy)
  contract-guard/       → API contract check (87 LOC) — remote :8218
  hooks/                → Hooks + channels (341 LOC) — remote :8212 — REMOVE after fork
  ncp-validator/        → NCP spec validation (112 LOC) — remote :8217
  orchestrator/         → Workflow orchestrator (214 LOC) — remote :8213 — REMOVE after fork
  plugin-registry/      → Plugin marketplace (155 LOC) — remote :8214 — REMOVE after fork
  puppetmaster/         → PM framework ops (50 LOC) — remote :8203
  ralph/                → PRD state machine (43 LOC) — remote :8210
  score-engine/         → NoCowboy scoring (90 LOC) — remote :8219
  session-memory/       → Session memory (237 LOC) — remote :8211 — REMOVE after fork
  team-coordinator/     → Team coordination (197 LOC) — remote :8215 — REMOVE after fork
systemd/                → 16 systemd service files (ports 8200-8205, 8210-8219)
scripts/                → Setup scripts
kilo.json               → Main config (16 MCPs: all remote; 6 agents, 2 instruction globs, 3 plugins)
kilo.example.json       → Template without secrets
```

### MiMo-Code (github.com/XiaomiMiMo/MiMo-Code)
```
packages/opencode/src/
  memory/               → 6 files: FTS5 memory, checkpoints, reconciliation
  workflow/             → 10 files: compose runtime, sandbox, persistence
  task/                 → 7 files: task tree, gates, registry
  agent/                → agent loop (goal judge stop logic)
  actor/                → subagent lifecycle
  team/                 → team coordination
  inbox/                → message inbox
  command/              → built-in commands (dream, distill)
```

### Kilocode (github.com/Kilo-Org/kilocode)
```
packages/
  opencode/             → Core CLI source (TypeScript/Bun)
  kilo-jetbrains/       → JetBrains plugin (Kotlin)
bin/                    → CLI entry point
specs/                  → Specs-driven development
perf/                   → Performance benchmarks
.kilo/                  → Project-level config
.kilocode/skills/       → Built-in skills
```
