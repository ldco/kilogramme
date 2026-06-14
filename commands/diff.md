---
description: Show working tree diff (unstaged + staged)
---

# /diff — Show Working Tree Changes

## Steps

1. Run `git_git_status` for overview
2. Run `git_git_diff_unstaged` for unstaged changes
3. Run `git_git_diff_staged` for staged changes (skip if empty)
4. Summarize: number of files changed, lines added/removed, by module
5. Use the format:
   ```
   ## Working Tree Diff
   - N files changed (+A -D)
   
   Unstaged:
     M  src/foo.ts
     A  src/bar.ts
   
   Staged:
     M  src/baz.ts
   ```
