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

---

## Phase 6: Kilocode Fork Roadmap (DEFERRED — Document for Later)

These features require forking the Kilocode CLI source (`github.com/Kilo-Org/kilocode`). Documented here for the eventual fork.

### 6.1 Multiple Surfaces

**Source:** Claude Code + MiMo-Code both have this.

| Surface | MiMo-Code Package | Priority |
|---------|-------------------|----------|
| VS Code extension | `sdks/vscode/` | HIGH |
| Zed extension | `packages/extensions/zed/` | MEDIUM |
| Desktop app | `packages/desktop/` (Electron) | MEDIUM |
| Web app | `packages/web/` | MEDIUM |
| Slack bot | `packages/slack/` | LOW |

**Implementation approach:** MiMo-Code uses a Hono HTTP server (`packages/opencode/src/server/`) that exposes the agent loop as an API. All surfaces connect to this API. The CLI TUI is just one client.

### 6.2 Native Multi-Provider Support

**Source:** MiMo-Code has 16+ AI SDK providers baked into `packages/opencode/src/provider/`.

Providers to add:
- `@ai-sdk/anthropic` (already in Kilo)
- `@ai-sdk/amazon-bedrock` — AWS Bedrock
- `@ai-sdk/google-vertex` — Google Vertex AI
- `@ai-sdk/openai` — OpenAI / Azure
- `@ai-sdk/deepinfra` — DeepInfra
- `@ai-sdk/groq` — Groq
- `@ai-sdk/mistral` — Mistral
- `@ai-sdk/xai` — xAI (Grok)
- `@ai-sdk/togetherai` — Together AI
- `@ai-sdk/cerebras` — Cerebras
- `@ai-sdk/cohere` — Cohere
- `@ai-sdk/alibaba` — Alibaba
- `@ai-sdk/perplexity` — Perplexity
- `@openrouter/ai-sdk-provider` — OpenRouter (meta-provider)
- `ai-gateway-provider` — AI Gateway

**Implementation approach:** Add Vercel AI SDK provider packages as dependencies. Create a provider registry in `src/provider/` that resolves model strings like `bedrock/claude-sonnet-4` to the correct SDK client. Config format: `kilo.json` `provider` section with per-provider credentials.

### 6.3 Voice Input

**Source:** MiMo-Code in `packages/opencode/src/cli/` — uses TenVAD for voice activity detection, MiMo ASR for transcription, `sox` for audio capture.

**Implementation approach:** Add `/voice` command that captures audio via `sox`, segments by pauses with VAD, transcribes via Whisper API (or self-hosted), and injects into the prompt input. Kilo already has `experimental.speech_to_text` config — needs actual implementation.

### 6.4 Native Checkpoint/Context Management

**Source:** MiMo-Code in `packages/opencode/src/memory/` — SQLite FTS5 memory with automatic checkpoints, context reconstruction, and budgeted injection.

**Key concepts:**
- **Automatic checkpoints** — A checkpoint-writer subagent saves structured state snapshots when context window pressure is detected
- **Context reconstruction** — When context approaches limit, rebuild from: latest checkpoint + project memory + task progress + retained recent messages
- **Budgeted injection** — Token budget controls how much checkpoint/memory/notes content enters context, ranked by importance

**Implementation approach:** Add a `memory/` module with SQLite storage, checkpoint subagent, and context budget calculator. Modify the agent loop to check context pressure after each turn and trigger checkpoint/reconstruction when needed.

### 6.5 Compose Mode

**Source:** MiMo-Code has a `compose` agent with built-in skills for: planning, execution, code review, TDD, debugging, verification, and merging.

**Implementation approach:** Add a third primary agent mode (alongside `build` and `plan`) that takes a spec file and orchestrates the full development lifecycle. Uses subagents for each phase. Similar to our PRD→Ralph→Review flow but native and automatic.

---

## Phase 7: MiMo-Inspired Self-Improvement Features (IMPLEMENT NOW)

These features are unique to MiMo-Code — Claude Code doesn't have them. We can implement them via our existing extension points, giving us a competitive advantage.

### 7.1 `/dream` — Self-Improving Memory (HIGH PRIORITY)

**What it does:** Scans recent session traces (Kilo recall / Tausik session logs), extracts persistent knowledge into project memory, and removes outdated entries. The agent "dreams" about what it learned.

**Implementation:**
- New command `commands/dream.md`
- Reads session transcripts via `kilo_local_recall` (search mode)
- For each recent session, extract:
  - Build/test commands discovered
  - Architecture patterns observed
  - Debugging insights
  - User preferences expressed
  - Gotchas and dead ends
- Writes extracted knowledge to `~/.kilo/memory/<project>/MEMORY.md` via session-memory MCP
- Removes entries that are contradicted by newer learnings
- Deduplicates via `tausik_memory_dedupe` or `memory_consolidate`

**Verification:**
- Run `/dream` after 3+ sessions on a project
- MEMORY.md should contain accurate, non-duplicate entries
- Old entries that are superseded should be removed

**Effort:** Moderate — 1 command file, uses existing MCP tools

---

### 7.2 `/distill` — Workflow Pattern Discovery (HIGH PRIORITY)

**What it does:** Scans recent session traces, discovers repeated manual workflows (e.g. "user always runs lint then test then commit"), and packages high-confidence patterns into reusable skills, commands, or subagents.

**Implementation:**
- New command `commands/distill.md`
- Reads recent session transcripts via `kilo_local_recall`
- Identifies repeated patterns:
  - Tool call sequences that appear in 3+ sessions
  - Prompt patterns the user types frequently
  - Multi-step workflows (e.g. "fix lint → run tests → commit")
- For each high-confidence pattern, generates:
  - A skill file (`~/.kilo/skills/<name>/SKILL.md`) — or —
  - A command file (`commands/<name>.md`) — or —
  - An agent definition (`.kilo/agents/<name>.md`)
- Presents candidates to the user for approval before saving

**Verification:**
- Run `/distill` after 5+ sessions
- Should propose at least 1 workflow pattern
- Generated skill/command should be valid and usable

**Effort:** Substantial — 1 complex command, pattern matching logic

---

### 7.3 Goal Judge Upgrade (MEDIUM PRIORITY)

**What it does:** Upgrades `/goal` to use an independent judge subagent that evaluates whether the goal condition is truly satisfied — preventing premature "optimistic stops" during autonomous work.

**Implementation:**
- Modify `commands/goal.md`
- After the agent reports goal is met, spawn a `task` subagent with:
  - The original goal condition
  - The agent's evidence of completion
  - Access to read files and run verification commands
  - Instruction: "Evaluate whether this goal is TRULY met. Be skeptical. Check edge cases. Return PASS or FAIL with evidence."
- If judge says FAIL: agent continues working
- If judge says PASS: agent stops and reports success
- Judge uses the same model or a different model (configurable)

**Verification:**
- Set a goal like "all tests pass"
- Agent should not stop until the judge independently confirms tests pass
- Test with a false-positive: agent claims done but judge detects remaining failures

**Effort:** Light — modify 1 existing command

---

### 7.4 Max Mode — Best-of-N Reasoning (LOW PRIORITY)

**What it does:** For critical decisions, runs N parallel subagents with the same prompt, then a judge subagent picks the best response.

**Implementation:**
- New skill `~/.kilo/skills/max-mode/SKILL.md`
- Takes a prompt and N (default 3)
- Spawns N `task` subagents in parallel with the same prompt
- Collects all N responses
- Spawns a judge subagent: "Here are N responses to the same question. Pick the best one and explain why."
- Returns the selected response

**Verification:**
- Ask a complex architectural question via max-mode
- Verify it returns a response and the judge's reasoning
- Compare quality vs single-response

**Effort:** Moderate — 1 skill file, uses existing `task` tool for parallelism

---

### 7.5 Compose Mode Enhancement (LOW PRIORITY)

**What it does:** Extends our existing PRD→Ralph→Review pipeline with TDD, debugging, and verification phases — closer to MiMo's full Compose workflow.

**Implementation:**
- New command `commands/compose.md`
- Full lifecycle orchestration:
  1. **Plan** — invoke `plan` agent to analyze the spec
  2. **TDD** — generate tests first (before implementation)
  3. **Implement** — invoke `ralph` agent to build
  4. **Review** — invoke `code-reviewer` agent
  5. **Fix** — invoke `ralph` to fix review findings
  6. **Verify** — run full test suite + lint
  7. **Commit** — conventional commit with summary
- Each phase is a step in the orchestrator workflow

**Verification:**
- Run `/compose docs/feature.md` on a PRD
- Should execute all 7 phases automatically
- Output should be committed, tested, and reviewed code

**Effort:** Moderate — 1 command, orchestrates existing agents

---

## Phase 7 Execution Order

| # | Feature | Priority | Effort | Dependencies |
|---|---------|----------|--------|-------------|
| 1 | `/dream` | 🔴 HIGH | Moderate | session-memory MCP, kilo_local_recall |
| 2 | `/distill` | 🔴 HIGH | Substantial | session-memory MCP, skill system |
| 3 | Goal Judge | 🟡 MEDIUM | Light | existing `/goal` command |
| 4 | Max Mode | 🟢 LOW | Moderate | task tool for parallelism |
| 5 | Compose Mode | 🟢 LOW | Moderate | orchestrator MCP, all agents |

**Recommended order:** `/dream` → Goal Judge → `/distill` → Compose → Max Mode

---

## ADR-002: Self-Improving Agent Architecture

**Status:** Proposed

**Context:** MiMo-Code demonstrates that agents can improve themselves by learning from session traces (`/dream`) and discovering workflow patterns (`/distill`). Neither Claude Code nor current Kilo has this capability.

**Decision:** Implement `/dream` and `/distill` as commands that use existing tools (kilo_local_recall for session history, session-memory MCP for persistence, task tool for subagents). No CLI source changes needed.

**Options Considered:**
1. **Native CLI implementation** — Fast, integrated, but requires fork
2. **Extension-point commands** — Uses existing MCP + tools, portable, no fork needed ✅
3. **Skip** — Miss the self-improvement capability entirely

**Consequences:**
- ✅ Self-improving agent — gets smarter across sessions without manual tuning
- ✅ No CLI fork needed
- ✅ Competitive advantage: feature neither Claude Code nor vanilla Kilo has
- ⚠️ Depends on kilo_local_recall quality for session trace analysis
- ⚠️ `/distill` pattern detection is only as good as the LLM's analysis

---

## Phase 8: Fork MiMo-Code — The Path to Full Feature Parity

**Status:** Proposed
**Decision:** Fork MiMo-Code (MIT, OpenCode-based) instead of kilocode. Layer our extensions on top.

### Why MiMo-Code, Not Kilocode

| Criteria | Fork Kilocode | Fork MiMo-Code |
|----------|--------------|----------------|
| Memory/checkpoints | Build from scratch | ✅ Already implemented (`src/memory/`) |
| Context reconstruction | Build from scratch | ✅ Already implemented (budgeted injection, reconcile) |
| Native providers | Build from scratch | ✅ 16+ AI SDK providers (`src/provider/`) |
| Subagent lifecycle | Build from scratch | ✅ Actor system (`src/actor/`) |
| Workflow runtime | Build from scratch | ✅ Sandbox + persistence (`src/workflow/`) |
| Dream/Distill | Build from scratch | ✅ Already implemented |
| Goal judge | Build from scratch | ✅ Already implemented |
| Task tree | Build from scratch | ✅ SQLite-backed (`src/task/`) |
| Voice input | Build from scratch | ✅ TenVAD + ASR |
| VS Code extension | Build from scratch | ✅ Already exists (`sdks/vscode/`) |
| Desktop app | Build from scratch | ✅ Already exists (`packages/desktop/`) |
| Slack integration | Build from scratch | ✅ Already exists (`packages/slack/`) |
| License | MIT (Kilo-Org) | MIT (Xiaomi) |
| Base | OpenCode fork (compiled binary) | OpenCode fork (TypeScript/Bun source) |
| Source access | ❌ Compiled native binary | ✅ Full TypeScript source |

### What We KEEP from Our Extensions

These are things we built that MiMo doesn't have — our differentiation:

| Extension | Purpose | MiMo Equivalent |
|-----------|---------|-----------------|
| **Tausik MCP** (70+ tools) | Epics/stories/tasks, memory graph, QA gates, sessions, roles, stacks | Basic task tree only |
| **Constitution MCP** | AST-based code quality rules | None |
| **Score Engine MCP** | NoCowboy quality scoring | None |
| **Contract Guard MCP** | API contract breaking-change detection | None |
| **NCP Validator MCP** | NCP spec validation | None |
| **Ralph MCP + agent** | PRD-driven iterative execution | Compose mode (different approach) |
| **11 instruction files** | Behavioral rules, cybersecurity, Russian law, no-shortcuts, etc. | CLAUDE.md only |
| **Path-scoped rules** | Per-directory coding standards | None |
| **Channels** (hooks MCP) | Push events from CI/alerts/chat into sessions | Native inbox (simpler) |
| **kilo-proxy** | Multi-provider via LiteLLM (redundant after fork — MiMo has native) | Native 16+ providers |

### What We Get FROM MiMo (for free by forking)

| MiMo Feature | Source Path | Value |
|---|---|---|
| SQLite FTS5 memory + reconciliation | `src/memory/` | 🔴 Critical — replaces our file-based session-memory MCP |
| Auto checkpoints + context reconstruction | `src/memory/service.ts` | 🔴 Critical — impossible via extensions |
| Budgeted context injection | `src/memory/index.ts` | 🔴 Critical — token-aware memory loading |
| 16+ native AI SDK providers | `src/provider/` | 🔴 Critical — replaces our LiteLLM proxy |
| Actor/subagent lifecycle | `src/actor/` | 🟡 High — cancel, background, shared context |
| Workflow runtime + sandbox | `src/workflow/` | 🟡 High — replaces our orchestrator MCP |
| Task tree with gates | `src/task/` | 🟢 Medium — Tausik is richer, but tree IDs are nice |
| Team coordination | `src/team/` | 🟢 Medium — replaces our team-coordinator MCP |
| Dream/Distill commands | built-in | 🟡 High — self-improvement |
| Goal judge | `src/agent/agent.ts` | 🟡 High — reliable goal verification |
| Voice input | `src/cli/` | 🟢 Nice-to-have |
| VS Code extension | `sdks/vscode/` | 🟡 High — IDE integration |
| Desktop app | `packages/desktop/` | 🟢 Medium |
| Slack bot | `packages/slack/` | 🟢 Low |
| Max Mode (best-of-N) | experimental config | 🟢 Nice-to-have |
| Custom themes | `.mimocode/themes/` | 🟢 Low |

### Fork Execution Plan

#### Step 1: Clone and Rebrand
- Clone `github.com/XiaomiMiMo/MiMo-Code`
- Rename CLI: `mimo` → our CLI name
- Rename config dir: `.mimocode/` → `.kilo/`
- Rename packages: `@mimo-ai/*` → our namespace
- Update all branding, URLs, auth endpoints

#### Step 2: Validate MiMo Features Work
- Build and run the fork
- Test: memory persistence, checkpoint creation, context reconstruction
- Test: multi-provider (Anthropic, DeepSeek, OpenAI)
- Test: subagent spawn/cancel/background
- Test: workflow execution with compose mode
- Test: dream and distill commands

#### Step 3: Port Our MCP Servers
- Register existing MCP servers in the new config format
- Tausik, Constitution, Score Engine, Contract Guard, NCP Validator, Puppetmaster
- Context7, SQLite, Puppeteer, Git (remote HTTP daemons — keep systemd architecture)
- Verify all 16 MCP servers work with the new CLI

#### Step 4: Port Our Extension Layer
- Instructions (11 files) → new instructions dir
- Commands (16 files) → new commands dir
- Agents (6 definitions) → new agents dir
- Skills (4 skills) → new skills dir
- Path-scoped rules → new rules dir
- Shell wrappers (kilo-bg, kilo-view, kilo-schedule, kilo-sandbox) → update paths

#### Step 5: Merge Task Systems
- Keep Tausik as the primary project management tool (richer than MiMo's)
- Use MiMo's task tree IDs (T1/T1.1) as a lightweight format within Ralph/Compose
- Bridge: Tausik tasks → MiMo task progress files for checkpoint integration

#### Step 6: Remove Redundant Extensions
After fork, these MCP servers become redundant (replaced by native features):
- `session-memory` MCP → replaced by native `src/memory/`
- `orchestrator` MCP → replaced by native `src/workflow/`
- `team-coordinator` MCP → replaced by native `src/team/`
- `plugin-registry` MCP → replaced by native plugin system
- `kilo-proxy` wrapper → replaced by native 16+ providers
- `channels` (hooks MCP) → replaced by native `src/inbox/`

**Keep:** hooks MCP (for custom automation), Tausik, Constitution, Score Engine, Contract Guard, NCP Validator, Puppetmaster, Context7, SQLite, Puppeteer, Git

#### Step 7: Publish
- Build native binaries (MiMo uses Bun to compile)
- Publish to npm under our namespace
- Update systemd services for new binary paths
- Migrate existing `~/.config/kilo/` configs

### What We End Up With

| Layer | Source | Features |
|-------|--------|----------|
| **Runtime** | MiMo-Code fork | Memory, checkpoints, context management, 16+ providers, subagent lifecycle, workflow sandbox, dream/distill, goal judge, voice, VS Code ext |
| **Quality** | Our MCP servers | Constitution (code rules), Score Engine (NoCowboy), Contract Guard, NCP Validator |
| **Project Management** | Tausik MCP | Epics/stories/tasks, memory graph, QA gates, sessions, roles |
| **Framework Ops** | Puppetmaster MCP | PM framework dev/build/deploy/review |
| **Knowledge** | Our instructions | Behavioral rules, cybersecurity, Russian law, no-shortcuts, repo-map, aider-features |
| **Workflows** | Our agents + MiMo compose | PRD→Ralph→Review pipeline + Compose lifecycle |
| **External Tools** | Context7, SQLite, Puppeteer, Git | Docs, DB, browser, git via shared daemons |

### ADR-003: Fork MiMo-Code as Runtime Base

**Status:** Proposed

**Context:** We've built 16 MCP servers, 11 instructions, 16 commands, 6 agents, and 4 skills via Kilo's extension points. ~60% work well as extensions. ~40% (memory/context/subagents/providers) are fundamentally limited because they need to live inside the agent loop. MiMo-Code (MIT, OpenCode fork) has already implemented these runtime features.

**Decision:** Fork MiMo-Code. Use it as the runtime base. Layer our unique extensions (Tausik, Constitution, Score Engine, instructions, agents) on top. Remove redundant MCP servers replaced by native features.

**Options Considered:**
1. **Stay extension-only** — No fork, keep building MCP workarounds. Ceiling at ~60% quality.
2. **Fork Kilocode** — Full control but build everything from scratch. Massive effort.
3. **Fork MiMo-Code** — Get runtime features for free, keep our extensions. Best effort-to-value. ✅

**Consequences:**
- ✅ Full runtime features: memory, checkpoints, context management, native providers, subagent lifecycle
- ✅ Keep all our unique extensions (Tausik, Constitution, Score Engine, instructions, agents)
- ✅ VS Code extension, desktop app, Slack bot for free
- ✅ Dream/Distill self-improvement for free
- ⚠️ Must maintain a fork (track MiMo upstream changes)
- ⚠️ Rebranding work (CLI name, config paths, npm packages)
- ⚠️ Must test all 16 MCP servers with new runtime

---

## Phase 8 REVISED: Fork Kilocode + Cherry-Pick MiMo Features

**Status:** Proposed (replaces previous MiMo-fork strategy)
**Decision:** Fork Kilocode. Port 6 modules from MiMo-Code. Keep all our extensions.

### Why Kilocode Over MiMo-Code

| Factor | Kilocode | MiMo-Code |
|--------|----------|-----------|
| Commits | 23,684 | 39 |
| Releases | 433 (v7.3.46) | 2 (v0.1.1) |
| VS Code extension | Mature, primary surface | Basic/new |
| JetBrains plugin | Native Kotlin (12% codebase) | ❌ |
| Cloud Agent | app.kilo.ai/cloud | ❌ |
| KiloClaw | Always-on background agent | ❌ |
| Code Reviews | Automated PR reviews | ❌ |
| Model support | 500+ via kilo.ai platform, zero markup | 16 providers + MiMo Auto |
| Inline autocomplete | Ghost-text, tab to accept | ❌ |
| Self-checking | Agent reviews own work | ❌ (has goal judge) |
| Semantic search | Voyage AI embeddings + LanceDB | Tree-sitter only, no embeddings |
| Agent Manager | Worktree-based parallel sessions | ❌ |
| Autonomous CI/CD | `kilo run --auto` | ❌ |
| DeepSeek support | Tested, 500+ model routing | Generic openai-compatible |
| Stability | Battle-tested, 2+ years | Brand new |

### What to Port FROM MiMo-Code (6 modules, ~2,000 LOC)

| Module | MiMo Source | What It Does | Port Effort |
|--------|------------|-------------|-------------|
| **Memory system** | `src/memory/` (6 files) | SQLite FTS5, MEMORY.md, checkpoint.md, notes.md, reconciliation | HIGH — core runtime change |
| **Context reconstruction** | `src/memory/service.ts`, `reconcile.ts` | Auto checkpoints, budgeted token injection after compaction | HIGH — agent loop integration |
| **Workflow runtime** | `src/workflow/` (10 files) | Compose mode: plan→execute→review→TDD→debug→verify→merge, sandbox execution | MEDIUM — new agent mode |
| **Task tree** | `src/task/` (7 files) | Hierarchical T1/T1.1/T1.2 IDs, SQLite-backed, gate state | LOW — supplement Tausik |
| **Dream/Distill** | commands | `/dream` extracts session knowledge, `/distill` discovers workflow patterns | LOW — commands + analysis |
| **Goal judge** | `src/agent/agent.ts` | Independent model evaluates goal completion before stopping | LOW — modify agent stop logic |

### What We KEEP from Kilocode (already have)

Everything the compiled binary gives us today:
- VS Code extension, JetBrains plugin
- 500+ models, inline autocomplete
- Voyage AI embeddings + LanceDB semantic search
- Agent Manager (worktree parallel sessions)
- `kilo run --auto` autonomous mode
- Self-checking agent
- Cloud Agent, Code Reviews, KiloClaw
- LSP integration
- Compaction with auto/prune
- Native binary compilation (platform-specific)
- Speech-to-text (experimental)
- OpenTelemetry

### What We KEEP from Our Extensions

| Extension | Status After Fork |
|-----------|------------------|
| **Tausik MCP** (70+ tools) | KEEP — richer than MiMo's task tree |
| **Constitution MCP** | KEEP — no equivalent anywhere |
| **Score Engine MCP** | KEEP — no equivalent anywhere |
| **Contract Guard MCP** | KEEP — no equivalent anywhere |
| **NCP Validator MCP** | KEEP — no equivalent anywhere |
| **Ralph MCP + agent** | KEEP — PRD execution pipeline |
| **Puppetmaster MCP** | KEEP — PM framework ops |
| **11 instruction files** | KEEP — behavioral rules, cybersecurity, Russian law |
| **16 commands** | KEEP — memory, goal, init, bg, schedule, etc. |
| **6 agents** | KEEP — architect, prd, ralph, code-reviewer, explore, plan |
| **4 skills** | KEEP — memory-manager, skill-evaluator, frontend-design, web-design-guidelines |
| **Path-scoped rules** | KEEP — 3 rule files |
| **Hooks MCP + channels** | KEEP — lifecycle automation + push events |

### What Becomes REDUNDANT After Fork

| Extension | Replaced By | Action |
|-----------|-------------|--------|
| `session-memory` MCP | Native `src/memory/` | Remove |
| `orchestrator` MCP | Native `src/workflow/` | Remove |
| `team-coordinator` MCP | Native `src/team/` (if ported) | Remove |
| `kilo-proxy` wrapper | Native 500+ model routing | Remove |
| `channels` (hooks MCP) | Native `src/inbox/` (if ported) | Remove or keep as supplement |

### Execution Plan

#### Step 1: Fork Kilocode Source
```bash
git clone https://github.com/Kilo-Org/kilocode.git
# Full TypeScript source: packages/opencode/src/
```

#### Step 2: Port MiMo Memory System
- Copy MiMo's `src/memory/` into Kilo's `packages/opencode/src/memory/`
- Adapt imports (MiMo uses Effect framework, Kilo may not)
- Wire memory into the agent loop: auto-load MEMORY.md at session start, auto-checkpoint on context pressure
- Add SQLite FTS5 tables via Drizzle migration

#### Step 3: Port MiMo Context Reconstruction
- Integrate `reconcile.ts` into Kilo's compaction system
- When compaction triggers: save checkpoint → prune old messages → reconstruct context from checkpoint + memory + recent messages
- Add token budget calculator for injection

#### Step 4: Port MiMo Dream/Distill
- Add `/dream` and `/distill` as built-in commands
- `/dream`: scan `kilo_local_recall` sessions → extract knowledge → write to MEMORY.md
- `/distill`: analyze session traces → identify repeated patterns → generate skills/commands

#### Step 5: Port MiMo Goal Judge
- Modify agent stop condition: when agent claims done, spawn judge subagent
- Judge uses same or different model (configurable)
- Judge evaluates: "Is this goal TRULY met? Check evidence, run verification."
- Only stop if judge says PASS

#### Step 6: Port MiMo Compose/Workflow
- Add compose agent mode alongside Code/Plan/Ask/Debug/Review
- Compose takes a spec and orchestrates: plan→TDD→implement→review→fix→verify→merge
- Port `src/workflow/runtime.ts` and `sandbox.ts`

#### Step 7: Wire Our Extensions
- Register all MCP servers in the new config format
- Port instructions, commands, agents, skills, rules
- Remove redundant MCPs (session-memory, orchestrator, team-coordinator, kilo-proxy)
- Keep unique MCPs (Tausik, Constitution, Score Engine, Contract Guard, NCP, Puppetmaster, hooks)

#### Step 8: Build and Ship
- `bun run build` → native binaries
- Test: VS Code extension, CLI, JetBrains
- Test: memory persistence, checkpoints, dream/distill
- Test: all MCP servers connect
- Publish under our namespace

### ADR-003 REVISED: Fork Kilocode as Base, Port MiMo Runtime Features

**Status:** Proposed (supersedes previous MiMo-fork ADR)

**Context:** Kilocode has 23k commits, VS Code, JetBrains, Cloud, 500+ models, embeddings, inline autocomplete — massive maturity. MiMo has 6 valuable runtime features (memory, checkpoints, dream/distill, goal judge, compose, task tree) across ~2,000 lines. Porting 6 modules into Kilo is far less work than rebuilding 15+ Kilo features into MiMo.

**Decision:** Fork Kilocode. Cherry-pick MiMo's memory, workflow, task, dream/distill, goal judge modules. Keep all our MCP extensions.

**Consequences:**
- ✅ Keep all Kilo maturity: VS Code, JetBrains, Cloud, 500+ models, embeddings, autocomplete
- ✅ Gain MiMo's runtime features: memory, checkpoints, context management, dream/distill
- ✅ Keep all our unique extensions: Tausik, Constitution, Score Engine, instructions
- ⚠️ MiMo uses Effect framework — porting may require adaptation
- ⚠️ Must maintain fork against Kilo upstream (23k commits of history)
- ⚠️ 6 modules to port (~2,000 LOC) — non-trivial but bounded
