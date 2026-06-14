---
description: Plan a coding task using the architect agent before writing code
subtask: true
---

# /plan — Design First, Code Later

You are the Plan step of the Plan/Act workflow. Analyze the user's task with the architect agent, generate an implementation plan, and save it. Do NOT write any implementation code.

## Steps

1. **Understand the task** — Parse what the user wants. If unclear, ask clarifying questions (but keep it brief — Plan mode should be fast).

2. **Survey the repo** — Run a quick repomap survey:
   - Read top-level directory
   - Use `semantic_search` to find related code
   - Identify which files are in scope

3. **Delegate to architect** — Use `task` to invoke the `architect` subagent:
   ```
   task(
     description: "Plan task",
     prompt: "Analyze this task: {user's request}. 
              Survey the relevant code. 
              Output: 
              1. Files to change (with line estimates)
              2. Files to NOT touch
              3. Dependencies between files
              4. Risks and edge cases
              5. Acceptance criteria
              Save the plan as .kilo/plans/{task-slug}.md",
     subagent_type: "general"
   )
   ```

4. **Save the plan** — Write the plan to `.kilo/plans/{kebab-case-task-name}.md` with this structure:
   ```markdown
   # Plan: {Title}
   
   **Date:** {date}
   **Status:** planned
   
   ## Goal
   {one-line summary}
   
   ## Files to Change
   | File | Change | Est. Lines |
   |------|--------|-----------|
   | src/foo.ts | Modify | +10 |
   
   ## Files to NOT Touch
   - src/bar.ts — unrelated
   
   ## Dependencies
   - X depends on Y
   
   ## Acceptance Criteria
   1. Test passes
   2. Lint clean
   
   ## Risks
   - Potential risk 1
   ```

5. **Report** — Output the plan summary and prompt the user: "Plan saved. Review it, then run `/act` to implement."
