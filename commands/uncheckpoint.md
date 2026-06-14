---
description: Undo to the most recent checkpoint
---

# /uncheckpoint — Revert to Latest Checkpoint

Quick undo — restore the working tree to the most recent checkpoint without listing all of them.

## Steps

1. Find latest checkpoint: `bash: git tag -l 'kg-ck-*' --sort=-creatordate | head -1`
2. If no checkpoints found: "No checkpoints saved. Use /checkpoint first."
3. Save current work: `bash: git stash push -u -m "kg-ck: auto-save before uncheckpoint"`
4. Restore: `bash: git checkout tags/{latest-tag} && git checkout -B {current-branch}`
5. Report: "Reverted to checkpoint: [tag name]"
6. Offer: "Delete this checkpoint? (/checkpoint-clean)"
