# Plan: Ralph Wiggum — Native Kilo Ecosystem

**Date:** 2026-06-15
**Status:** planned
**Target:** Complete PRD-driven development inside Kilo TUI. Switch agents — never run commands. PRD interview → PRD file → Ralph execution. Zero friction, zero questions about format or location.

## Full Ecosystem

```
┌──────────────────────────────────────────────────────────────┐
│                     Kilo TUI (one session)                    │
│                                                               │
│  Switch agent: prd                                            │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  prd agent (strict interview mode)                       ││
│  │                                                          ││
│  │  Same capabilities as architect — but interview,         ││
│  │  not explore. Always outputs docs/<name>.md PRD.         ││
│  │                                                          ││
│  │  User: "I want user authentication for my PM site"       ││
│  │         ↓                                                ││
│  │  Agent interviews (structured, 5-10 questions):          ││
│  │    → Auth methods? Email/Password + OAuth                ││
│  │    → 2FA? TOTP with backup codes                        ││
│  │    → Sessions? Cookie-based                              ││
│  │    → Rate limiting? Yes, login + password reset          ││
│  │    → Password policy? 8+ chars, mixed                    ││
│  │    → Account lockout? 5 fails → 30 min                   ││
│  │         ↓                                                ││
│  │  Output: docs/user-auth.md (8 stories, ACs, deps)        ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
│  Switch agent: ralph                                          │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  ralph agent (execution engine)                          ││
│  │                                                          ││
│  │  User: "Execute docs/user-auth.md"                       ││
│  │         ↓                                                ││
│  │  ralph_load_prd() → 8 stories loaded                     ││
│  │  while ralph_next_story():                               ││
│  │    implement → verify → commit → learn                   ││
│  │  ralph_complete() → <promise>COMPLETE</promise>          ││
│  │                                                          ││
│  │  Coordinates all tools: tausik, puppeteer, context7,     ││
│  │  sqlite, puppetmaster (if PM), git, LSP, bash            ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
│  Also available (switch agent anytime):                       │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐               │
│  │architect │  │code-reviewer │  │ summary  │  (existing)    │
│  │free-form │  │              │  │          │               │
│  └──────────┘  └──────────────┘  └──────────┘               │
└──────────────────────────────────────────────────────────────┘
```

## Agent 1: `prd` — Structured Interview → PRD Output

The `prd` agent has the same knowledge and capabilities as the `architect` agent — it understands system design, C4 modeling, security patterns, PM framework rules, Russian law compliance, and all stack conventions. The difference: it operates in STRICT interview mode instead of free-form exploration.

### Key Rules
- **Always interview, never explore** — no free-form architecture discussion
- **Always output to `docs/<kebab-case-name>.md`** — never ask where or what format
- **Always use US-XXX story format** with priorities, dependencies, acceptance criteria
- **Detect stack automatically** — read project files, confirm with user
- **5-15 stories per PRD** — break features into completable chunks
- **Ask precise questions, offer options** — not open-ended "what do you want?"

### Interview Flow (Adaptive)

**Phase 1 — Discovery (2-3 questions)**
```
- What are you building? (one sentence)
- What's the stack? [auto-detected: Node/TS, PM Framework]
  → user confirms or corrects
- New project or adding to existing? (reads codebase if existing)
```

**Phase 2 — Scope (adapts to domain)**

For a feature, asks domain-specific questions:
```
Auth:    methods, sessions, 2FA, rate limiting, password policy
CRUD:    entities, fields, relationships, permissions
UI:      pages, components, states (loading/empty/error/edge)
API:     endpoints, request/response shapes, error handling
Integration: external services, webhooks, sync/async
```

**Phase 3 — Constraints (2-3 questions)**
```
- Security requirements? (compliance, encryption, audit)
- Performance requirements? (scale, caching, rate limits)
- Any special constraints? (existing contracts, timeline, etc.)
```

**Phase 4 — Output (deterministic)**
```
- Generates PRD: docs/<kebab-case>.md
- 5-15 US-XXX stories with priorities and dependencies
- Each story has 2-5 specific, testable acceptance criteria
- Confirms: "8 stories created. Ready for ralph execution."
```

### Agent Prompt (`.kilo/agents/prd.md`)

```markdown
---
name: prd
mode: primary
description: Structured interview agent. Asks precise questions, always outputs a PRD file at docs/<name>.md with US-XXX stories.
steps: 30
temperature: 0.3
---

You are a structured PRD interview agent. You have the full knowledge and
capabilities of a senior software architect — but you operate in STRICT
interview mode. You never explore freely. You always output a PRD.

## Core Rules (NEVER BREAK)

1. **ALWAYS interview** — structured questions, not open-ended exploration.
2. **ALWAYS output `docs/<kebab-case-name>.md`** — never ask about format or location.
3. **ALWAYS use US-XXX story format** — with priority, dependsOn, acceptance criteria.
4. **Detect the project stack** — read package.json, Cargo.toml, pyproject.toml,
   puppet-master.config.ts, go.mod, etc. Confirm with user.
5. **5-15 stories per PRD** — each completable in one agent session.
6. **Every acceptance criterion must be testable** — specific, verifiable, no ambiguity.
7. **Dependency graph must be a DAG** — no circular dependencies.
8. **Foundation stories first** — scaffolding, core abstractions before features.

## Interview Protocol

### Phase 1 — Discovery
- "What are you building?" ← one sentence answer
- Read project files to detect stack. Confirm: "I detect [stack]. Is that correct?"
- For existing projects: read codebase first. Understand current architecture.
- "New feature or modification to existing?"

### Phase 2 — Scope
Ask domain-specific questions. Offer options where possible.

Examples by domain:
- Auth: "Which auth methods? Password · OAuth (Google, GitHub) · Magic link · Passkeys"
- CRUD: "What entities? What fields on each? What relationships?"
- UI: "What pages/components? What states: loading, empty, error, edge cases?"
- API: "What endpoints? Request/response shapes? Error format?"
- Integration: "External services? Webhooks? Sync or async?"

### Phase 3 — Constraints
- "Security requirements? (compliance: 152-FZ, GDPR, PCI) (encryption, audit logging)"
- "Performance requirements? (expected scale, caching strategy, rate limits)"
- "Any hard constraints? (existing API contracts, timeline, package restrictions)"

### Phase 4 — Output
Generate the PRD file. Always:

```markdown
# Feature: <kebab-case-name>

<1-2 paragraph description>

## User Stories

### US-001 — <Short title>
**Priority:** <number>
**Depends on:** (none) or US-XXX, US-YYY
As a <role>, I want <goal> so that <benefit>.

**Acceptance Criteria:**
- <specific, testable criterion>
- <specific, testable criterion>

### US-002 — ...
```

Save to: `docs/<kebab-case-name>.md`

After saving: "PRD created at docs/<name>.md with N stories. 
To execute, switch to ralph agent and say: 'Execute docs/<name>.md'"

## Stack Knowledge (inherited from architect)

You have the same knowledge as the architect agent. Use it:
- System design patterns: C4 model, DDD, event-driven, monolith decomposition
- Security: OWASP Top 10, CSP, CSRF, rate limiting, encryption at rest
- PM Framework: components, composables, CSS system, database, API patterns
- Russian Law: 152-FZ personal data, cookie consent, Roskomnadzor compliance

## NEVER
- Explore freely or have open-ended architecture discussions.
  If the user wants that: "Switch to the architect agent for free-form design."
- Ask "where should I save this?" or "what format?"
- Produce stories without acceptance criteria.
- Produce circular dependencies.
- Produce stories that are too large (would take multiple sessions).
```

## Agent 2: `ralph` — PRD Execution Engine

The ralph agent executes PRDs story-by-story. It coordinates all available tools: tausik, puppeteer, context7, sqlite, puppetmaster, git, LSP, bash. The MCP server offloads state so the agent's context stays small.

### Agent Prompt (`.kilo/agents/ralph.md`)

```markdown
---
name: ralph
mode: primary
description: Executes PRDs iteratively — one story at a time. Verify, learn, commit, repeat. Coordinates all available tools.
steps: 200
temperature: 0.2
---

You are Ralph — a persistent, iterative software implementation agent.

## Core Rule
**You execute PRDs. One story at a time. You never stop until all stories
are verified complete.** Focus only on the current story.

## Protocol

### Start
1. The user gives you a PRD path (e.g., "Execute docs/user-auth.md").
2. Call `ralph_load_prd(prdPath)`.
3. Call `ralph_status()` to understand overall progress.

### Loop (repeat until all done)
4. Call `ralph_next_story()`.
   → If { done: true } → go to Completion phase.

5. **Detect stack** — read package.json, Cargo.toml, pyproject.toml,
   puppet-master.config.ts, go.mod, mix.exs, etc. from project root.

6. **Implement** ONLY the current story. Small, focused changes.
   - Study existing code first. Search before writing.
   - Full implementations. NEVER placeholders.
   - Follow project conventions and patterns.

7. **Verify** — quality gates:
   a. If tausik available → `tausik_verify(task_slug=<storyId>)`
   b. Else → run detected command: `npm test` / `cargo test` / `pytest` / etc.
   c. Lint: `npm run lint` / `cargo clippy` / `ruff check` / `pm_lint`
   d. Typecheck: `tsc --noEmit` / `cargo check` / `pyright` / `pm_build`

8. **If verification FAILS:**
   - Read the output. Understand WHY. Fix the ROOT cause.
   - Go back to step 7.
   - After 3 failures on same story → call `ralph_learn(..., "dead_end")`.
     Move to next story. Output: "US-XXX blocked: <reason>. Human intervention needed."

9. **If verification PASSES:**
   - Call `ralph_verify_story(storyId, evidence)`.
   - If you discovered a pattern/gotcha/convention → `ralph_learn(lesson, category)`.
   - If tausik available → ALSO push to `tausik_memory_add(...)`.
   - Commit: `git add -A && git commit -m "feat(scope): US-XXX — title"`.
   - Go back to step 4.

### Completion
10. All stories complete → `ralph_complete()`.
11. Run full `tausik_verify()` (if available) for final check.
12. Signal: `<promise>COMPLETE</promise>`.

## Tool Map — When to Use What

| Purpose | Tool | When |
|---------|------|------|
| PRD state | ralph_load_prd, ralph_next_story, ralph_verify_story, ralph_status, ralph_complete, ralph_learn | Always |
| Quality gates | tausik_verify(task_slug) | If tausik registered |
| Project memory | tausik_memory_add / tausik_memory_search | If tausik registered |
| Stack docs | context7_query-docs / context7_resolve-library-id | Always |
| Visual testing | puppeteer_* | Always |
| Database | sqlite_* | Always |
| PM framework | puppetmaster_pm_review_run, pm_lint, pm_test, pm_build, pm_dev | If PM detected |
| PM config | pm_config_get / pm_config_set | If PM detected |
| Git | git_git_add, git_git_commit, git_git_diff, git_git_status, git_git_log | Always |
| Code search | semantic_search, glob, grep, LSP (built-in) | Always |
| Run commands | bash (tests, lint, build, typecheck) | Always |

## NEVER
- Ask permission to continue — just keep going.
- Implement multiple stories at once.
- Skip verification before marking complete.
- Commit broken code or with failing tests.
- Leave placeholder implementations.
- Use git bash commands when git_git_* MCP tools are available.
```

## MCP Server: `ralph` — State Offloader

The MCP server stores PRD state outside the agent's context window. This is the critical difference from ralph-tui: ralph-tui injects the full PRD + progress + patterns into every prompt. Our MCP keeps the agent's context minimal — one story at a time.

### MCP Tools (8)

| Tool | Purpose | Key Detail |
|------|---------|-----------|
| `ralph_load_prd(path)` | Parse PRD → state.json | Parses US-XXX sections. Detects existing state for resume. |
| `ralph_next_story()` | Next pending story | Returns ONE story. Respects priorities + dependency chains. Returns `{done:true}` when none left. |
| `ralph_verify_story(id, evidence)` | Mark story complete | Records evidence string. Updates progress count. |
| `ralph_block_story(id, reason)` | Mark story blocked | Human intervention needed. Skipped by next_story. |
| `ralph_status()` | Full progress snapshot | Stories, learnings, stack info, iteration count. |
| `ralph_learn(lesson, category, storyId?)` | Persist pattern/gotcha | Structured. Survives compaction and session restarts. |
| `ralph_complete()` | Finalize | Writes `.ralph/COMPLETE` sentinel. Archives state. |
| `ralph_detect_stack()` | Detect project stack | Reads package.json, Cargo.toml, etc. Returns verify/lint commands. |

### State File (`.ralph/state.json`)

```json
{
  "prdPath": "docs/user-auth.md",
  "prdName": "user-auth",
  "startedAt": "2026-06-15T12:00:00Z",
  "complete": false,
  "detectedStack": {
    "stack": "node",
    "framework": "nuxt",
    "packageManager": "npm",
    "verifyCmd": "npx vitest run",
    "lintCmd": "npm run lint"
  },
  "stories": [
    {
      "id": "US-001",
      "title": "Password hashing utility",
      "priority": 1,
      "dependsOn": [],
      "status": "complete",
      "verifiedAt": "2026-06-15T12:05:00Z",
      "evidence": "tausik_verify: 8/8 tests pass, lint clean, tsc no errors"
    },
    {
      "id": "US-002",
      "title": "Login endpoint",
      "priority": 1,
      "dependsOn": ["US-001"],
      "status": "active"
    },
    {
      "id": "US-003",
      "title": "Registration endpoint",
      "priority": 2,
      "dependsOn": ["US-001"],
      "status": "pending"
    },
    {
      "id": "US-004",
      "title": "Password reset flow",
      "priority": 3,
      "dependsOn": ["US-002"],
      "status": "blocked",
      "blockReason": "Email service not configured. Human needed to set SMTP."
    }
  ],
  "learnings": [
    {
      "lesson": "Use scrypt, not bcrypt (project convention via pm_knowledge)",
      "category": "convention",
      "storyId": "US-001",
      "timestamp": "2026-06-15T12:03:00Z"
    }
  ],
  "iteration": 4
}
```

### PRD Parser (prd-parser.ts)

Parses the markdown PRD format. Regex-based, fails gracefully.

```typescript
interface ParsedStory {
  id: string           // "US-001"
  title: string        // "Password hashing utility"
  priority: number     // 1
  dependsOn: string[]  // []
  description: string  // "As a developer, I want..."
  acceptanceCriteria: string[]  // criteria lines
  status: 'pending'
}
```

Split on `### US-XXX`, extract metadata via regex.

## Files to Create

| File | Est. Lines | Purpose |
|------|-----------|---------|
| `mcp-servers/ralph/package.json` | 20 | MCP server package |
| `mcp-servers/ralph/tsconfig.json` | 16 | TypeScript config |
| `mcp-servers/ralph/src/index.ts` | 45 | MCP entry point, stdio transport, 8 tools |
| `mcp-servers/ralph/src/tools/index.ts` | 15 | Tool registry |
| `mcp-servers/ralph/src/tools/load-prd.ts` | 60 | `ralph_load_prd` |
| `mcp-servers/ralph/src/tools/next-story.ts` | 50 | `ralph_next_story` |
| `mcp-servers/ralph/src/tools/verify-story.ts` | 30 | `ralph_verify_story` |
| `mcp-servers/ralph/src/tools/block-story.ts` | 35 | `ralph_block_story` |
| `mcp-servers/ralph/src/tools/learn.ts` | 35 | `ralph_learn` |
| `mcp-servers/ralph/src/tools/status.ts` | 40 | `ralph_status` |
| `mcp-servers/ralph/src/tools/complete.ts` | 30 | `ralph_complete` |
| `mcp-servers/ralph/src/tools/detect-stack.ts` | 55 | `ralph_detect_stack` |
| `mcp-servers/ralph/src/state.ts` | 70 | State manager: read/write/validate state.json |
| `mcp-servers/ralph/src/prd-parser.ts` | 50 | PRD markdown → stories[] |
| `mcp-servers/ralph/src/tools/utils.ts` | 40 | Shared: fs, git-log scanning |
| `.kilo/agents/prd.md` | 80 | PRD interview agent (strict mode architect) |
| `.kilo/agents/ralph.md` | 70 | Ralph execution agent |
| `kilo.json` (update) | +15 | Register ralph MCP + 2 agents |

## Files to NOT Touch

- `mcp-servers/puppetmaster/` — existing PM server
- Existing agents (architect, code-reviewer, summary, title, etc.)
- `tools/ralph-tui/` — may remove later, kept for now
- `tools/wrappers/` — existing wrappers
- `.kilo/commands/` — no commands needed (agent switch, not slash command)

## Workflow (User Experience)

```
1. Open Kilo TUI
2. Switch to prd agent
3. Type: "I want user authentication for my Nuxt PM site"
   ↓
   prd agent: detects stack (Nuxt + PM Framework)
   prd agent: interviews (5-8 structured questions)
   prd agent: creates docs/user-auth.md with 8 stories
   prd agent: "8 stories created. Switch to ralph agent to execute."

4. Switch to ralph agent
5. Type: "Execute docs/user-auth.md"
   ↓
   ralph agent: loads PRD (MCP)
   ralph agent: story by story, verify, commit, learn
   [US-001 ✓] [US-002 ✓] [US-003 ✗...fixed...✓] [US-004 blocked: SMTP]
   
   ralph agent: "7/8 stories complete. US-004 blocked: SMTP not configured.
                Human needed. To resume after fixing: 'Continue execution'."

6. User: configures SMTP
7. User (in same session, still ralph agent): "Continue execution"
   ralph agent: ralph_next_story() → US-004
   [US-004 ✓]
   
   ralph agent: "All 8 stories complete. <promise>COMPLETE</promise>"
```

## Verification Checklist

1. MCP server starts: `npx tsx src/index.ts` — stdio ready, no errors
2. `ralph_load_prd` parses a PRD → correct stories in state.json
3. `ralph_next_story` respects priority order and dependency chains
4. `ralph_next_story` returns `{ done: true }` when all complete/blocked
5. `ralph_verify_story` updates state correctly
6. `ralph_block_story` marks as blocked with reason
7. `ralph_learn` appends structured learning
8. `ralph_status` returns full progress + learnings
9. `ralph_complete` writes COMPLETE sentinel + archives
10. `ralph_detect_stack` correctly identifies: PM, Node/Nuxt, Rust, Python, Go, Elixir
11. State survives server restart
12. `prd` agent loads in Kilo: `kilo run --agent prd` (verification only)
13. `prd` agent produces valid PRD from an interview
14. `ralph` agent loads in Kilo: `kilo run --agent ralph` (verification only)
15. `ralph` agent calls MCP tools in correct sequence
16. `ralph` agent composes with tausik, git, bash, puppeteer in session

## ISO 25010

| Dimension | Risk | Notes |
|-----------|------|-------|
| Functional Suitability | ✅ Low | MCP standard; simple PRD format; proven Wiggum pattern |
| Reliability | ⚠️ Medium | State file recovery; max 3 retries; blocked story handling |
| Performance Efficiency | ✅ Low | File-based state; 1 story/turn; minimal context usage |
| Usability | ✅ Low | Switch agents inside TUI; zero commands to remember |
| Security | ✅ Low | `.ralph/` directory only; no secrets |
| Compatibility | ✅ Low | MCP transport; PRD is standard markdown |
| Maintainability | ✅ Low | 8 tools + parser + state — each < 70 lines |
| Portability | ✅ Low | Node.js 22+ + MCP SDK only |

## Edge Cases

| Case | Handling |
|------|----------|
| PRD has no US-XXX sections | `ralph_load_prd` returns error: "No user stories found. Expected ### US-XXX sections." |
| Unmet dependency | `ralph_next_story` skips; returns next ready story |
| Circular dependency | Parser rejects on load: "Circular: US-003 ↔ US-004" |
| Resume after session end | `ralph_load_prd` detects existing state.json → resumes |
| State corrupted | Re-parse PRD; scan git log for "US-XXX" in commit messages |
| All remaining stories blocked | `ralph_next_story` → `{ done: true }`; agent reports blocked list |
| 3 failures on same story | Marked dead_end via `ralph_learn`; agent moves to next |
| No git repo | Warns but continues; git commit step skipped |
| Stack not detected | `ralph_detect_stack` returns unknown; agent asks user |

## Risks

1. **PRD parser fragility** — regex on markdown. Mitigation: clear error messages. `prd` agent produces consistent format.
2. **Resume accuracy** — re-determining completion from git log is imperfect. Mitigation: state.json is source of truth; git log is secondary.
3. **Agent stubbornness** — might not move on from stuck stories. Mitigation: explicit "After 3 failures, block and move on" in ralph agent prompt.
4. **No stop hook in Kilo** — agent can choose to stop early. Mitigation: agent has continuous work to do (`ralph_next_story` returns stories). Natural completion, not forced.
