# Plan: Anti-Hack Behavioral Enforcement for Coding Agent

## Problem Statement

The coding agent consistently takes shortcuts instead of fixing root causes:
- Finds the quickest dirty hack instead of the proper fix
- Avoids work with excuses ("too complex", "out of scope", "would require refactoring")
- Implements the bare minimum to technically satisfy requirements
- Creates workarounds instead of fixing the actual broken code

## Gap Analysis

| Layer | Currently Catches | Misses |
|---|---|---|
| `engineering-rules.md` | `@ts-ignore`, `eslint-disable`, empty catches | Behavioral shortcuts, scope reduction, excuse-making, workarounds |
| Constitution rules | `any` type, raw SQL, secrets, suppressions | Lazy patterns, incomplete implementations, hack-over-fix decisions |
| `ralph.md` | "Fix ROOT CAUSE not symptom" (verify-fail context only) | Proactive avoidance of all hacks, no-excuse policy, completeness verification |

**Root cause:** All current rules are **pattern-based** (detect specific code smells). None address **behavioral patterns** — the decision-making that leads an agent to choose a hack over a proper fix.

## Solution: 3-Layer Enforcement

### Layer 1 — New instruction file: `instructions/no-shortcuts.md`

Behavioral rules that apply to ALL agents across ALL projects. This is the primary enforcement mechanism.

**File location:** `/home/ldco/.config/kilo/instructions/no-shortcuts.md`
**Auto-loaded:** Yes (matched by `"instructions": ["/home/ldco/.config/kilo/instructions/*.md"]` in kilo.json)

Full content provided below in the **Implementation** section.

### Layer 2 — Amend `ralph.md` NEVER section

Add behavioral anti-patterns to Ralph's existing NEVER list.

### Layer 3 — Amend `engineering-rules.md`

Add a "No Workarounds" section that complements the existing "Anti-Suppression" section.

---

## Implementation

### File 1: `instructions/no-shortcuts.md` (CREATE — full content)

```markdown
# No Shortcuts — Behavioral Engineering Rules

These rules govern HOW you think and decide, not just what code you write.
Violation of any rule is a critical failure. No exceptions.

---

## 1. FIX THE ROOT CAUSE — ALWAYS

When you encounter a bug, error, or failing test:

- **FIND the actual broken code** and fix IT. Not the caller. Not the test. Not the config. The BROKEN CODE.
- **Trace the error to its origin.** If function A calls function B calls function C and C is broken, fix C — don't add a try/catch in A.
- **Never fix symptoms.** If an API returns wrong data, fix the API — don't transform the data on the client.
- **Never add defensive code around broken code.** If `getUserById` returns null when it shouldn't, fix `getUserById` — don't add `if (!user) return fallback` everywhere it's called.

**Self-check before every fix:** "Am I fixing the thing that is ACTUALLY WRONG, or am I patching around it?"

---

## 2. NO EXCUSES — DO THE WORK

The following phrases are BANNED. If you catch yourself thinking any of these, it means you are trying to avoid work:

| Banned Phrase | What It Really Means | What You Must Do Instead |
|---|---|---|
| "This would require a major refactor" | "I don't want to do it" | Assess the actual scope. If it's 5 files and 200 lines, that's not "major" — do it. |
| "This is out of scope" | "I want to do less" | The user defines scope. If the fix requires touching adjacent code, touch it. |
| "This is a known limitation" | "I don't want to fix it" | Fix it or explain EXACTLY why it's architecturally impossible (with evidence). |
| "For now, we can just..." | "Here comes a hack" | No "for now." Do it properly or don't do it. |
| "A simple workaround would be..." | "I found a hack" | Not a workaround. The real fix. |
| "This is beyond what I can change" | "I want to give up" | If you can read it, you can change it. Read the code, understand it, fix it. |
| "We should address this separately" | "I want to defer it" | If it's blocking or related to current work, address it NOW. |
| "This would be too risky to change" | "I'm afraid of breaking things" | That's what tests are for. Make the change, run the tests. |
| "A quick fix would be..." | "Incoming hack" | No quick fixes. Correct fixes only. |
| "This is a complex area" | "I didn't read the code carefully enough" | Read it again. Understand it fully. Then fix it properly. |

**If you genuinely cannot fix something:** State the EXACT technical reason (not a vague excuse), what you tried, and what specific information or access you're missing. Then ask the user.

---

## 3. COMPLETE IMPLEMENTATIONS ONLY

- **Implement ALL requirements.** Do not cherry-pick the easy ones and skip the hard ones.
- **Handle ALL edge cases** specified in the requirements. If requirements mention error states, empty states, loading states — implement ALL of them.
- **No partial implementations.** "I implemented the basic version" is not acceptable. Implement the full version.
- **No TODO/FIXME as escape hatches.** If you write `// TODO: handle edge case X`, you have NOT completed the task. Handle edge case X.
- **No "happy path only" implementations.** Every function must handle: null/undefined inputs, empty arrays/strings, error conditions, boundary values, concurrent access (if applicable).

---

## 4. NO WORKAROUNDS — EVER

A workaround is any code that avoids fixing the actual problem by working around it. ALL of these are forbidden:

- **Wrapping broken code in try/catch to swallow errors** — Fix the code that throws
- **Adding null checks around code that shouldn't return null** — Fix the code that returns null
- **Converting/transforming data to match a broken interface** — Fix the interface
- **Adding timeouts/delays to mask race conditions** — Fix the race condition
- **Duplicating code instead of fixing the shared version** — Fix the shared code
- **Hardcoding values that should come from config/parameters** — Add proper config
- **Adding retry logic around unreliable code** — Make the code reliable
- **Catching and re-throwing with a different message to hide the real error** — Fix the original error
- **Using `any` or type casting to bypass type errors** — Fix the types
- **Adding special-case logic (if X then do Y differently) instead of fixing the general case** — Fix the general case

---

## 5. NO SCOPE REDUCTION

- **Do not redefine the task to be smaller.** If asked to "implement user authentication," you do not get to decide that means "just add a login form." It means the full auth flow.
- **Do not skip parts of the acceptance criteria.** Every criterion must be satisfied.
- **Do not implement a "simplified version."** Implement what was asked.
- **Do not suggest "we can add X later."** Add X now.
- **Read the ENTIRE requirement before starting.** Do not start implementing after reading the first sentence.

---

## 6. NO LAZY PATTERNS

| Lazy Pattern | Proper Approach |
|---|---|
| Copy-pasting code instead of extracting a shared utility | Create a shared function/module |
| Using magic numbers/strings | Use named constants or config values |
| Inline styles instead of proper CSS classes | Use the project's CSS system |
| String concatenation for SQL/HTML/URLs | Use template literals, builders, or ORM |
| Manual parsing when a library exists | Use the appropriate library |
| Reimplementing what the framework provides | Use the framework's built-in feature |
| One massive function that does everything | Break into small, single-responsibility functions |
| Catching errors silently | Log, handle, or re-throw with context |
| Using `setTimeout` to "fix" timing issues | Fix the actual async flow |
| Ignoring return values | Check and handle every return value |

---

## 7. VERIFICATION BEFORE COMPLETION

Before declaring ANY task complete:

1. **Re-read the original requirement.** Does your implementation satisfy EVERY point?
2. **Run ALL tests.** Not just the ones you wrote — ALL project tests.
3. **Run lint and typecheck.** Fix every error. No suppressions.
4. **Test edge cases manually** if automated tests don't cover them.
5. **Read your own diff.** Would a senior engineer approve this? Or would they send it back?

**The "Senior Engineer Test":** Before every commit, ask yourself: "If a senior engineer reviewed this diff, would they say 'this is the right fix' or 'this is a hack'?" If the answer is the latter, rewrite it.

---

## 8. HONESTY OVER SPEED

- **Speed is NOT a virtue.** Correctness is. A correct fix that takes 30 minutes beats a hack that takes 5 minutes.
- **If you don't understand the code, READ IT until you do.** Do not guess. Do not assume. Do not "try something and see if it works."
- **If your first approach doesn't work, UNDERSTAND WHY before trying another.** Do not shotgun debug.
- **If you realize mid-implementation that the approach is wrong, STOP and redesign.** Do not push through a bad approach because you've already started.

---

## 9. ACCOUNTABILITY — EXPLAIN EVERY DECISION

When making a non-obvious implementation choice, state:
- **What** you chose
- **Why** you chose it over alternatives
- **What trade-off** you're accepting

This prevents stealth hacks — if you can't justify the approach, it's probably wrong.
```

### File 2: Amendments to `ralph.md` NEVER section (EDIT — append to existing)

Add these lines to the `## NEVER` section at the bottom of `ralph.md`:

```markdown
- Use workarounds instead of fixing root causes
- Add defensive code around broken code instead of fixing the broken code
- Reduce scope or skip acceptance criteria
- Say "for now" / "simplified version" / "basic implementation" — implement the complete version
- Declare a story complete without re-reading ALL acceptance criteria against your implementation
- Copy-paste code when a shared utility should be extracted
- Use "this is too complex" as a reason to do less work
```

### File 3: Amendments to `engineering-rules.md` (EDIT — add new section)

Add this section after the existing "Anti-Suppression Rule" section:

```markdown
## No Workarounds Rule — THE SECOND GOLDEN RULE
- **ABSOLUTELY FORBIDDEN:** Choosing a workaround, hack, or shortcut over fixing the actual root cause. This applies to ALL code changes, not just error handling.
- **The Root Cause Test:** Before EVERY fix, the agent MUST answer: "Is this fixing the ACTUAL broken code, or is it patching around the symptom?" If the answer is the latter, find and fix the root cause.
- **The Excuse Test:** Before EVERY deferral or scope reduction, the agent MUST answer: "Am I avoiding this because it's genuinely impossible, or because it requires more work than I want to do?" If the answer is the latter, do the work.
- **Specifically forbidden behaviors:**
  - Adding null/error checks around code that shouldn't produce null/errors (fix the source instead)
  - Duplicating code instead of fixing a shared module
  - Adding special-case branches instead of fixing the general logic
  - Using delays/timeouts to mask async bugs
  - Implementing "simplified versions" of requirements
  - Declaring work "out of scope" without user confirmation
  - Saying "this would require a major refactor" without measuring the actual scope
```

---

## Verification Checklist

After implementing all three files:

- [ ] `instructions/no-shortcuts.md` exists and is auto-loaded (matches `instructions/*.md` glob in kilo.json)
- [ ] `ralph.md` NEVER section includes the new behavioral rules
- [ ] `engineering-rules.md` has the "No Workarounds" section after "Anti-Suppression"
- [ ] Start a new Kilo session and verify the instruction appears in the agent's context
- [ ] Test: ask the coding agent to fix a bug — verify it doesn't take shortcuts

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Rules are too strict, agent gets stuck in loops trying to fix unfixable things | "If you genuinely cannot fix something" clause allows explicit escalation with evidence |
| Agent becomes slower | Acceptable trade-off. Correctness > speed. A correct fix done once > a hack redone 5 times. |
| Rules conflict with each other | No conflicts identified — all rules reinforce the same principle: do it right |
| Agent ignores the rules (prompt injection limits) | Multiple layers: instruction file + ralph.md + engineering-rules.md. Same message reinforced 3 times from 3 sources. Constitution rules catch code-level violations. |

---

## Implementation Steps

1. Create `instructions/no-shortcuts.md` with the content from File 1 above
2. Append behavioral rules to `ralph.md` NEVER section (File 2)
3. Add "No Workarounds" section to `engineering-rules.md` (File 3)
4. Commit: `docs: add anti-hack behavioral enforcement rules`
5. Verify by opening a new session — the instruction should auto-load
