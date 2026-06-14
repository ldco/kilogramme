# Repository Map Instruction (Aider-Inspired)

Aider's repomap is its killer feature — it builds a concise, token-optimized mental model of the entire codebase before making any changes. You MUST follow this pattern before editing any file in an unfamiliar area of the codebase.

---

## When to Survey the Repo

Survey the repo when:
- Starting work in a new part of the codebase
- Asked to refactor or restructure
- Need to understand how modules connect
- Before writing code that spans multiple directories

You do NOT need to survey when:
- Making a small, localized edit to a file you already read
- The user explicitly points to a specific file/function
- Returning to work you started moments ago in the same session

## Survey Protocol

### Phase 1: Structure Discovery (lightweight)

1. Read the top-level directory listing
2. Identify key directories: `src/`, `server/`, `lib/`, `components/`, etc.
3. Read `package.json` for dependencies, scripts, and project type

### Phase 2: Module Map (medium)

For the relevant directories:

```markdown
## Module Map: <area>

**Entry points:**
- `src/index.ts` — main entry, starts server
- `src/app.ts` — Express/Fastify app setup

**Key files by responsibility:**
| File | Responsibility |
|---|---|
| `src/middleware/auth.ts` | Session validation, role checks |
| `src/routes/api.ts` | API route definitions |
| `src/utils/db.ts` | Database connection pool |

**Shared utilities:**
- `src/utils/` — 12 files (auth, db, validation, etc.)

**Data flow:**
Request → middleware → route handler → service → database
         ↓
      auth.ts validates session
```

### Phase 3: Implementation-Ready Plan (when needed)

Before writing code, output:

```markdown
## Plan

**Goal:** <one-line summary>

**Files to change:**
1. `src/utils/auth.ts` — add `verifyBackupCode()` function
2. `src/routes/auth.ts` — add `POST /api/auth/verify-backup` endpoint

**Files to NOT touch (even though related):**
- `src/middleware/csrf.ts` — no change needed, endpoint is CSRF-exempt

**Dependencies:**
- `src/utils/totp.ts` — call `verifyTOTP()` before backup code check
- `src/utils/audit.ts` — log backup code verification

**Risks:**
- ⚠️ Changing auth flow — must verify all existing tests still pass
```

---

## Survey Depth Rules

| Change Size | Survey Depth | Time Budget |
|---|---|---|
| **Small** (<50 lines, 1-2 files) | Phase 1 only | <30 seconds |
| **Medium** (50-200 lines, 3-5 files) | Phase 2 | <2 minutes |
| **Large** (>200 lines, 5+ files) | Phase 3 + existing test discovery | <5 minutes |

---

## Integration with Semantic Search

Kilo's `semantic_search` tool can find related code by meaning. Use it as a complement to the structural survey:

```
1. Phase 1: Read directory structure
2. semantic_search("authentication flow") → find related code
3. Phase 2: Build module map using both structural + semantic results
```

---

## Anti-Patterns

- ❌ Reading 50 files before making a 5-line fix
- ❌ Making changes without understanding what other files depend on the changed file
- ❌ Blindly editing files without reading surrounding code for context
- ✅ Reading the target file + its imports + any file that imports it
- ✅ Searching for tests related to the file before changing it
