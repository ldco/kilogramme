# Aider-Inspired DX Features

Reference for: atomic changes, auto-commit, conventional commits, lint-on-edit, git-integrated workflow.

---

## 1. Atomic Change Principle

Aider makes one logical change at a time. You MUST follow this pattern:

1. Understand the request → identify the minimal set of files to change
2. Make ONE logical change (may touch multiple files but for ONE reason)
3. Show a diff summary of what changed
4. Commit the change with a conventional commit message
5. THEN (and only then) move to the next change

**Anti-pattern**: Making 5 unrelated changes across 10 files in one go, then one big commit.
**Pattern**: Change → review diff → commit → next change.

## 2. Auto-Commit Protocol

After EVERY meaningful code change (not config/tool-call noise), you MUST:

```bash
git add <changed files>
git commit -m "<type>(<scope>): <description>"
```

Commit message format (Conventional Commits):
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `style:` — formatting, missing semicolons, etc.
- `docs:` — documentation only
- `test:` — adding or fixing tests
- `chore:` — build process, tooling, dependencies

**Do NOT commit when:**
- The change is a work-in-progress (user explicitly said "draft" or "WIP")
- The change is purely a tool call (reading files, searching)
- The user said "don't commit"

**Rule**: If you edited files and the result is a complete, working state → commit it.

## 3. Pre-Commit Verification

Before committing, verify:
- [ ] Code compiles / passes typecheck (`npm run typecheck` or equivalent)
- [ ] No leftover debug prints, console.log, or TODO comments
- [ ] Related tests pass (run the specific test file if possible)
- [ ] No secrets, API keys, or passwords in the diff

If verification fails → fix → re-verify → commit.

## 4. Post-Edit Lint Loop

After every code change, run linting. If lint fails with auto-fixable issues:

```
1. Edit files
2. Run: npm run lint -- --fix (or equivalent)
3. If still failing: fix remaining issues manually
4. Run typecheck
5. Commit
```

## 5. Git Diff Before Commit

Before committing, show the user a concise diff summary:

```
## Ready to commit
feat(auth): add 2FA backup codes

Changed:
  M  server/utils/totp.ts     (+42, -3)
  M  server/routes/auth.ts    (+15, -1)
  A  server/utils/backup.ts   (+89)

Verification:
  ✓ TypeScript: no errors
  ✓ Tests: 12 passed, 0 failed
  ✓ Lint: clean
```

## 6. Undo Protocol

If the user says "undo that", "revert", or "I don't like that change":

```bash
git reset --hard HEAD~1   # If the last commit was the AI change
# OR
git checkout -- <file>     # If not yet committed
```

Then acknowledge what was reverted.

## 7. Session State Tracking

Track what you've done in this session:
- Files created/modified (with line counts)
- Commits made (with messages)
- Lint/test results
- Open issues / pending decisions

Output a session summary when asked or at the end of complex tasks.

## 8. Change Size Limits

- **Small (<50 lines)**: Direct edit + auto-commit
- **Medium (50-200 lines)**: Edit + lint + test + commit
- **Large (>200 lines)**: Break into multiple atomic commits, each <200 lines

If a change >200 lines, ask yourself: can this be split into 2+ logical commits?

## 9. Conventional Commit Scopes

Use these scopes based on the project structure:
- Scope = the main directory/module affected
- Examples: `fix(auth): ...`, `feat(api): ...`, `refactor(db): ...`
- If unsure, omit scope: `fix: ...`

## 10. Integration with Kilo's Existing Git MCP

The git MCP provides structured git operations. Prefer using:
- `git_git_status` — check working tree before committing
- `git_git_diff` / `git_git_diff_staged` — review changes
- `git_git_add` — stage files
- `git_git_commit` — commit with message
- `git_git_log` — recent history for context

Fall back to `bash` tool with `git` commands if MCP is insufficient.
