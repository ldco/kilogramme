---
description: Run lint + typecheck + tests and report results
---

# /lintcheck — Quality Check (Lint + Types + Tests)

## Steps

1. Run `puppetmaster_pm_review_run(scope: 'full', fix: true)` — runs lint + types + tests with auto-fix
2. If that fails (not a PM project), fall back to:
   - `bash: npm run lint -- --fix` (or equivalent)
   - `bash: npm run typecheck` (or `npx tsc --noEmit`)
   - `bash: npm test` (or `npx vitest run`)
3. Report results in a table:
   ```
   ## Quality Check
   | Gate | Status | Details |
   |------|--------|---------|
   | Lint | ✅ | 0 errors, 0 warnings |
   | Types | ✅ | No type errors |
   | Tests | ✅ | 15 passed, 0 failed |
   ```
4. If any failures, list the specific errors and suggest fixes.
