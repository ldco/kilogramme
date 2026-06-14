---
description: Save a git checkpoint (stash + tag) before a risky change
---

# /checkpoint — Save Working State

Save the current working tree as a named checkpoint so you can restore later if things go wrong. Uses `git stash` + `git tag` for reliable point-in-time snapshots.

## Steps

1. Check current state: `git_git_status`
2. If there are uncommitted changes:
   - Stash everything: `bash: git stash push -u -m "kg-ck: {description or 'checkpoint at' + timestamp}"`
3. Tag the current HEAD as a restore point:
   - `bash: git tag "kg-ck-$(date +%Y%m%d-%H%M%S)" -m "kg-ck: {description}"`
4. If there were stashed changes, pop them back:
   - `bash: git stash pop`
5. Confirm: "Checkpoint saved: `[tag name]` — use `/restore` to go back"
6. If no description given, auto-generate one from recent activity or git log.
