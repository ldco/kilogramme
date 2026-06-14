---
description: Stage and commit changes with a conventional commit message
---

# /commit — Stage & Commit with Conventional Message

## Steps

1. Run `git_git_status` to see what's changed
2. Run `git_git_diff_unstaged` to review all changes
3. Run `puppetmaster_pm_review_run(scope: 'quick', fix: true)` — quick quality check (lint + types)
4. Stage all changed files: `git_git_add(repo_path, files: [...all changed files...])`
5. Generate a conventional commit message based on the diff:
   - Type: feat, fix, refactor, style, docs, test, chore
   - Scope: main module/directory affected
   - Description: one-line summary of the change
6. Commit: `puppetmaster_pm_git_commit(message: 'type(scope): description', push: false)`
7. Report summary: files changed, commit hash, quality results
