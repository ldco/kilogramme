# Claude Code Feature Parity for Kilo

**Status:** Implemented (Phases 1-5)
**Date:** 2026-06-19
**Author:** Kilo Architect Agent

---

## Context

Claude Code (Anthropic's CLI) has grown into a full-featured agentic coding platform with 30+ capabilities beyond what Kilo currently offers. This plan identifies which capabilities matter, which we can implement via Kilo's extension points (MCP servers, skills, commands, agents, instructions), and which require upstream CLI changes.

### Constraint: Kilo CLI is a compiled binary

We cannot modify the core CLI (`@kilocode/cli`). All implementations must use:
- `kilo.json` config (MCPs, agents, plugins, permissions, indexing)
- `instructions/*.md` (system-level prompts)
- `commands/*.md` (slash commands)
- `.kilo/agents/*.md` (agent definitions)
- `~/.kilo/skills/*/SKILL.md` (on-demand skills)
- `mcp-servers/*/` (custom MCP servers in TypeScript)
- Shell wrappers in `~/.local/bin/`

---

## Tier 1 — Implement NOW via existing extension points

### 1.1 Auto Memory (HIGH PRIORITY)

**What Claude Code has:** Claude auto-saves learnings (build commands, debugging insights, preferences) to `~/.claude/projects/<project>/memory/MEMORY.md`. First 200 lines loaded every session.

**What we have:** Tausik MCP has `memory_add`, `memory_list`, `memory_search` — but it's manual. No auto-save, no per-session injection.

**Implementation:**
- New instruction file `instructions/auto-memory.md` that tells the agent to:
  1. At session start: read `~/.kilo/memory/<project>/MEMORY.md` (via Tausik or direct Read)
  2. After each significant discovery: call `tausik_memory_add` with learnings
  3. At session end: consolidate into `MEMORY.md`
- New command `commands/memory.md` → `/memory` to browse/edit memory files
- New skill `~/.kilo/skills/memory-manager/SKILL.md` for the auto-save logic
- Modify `kilo.json` instructions glob to include the new instruction

**Effort:** Light — instructions + 1 command + 1 skill

---

### 1.2 Goal Mode (MEDIUM PRIORITY)

**What Claude Code has:** `/goal` keeps Claude working across turns until a condition holds.

**What we have:** Nothing equivalent.

**Implementation:**
- New command `commands/goal.md` → `/goal <condition>`
- The command instructs the agent to keep working until the condition is verified
- Uses existing tools to verify (run tests, lint, check output)
- Agent loops internally, reporting progress

**Effort:** Trivial — 1 command file

---

### 1.3 Enhanced Subagents with Memory (MEDIUM PRIORITY)

**What Claude Code has:** Custom subagents with persistent memory directories, preloaded skills, isolation modes, nested subagents, hooks.

**What we have:** 4 agents (architect, prd, ralph, code-reviewer), no persistent memory per agent, no isolation.

**Implementation:**
- Add `memory` concept to agent definitions: each agent gets a memory dir `~/.kilo/agent-memory/<name>/MEMORY.md`
- New agents to match Claude Code's built-in set:
  - `.kilo/agents/explore.md` — fast read-only codebase exploration (like CC's Explore)
  - `.kilo/agents/plan.md` — research agent for planning (like CC's Plan)
- Update existing agents to include memory instructions in their prompts
- Add skill preloading instructions in agent prompts

**Effort:** Moderate — 2 new agents + memory convention in prompts

---

### 1.4 Path-Scoped Rules (MEDIUM PRIORITY)

**What Claude Code has:** `.claude/rules/*.md` with `paths:` frontmatter that scopes rules to specific file patterns.

**What we have:** 7 global instruction files, no path scoping.

**Implementation:**
- New directory `instructions/rules/` with per-topic rules
- New instruction `instructions/path-rules-loader.md` that tells the agent to check for path-scoped rules when working in specific areas
- Rules format: YAML frontmatter with `paths:` glob patterns, markdown body
- Example: `instructions/rules/api-security.md` with `paths: ["server/**/*.ts"]`

**Effort:** Light — directory convention + 1 loader instruction

---

### 1.5 Skill Evaluation (LOW PRIORITY)

**What Claude Code has:** `skill-creator` plugin that runs evals — test cases, isolated runs, grading, benchmarking.

**What we have:** Skills exist but no eval framework.

**Implementation:**
- New skill `~/.kilo/skills/skill-evaluator/SKILL.md` that:
  1. Takes a skill name as argument
  2. Creates test cases in `<skill>/evals/evals.json`
  3. Runs each case via subagent
  4. Grades results
  5. Reports pass rate

**Effort:** Moderate — 1 complex skill

---

### 1.6 Init Command Enhancement (LOW PRIORITY)

**What Claude Code has:** `/init` generates CLAUDE.md by analyzing codebase, suggests improvements.

**What we have:** No `/init` equivalent.

**Implementation:**
- New command `commands/init.md` → `/init`
- Analyzes project: package.json, README, directory structure, test framework, linter config
- Generates/updates AGENTS.md with build commands, conventions, architecture notes
- If AGENTS.md exists, suggests improvements

**Effort:** Light — 1 command file

---

## Tier 2 — Implement with NEW MCP servers

### 2.1 Session Memory MCP (HIGH PRIORITY)

**What Claude Code has:** Auto memory that persists across sessions, topic files, MEMORY.md index.

**What we have:** Tausik has memory, but it's a general project management tool.

**Implementation:**
- New MCP server `mcp-servers/session-memory/` with tools:
  - `memory_load_project(project_path)` → returns MEMORY.md content (first 200 lines)
  - `memory_save(project_path, topic, content)` → saves to topic file
  - `memory_consolidate(project_path)` → updates MEMORY.md index
  - `memory_list_topics(project_path)` → lists available topic files
  - `memory_search(project_path, query)` → FTS across all memory files
- Storage: `~/.kilo/memory/<project-slug>/` with `MEMORY.md` + topic files
- Register in `kilo.json` as local stdio server

**Effort:** Moderate — 1 new MCP server (~200 LOC TypeScript)

---

### 2.2 Hooks MCP (HIGH PRIORITY)

**What Claude Code has:** 30+ hook events (PreToolUse, PostToolUse, SessionStart, Stop, etc.) with 5 handler types (command, http, mcp_tool, prompt, agent).

**What we have:** Constitution MCP checks files against rules, but no general hook system.

**Implementation:**
- New MCP server `mcp-servers/hooks/` with tools:
  - `hooks_register(event, matcher, handler)` → register a hook
  - `hooks_fire(event, context)` → fire all hooks for an event
  - `hooks_list()` → list registered hooks
  - `hooks_remove(id)` → remove a hook
- Config file `.kilo/hooks.json` for persistent hook definitions
- Supported events: `PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd`, `Stop`, `FileChanged`
- Handler types: `command` (shell), `http` (webhook), `mcp_tool` (call another MCP)
- New instruction `instructions/hooks-system.md` telling the agent to fire hooks at appropriate points

**Effort:** Substantial — 1 new MCP server (~500 LOC) + instruction + config format

---

### 2.3 Workflow Orchestrator MCP (MEDIUM PRIORITY)

**What Claude Code has:** Dynamic workflows that orchestrate many subagents from auto-generated scripts.

**What we have:** Ralph executes PRD stories sequentially. No parallel orchestration.

**Implementation:**
- New MCP server `mcp-servers/orchestrator/` with tools:
  - `workflow_create(name, steps[])` → define a workflow with parallel/sequential steps
  - `workflow_run(name)` → execute workflow, spawning subagents
  - `workflow_status(name)` → check progress
  - `workflow_cancel(name)` → abort
- Each step can specify: agent type, task description, dependencies, timeout
- Results collected and returned to caller
- Uses `child_process` to spawn separate `kilo -p` instances

**Effort:** Substantial — 1 new MCP server (~600 LOC)

---

### 2.4 Plugin Registry MCP (LOW PRIORITY)

**What Claude Code has:** Full plugin marketplace with discover/install/share.

**What we have:** 3 plugins in kilo.json, no marketplace.

**Implementation:**
- New MCP server `mcp-servers/plugin-registry/` with tools:
  - `plugin_search(query)` → search available skills/MCP servers
  - `plugin_install(name)` → install a skill or MCP server
  - `plugin_list()` → list installed plugins
  - `plugin_remove(name)` → uninstall
- Registry: JSON index file at a URL (GitHub raw) listing available extensions
- Install = clone skill/MCP to appropriate directory + update kilo.json

**Effort:** Moderate — 1 new MCP server (~300 LOC) + registry format

---

## Tier 3 — Implement with external tooling

### 3.1 Background Agents / Agent View (HIGH PRIORITY)

**What Claude Code has:** Background agents, agent view dashboard managing multiple sessions.

**What we have:** Single foreground session.

**Implementation:**
- Shell wrapper `~/.local/bin/kilo-bg` that:
  1. Starts `kilo -p "<task>"` in a tmux pane
  2. Captures output to `~/.kilo/sessions/<id>/transcript.log`
  3. Supports: `kilo-bg start "<task>"`, `kilo-bg list`, `kilo-bg logs <id>`, `kilo-bg stop <id>`
- Shell wrapper `~/.local/bin/kilo-view` that:
  1. Opens a tmux session with a dashboard layout
  2. Shows all running background agents
  3. Allows switching between them
- New command `commands/bg.md` → `/bg <task>` to start a background agent from within Kilo

**Effort:** Moderate — 2 shell scripts + 1 command

---

### 3.2 Routines / Scheduled Tasks (MEDIUM PRIORITY)

**What Claude Code has:** Scheduled recurring tasks on cloud infrastructure + local scheduled tasks.

**What we have:** Nothing.

**Implementation:**
- Shell wrapper `~/.local/bin/kilo-schedule` that:
  1. Creates a cron job running `kilo -p "<task>"`
  2. Manages schedules: `kilo-schedule add "0 9 * * *" "review PRs"`, `kilo-schedule list`, `kilo-schedule remove <id>`
  3. Logs output to `~/.kilo/schedules/<id>/`
- New command `commands/schedule.md` → `/schedule` to manage from within Kilo

**Effort:** Light — 1 shell script + 1 command

---

### 3.3 Sandbox Environments (MEDIUM PRIORITY)

**What Claude Code has:** Sandboxed Bash tool, dev containers, Docker, VM isolation.

**What we have:** Permission rules in kilo.json (regex-based allow/deny).

**Implementation:**
- New instruction `instructions/sandbox.md` with rules for safe execution
- Shell wrapper that runs commands in `firejail` or Docker:
  - `~/.local/bin/kilo-sandbox` — wraps kilo with firejail/Docker isolation
- Enhanced permission rules in kilo.json for common destructive patterns

**Effort:** Moderate — 1 instruction + 1 shell wrapper + permission rules

---

### 3.4 Agent Teams (LOW PRIORITY)

**What Claude Code has:** Multiple Claude Code instances coordinated as a team with shared tasks, inter-agent messaging.

**What we have:** Nothing.

**Implementation:**
- Use tmux + shared filesystem for coordination
- New MCP server `mcp-servers/team-coordinator/` with tools:
  - `team_create(name, agents[])` → spawn multiple kilo instances in tmux
  - `team_send(agent_id, message)` → write to agent's inbox file
  - `team_receive(agent_id)` → read from agent's inbox
  - `team_status()` → check all agents
- Coordination via file-based message queues in `/tmp/kilo-team-<id>/`

**Effort:** Substantial — 1 MCP server + shell orchestration

---

## Tier 4 — Requires upstream CLI changes (feature requests)

These cannot be implemented via extension points. File as feature requests to `github.com/Kilo-Org/kilocode`:

| Feature | Claude Code Equivalent | Priority | Notes |
|---------|----------------------|----------|-------|
| **VS Code extension** | VS Code surface | HIGH | Kilo is terminal-only; IDE integration is the #1 gap |
| **Voice dictation** | Whisper-based speech input | MEDIUM | Already experimental in kilo.json (`speech_to_text.enabled`) |
| **Remote Control** | Continue session from phone/browser | MEDIUM | Requires web server component in CLI |
| **Teleport** | Move sessions between surfaces | LOW | Requires session persistence protocol |
| **Native prompt caching** | Automatic cache management | MEDIUM | Requires API-level optimization in CLI |
| **Channels** | Push events into sessions | LOW | Requires CLI event loop integration |
| **Computer Use** | Screen interaction | LOW | Puppeteer MCP partially covers this for web |
| **Agent SDK** | Programmatic Python/TS SDK | LOW | kilo -p covers basic headless use |
| **Provider support** | Bedrock, Vertex, Foundry | MEDIUM | Currently Anthropic API only |
| **Fullscreen rendering** | Flicker-free TUI | LOW | Cosmetic improvement |
| **Custom keybindings** | Rebindable shortcuts | LOW | Cosmetic improvement |
| **Analytics dashboard** | Team usage tracking | LOW | Enterprise feature |
| **Deep links** | `kilo-cli://` URL scheme | LOW | Nice-to-have |
| **Fast mode** | Faster model responses | LOW | Model-level optimization |
| **Artifacts** | Live interactive pages | LOW | Requires web server |

---

## Implementation Priority Matrix

| # | Feature | Tier | Priority | Effort | Dependencies |
|---|---------|------|----------|--------|-------------|
| 1 | Auto Memory (instruction + skill) | T1 | 🔴 HIGH | Light | None |
| 2 | Session Memory MCP | T2 | 🔴 HIGH | Moderate | None |
| 3 | Background Agents / Agent View | T3 | 🔴 HIGH | Moderate | tmux |
| 4 | Hooks MCP | T2 | 🔴 HIGH | Substantial | None |
| 5 | Goal Mode | T1 | 🟡 MEDIUM | Trivial | None |
| 6 | Enhanced Subagents | T1 | 🟡 MEDIUM | Moderate | #2 (memory) |
| 7 | Path-Scoped Rules | T1 | 🟡 MEDIUM | Light | None |
| 8 | Routines / Scheduled Tasks | T3 | 🟡 MEDIUM | Light | cron |
| 9 | Sandbox Environments | T3 | 🟡 MEDIUM | Moderate | firejail/Docker |
| 10 | Workflow Orchestrator MCP | T2 | 🟡 MEDIUM | Substantial | #3 (bg agents) |
| 11 | Init Command | T1 | 🟢 LOW | Light | None |
| 12 | Skill Evaluation | T1 | 🟢 LOW | Moderate | None |
| 13 | Plugin Registry MCP | T2 | 🟢 LOW | Moderate | None |
| 14 | Agent Teams | T3 | 🟢 LOW | Substantial | #3, #10 |

---

## Recommended Execution Order

### Phase 1: Memory & Persistence (items 1, 2)
Build the memory foundation. Auto memory instruction + Session Memory MCP server. Every subsequent feature benefits from cross-session knowledge.

### Phase 2: Orchestration (items 3, 5, 10)
Background agents via tmux + Goal Mode command + Workflow Orchestrator. This brings parallel execution and autonomous goal-seeking.

### Phase 3: Safety & Structure (items 4, 7, 9)
Hooks MCP for lifecycle automation + Path-scoped rules + Sandbox environments. This brings safety and structured automation.

### Phase 4: Enhanced Agents (items 6, 8)
Upgrade agents with persistent memory + Add scheduled tasks. Agents become smarter across sessions.

### Phase 5: Ecosystem (items 11, 12, 13, 14)
Init command + Skill evaluation + Plugin registry + Agent teams. Platform maturity features.

---

## Verification Checklist

For each implemented feature:
- [ ] Feature works in a fresh Kilo session
- [ ] Feature persists across session restarts
- [ ] Feature doesn't break existing workflows (PRD → Ralph → Review loop)
- [ ] Feature documented in `docs/`
- [ ] MCP servers (if new) registered in `kilo.json` and tested
- [ ] No secrets committed
- [ ] Kilo startup time not degraded (< 3s)

## What Can Go Wrong

| Risk | Impact | Mitigation |
|------|--------|------------|
| MCP server count grows too high (11 → 15+) | Memory bloat, startup delay | Use shared daemon architecture (systemd + mcp-proxy) |
| Memory files grow unbounded | Disk usage, slow loading | 200-line MEMORY.md cap + topic file archival |
| Background agents consume too many API tokens | Cost explosion | Budget limits in wrapper scripts |
| Hooks fire too frequently | Performance degradation | Matcher filtering, async hooks, debouncing |
| tmux dependency for agent view | Won't work in basic terminals | Graceful fallback to sequential execution |

---

## ADR-001: Extension-First Architecture

**Status:** Accepted

**Context:** We want Claude Code feature parity but cannot modify the Kilo CLI binary. All implementations must use extension points (MCP, skills, commands, agents, instructions, shell wrappers).

**Decision:** Implement features via MCP servers + instructions + commands + skills + shell wrappers. No CLI source modifications. File upstream feature requests for capabilities that genuinely require CLI changes.

**Options Considered:**
1. **Fork Kilo CLI** — Full control, but massive maintenance burden and drift from upstream
2. **Extension-first** — Limited by extension API, but zero maintenance on CLI updates ✅
3. **Wait for upstream** — Zero effort, but unpredictable timeline

**Consequences:**
- ✅ Zero CLI maintenance burden, automatic upstream updates
- ✅ Portable config (git-tracked `~/.config/kilo/`)
- ⚠️ Some features impossible (VS Code extension, voice dictation, deep links)
- ⚠️ Performance overhead from MCP server calls vs native implementations

---

## Implementation Summary — All Phases Complete

### Inventory Created

| Category | Count | Files |
|----------|-------|-------|
| Instructions | +4 | auto-memory, hooks-system, path-rules-loader, sandbox |
| Path-scoped rules | +3 | api-patterns, database, frontend |
| Commands | +5 | memory, goal, init, bg, schedule |
| Agents | +2 | explore, plan |
| Skills | +2 | memory-manager, skill-evaluator |
| MCP servers | +5 | session-memory, hooks, orchestrator, plugin-registry, team-coordinator |
| Shell wrappers | +4 | kilo-bg, kilo-view, kilo-schedule, kilo-sandbox |
| kilo.json updates | MCP: 11→16, Agents: 4→6, Instructions: 7→11 |

### Verified Working

All 5 new MCP servers return correct tool lists via JSON-RPC `tools/list`:
- `session-memory`: memory_load, memory_save, memory_list_topics, memory_search, memory_consolidate
- `hooks`: hooks_register, hooks_fire, hooks_list, hooks_remove, hooks_persist
- `orchestrator`: workflow_create, workflow_run, workflow_status, workflow_list, workflow_cancel
- `plugin-registry`: plugin_search, plugin_install, plugin_list, plugin_remove
- `team-coordinator`: team_create, team_send, team_receive, team_status, team_start
