---
description: List and restore to a saved checkpoint
---

# /restore — Restore to a Saved Checkpoint

List all saved checkpoints and restore the working tree to one of them.

## Steps

1. List all checkpoints: `bash: git tag -l 'kg-ck-*' --format='%(refname:short) %(contents:subject)' | sort`
2. If a specific checkpoint name was given in the user's message, use it. Otherwise, show the list and ask: `question(header: "Restore checkpoint", options: [{label: tag1}, {label: tag2}, {label: "Latest"}])`
3. Restore working tree:
   - `bash: git stash` (save any current uncommitted work first)
   - `bash: git checkout tags/{checkpoint-tag}` (detached HEAD at checkpoint)
   - `bash: git checkout -B {current-branch}` (reattach to branch)
4. If there are stashed changes after restore, `bash: git stash pop`
5. Report: "Restored to checkpoint: [tag name] — [description]"
6. Optional: `bash: git tag -d {checkpoint-tag}` to clean up the checkpoint after restoring
