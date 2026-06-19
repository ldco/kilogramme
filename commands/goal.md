---
description: Set a completion goal for the session — repeat until condition holds
---

# /goal — Keep Working Until Done

Set a goal condition that the agent must satisfy before stopping. The agent loops: work, verify, report progress, repeat.

## Usage

```
/goal Make all tests pass
/goal Migrate the auth module to TypeScript
/goal Fix all lint errors in src/
```

## Behavior

1. The goal is recorded as the session objective
2. After each action, verify if the goal condition is met (run tests, lint, check output)
3. If goal is met: report success and stop
4. If goal is NOT met: continue working, report partial progress
5. The agent persists across turns — it does NOT ask "should I continue?"

## When to Stop

Stop ONLY when the condition is verifiably met. If progress stalls (3 consecutive turns with no forward movement), report the blocker and ask for guidance.

## Edge Cases

- If the goal is impossible (contradictory, no clear path): report why and stop
- If the goal requires human input: ask once, then adapt
- If tests/lint don't exist yet: create them as part of the work
