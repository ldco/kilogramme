---
description: Undo the last AI code change (git reset or checkout)
---

# /undo — Revert Last AI Change

You MUST execute the user's request to undo the last AI-made change. Do not ask for confirmation — just do it.

## Steps

1. Check git log for the most recent commit: `bash: git log -1 --format='%h %s %an'`
2. If HEAD commit was made by an AI agent (check author) and is recent:
   - `bash: git reset --hard HEAD~1` — undo the last commit
   - Report: "Reverted: [commit message] ([hash])"
3. If the last commit was NOT by AI or user wants to undo uncommitted changes:
   - `bash: git diff --name-only` — list changed files
   - `bash: git checkout -- <file>` — revert each changed file
   - If all changes: `bash: git checkout -- .`
   - Report: "Reverted N uncommitted files: [file list]"
4. Run `git_git_status` to confirm clean state.
