# Code Review Enhancement Plan

## Goal

Three-pronged enhancement:
1. Upgrade Kilo `code-reviewer` agent to Traycer-level depth
2. Add CodeWhale-based review (different tool eye)
3. Assess Ralph TUI integration value

---

## 1. Kilo `code-reviewer` — Current vs Target

### Current (kilo.json:90-100)

3-line generic prompt. No methodology, no output format, no taxonomy, no security checklist.

```json
"prompt": "You are a senior software engineer conducting thorough code reviews. 
You focus on code quality, security, performance, and maintainability.\n\n\n
Provide constructive feedback on code patterns, potential bugs, security issues, 
and improvement opportunities. Be specific and actionable in suggestions.\n"
```

### Target: Traycer-Level Review Methodology

**Output Format** — always write to `findings.md` with this structure:

```markdown
# Code Review: [scope]
Date: [timestamp]
Reviewer: Kilo code-reviewer agent

## Summary
- Total findings: N
- Critical: N | Major: N | Minor: N | Info: N

## Findings

### [F-001] [Severity] [Category] — [Title]
- **File**: `path/to/file.ts:L12-L45`
- **Category**: bug | logic-error | security | edge-case | performance | 
               maintainability | missing-error-handling | data-race | leak
- **What's wrong**: [clear, specific description]
- **Why it matters**: [impact]
- **Suggested fix**: [actionable suggestion, optionally with code snippet]
- **OWASP**: [reference if applicable]
```

**Review Methodology** — must perform these passes:

1. **Codebase understanding pass** — read enough of the codebase to understand what it does and what it *should* do. Identify the architecture patterns, data flow, and key abstractions.

2. **Security pass** — OWASP Top 10 (2021):
   - A01 Broken Access Control — auth guards, role checks, ownership validation
   - A02 Cryptographic Failures — plaintext secrets, weak hashing, no timing-safe comparison
   - A03 Injection — raw SQL, unsanitized HTML, missing Zod validation
   - A04 Insecure Design — missing rate limits, no CSRF, no audit logging
   - A05 Security Misconfiguration — default passwords, verbose errors, missing security headers
   - A06 Vulnerable Components — outdated deps with known CVEs
   - A07 Auth Failures — weak password policy, no 2FA, no account lockout
   - A08 Software Integrity — no magic byte validation, no virus scanning
   - A09 Logging Failures — no audit events for sensitive actions
   - A10 SSRF — unsanitized URL fetching

3. **Logic & correctness pass** — trace control flow, find edge cases, null/undefined handling, race conditions, off-by-one errors, incorrect assumptions.

4. **Error handling pass** — missing try/catch, swallowed errors, no user-facing error messages, missing validation on external inputs.

5. **Performance pass** — N+1 queries, missing indexes, unnecessary allocations, blocking operations, unbounded loops/collections.

6. **Maintainability pass** — over-abstraction, magic numbers, dead code, inconsistent patterns, missing types.

**Severity definitions**:
- **Critical**: Security vulnerability, data loss/corruption, crash in production
- **Major**: Logic bug affecting functionality, significant performance regression, missing error handling that would break UX
- **Minor**: Code smell, minor edge case, stylistic inconsistency that could cause confusion
- **Info**: Observation, suggestion for improvement, note on pattern usage

**Rules**:
- NEVER modify any source files (permission-enforced: `edit: deny`)
- NEVER run `git commit` or any git mutation commands
- Only write to `findings.md`
- If the codebase is too large for one pass, review in chunks: models → services → routes → UI
- Reference specific files and line numbers
- Suggest concrete fixes, not vague guidance
- Flag missing tests as a finding (category: `missing-tests`)

### Changes to kilo.json

```json
"code-reviewer": {
  "mode": "primary",
  "description": "Senior Code Reviewer — Traycer-level verification: security, logic, edge cases, performance. Structured findings.md output.",
  "prompt": "<the full enhanced prompt above, ~150 lines>",
  "permission": {
    "read": "allow",
    "bash": "allow",
    "edit": "deny",
    "mcp": "deny",
    "git_git_add": "deny",
    "git_git_commit": "deny"
  }
}
```

---

## 2. CodeWhale Review — Different Tool Eye

CodeWhale has no agent system like Kilo. Options:

| Approach | Pro | Con |
|---|---|---|
| Shell wrapper + prompt file | Simple, one-shot | No session persistence |
| CodeWhale skill (SKILL.md) | Loadable via `--skill` | Needs discovery of format |
| Saved session template | Resume-able | Overhead |

**Recommended**: Shell wrapper `~/.local/bin/cw-review` that calls `codewhale exec --auto` with a structured prompt targeting `findings.md`.

The prompt must be DIFFERENT from the Kilo reviewer — different tool, different methodology:
- CodeWhale can use `review` subsystem (git-diff aware) plus `exec` for deep analysis
- Encourage it to notice things Kilo might miss (different tokenization, different context windows, different model variant)
- Output to a separate file: `findings-cw.md` to avoid overwriting Kilo's findings

**Invocation**:
```bash
cw-review                     # review current repo
cw-review src/                # review specific directory
cw-review --scope auth        # review auth module
```

**Deliverable**: `~/.local/bin/cw-review` + `~/.config/codewhale/review-prompt.md`

---

## 3. Ralph TUI — Integration Assessment

### What Ralph TUI does

| Feature | Value |
|---|---|
| Task orchestration loop | Reads prd.json, executes tasks in order |
| TUI dashboard | Visual progress, pause/resume, session persistence |
| Parallel execution | Multi-worker with git worktrees |
| Crash recovery | Session saves state, resume from last checkpoint |
| Remote management | WebSocket-based multi-machine control |

### Does it fit our flow?

**Our confirmed flow**:
```
Phase 1: Kilo architect → prd.json + spec.md
Phase 2: Kilo interactive → manual task-by-task development
Phase 3: Kilo reviewer + CodeWhale → dual findings.md
```

**Mismatch**: Phase 2 is interactive `kilo` sessions — not automated. Ralph's core value is autonomous orchestration, not manual-progress tracking.

### Where Ralph COULD add value

| Scenario | Ralph TUI role | Value |
|---|---|---|
| **Batch execution** of simple PRD tasks | Autonomous loop with `kilo run` | Run 5-10 trivial tasks unattended |
| **Multi-day task lists** | Session persistence | Pause day 1, resume day 2 at same task |
| **Visual progress board** | TUI dashboard | See done/pending/review status at a glance |
| **Parallel independent tasks** | git worktrees | Two Kilo instances working on isolated tasks simultaneously |

### Verdict

**Low priority, high optional**. Not needed for the core Plan → Develop → Review flow. 

Re-evaluate if/when:
- You accumulate >20 PRD tasks and want a visual board
- You want to batch-execute simple tasks overnight
- You need to parallelize independent tasks across git worktrees

For now: Ralph TUI stays installed and configured (kilo-ralph wrapper, config.toml) but is NOT part of the core workflow. Available as a power tool when needed.

---

## 4. Files to Create/Modify

| # | File | Action | Purpose |
|---|---|---|---|
| 1 | `~/.config/kilo/kilo.json` | Modify `code-reviewer` entry | Enhanced reviewer prompt |
| 2 | `~/.local/bin/cw-review` | Create | CodeWhale review wrapper |
| 3 | `~/.config/codewhale/review-prompt.md` | Create | Review prompt template for CodeWhale |

### Phase 3 invocation flow

```bash
# After completing a task in Phase 2 (interactive Kilo):

# Review pass 1 — same tool, different agent
kilo run --agent code-reviewer "Review the codebase. Write findings to findings.md" --dangerously-skip-permissions

# Review pass 2 — different tool, different eye
cw-review

# Both outputs: findings.md + findings-cw.md
# Compare, merge, then back to Phase 2 for fixes
```

---

## 5. Verification

| Check | Method |
|---|---|
| Kilo reviewer produces structured findings.md | Run on this project, check output |
| CodeWhale wrapper invokes correctly | `cw-review` exits with findings-cw.md |
| Both findings files are non-empty | wc -l findings*.md |
| Ralph TUI config preserved, not broken | `ralph-tui doctor` still passes |
