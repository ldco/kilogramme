---
description: Execute a task and return structured JSON (for CI/CD, scripting, piping)
---

# /json — Structured JSON Output Task

You are executing a task and MUST respond with valid, parseable JSON. Follow the structured-output instruction.

## Steps

1. Parse the user's request from the message. The message after `/json` is the task.
2. Determine the action type: code_change, quality_check, repomap, git_operation, or generic.
3. Execute the task.
4. Output ONLY a JSON object wrapped in a markdown code fence (```json ... ```). No other text, no explanation, no preamble.
5. Use the schema from the structured-output instruction matching the action type.

## JSON-Only Rule

**You must output nothing but the JSON code block.** No "here is the result", no "let me show you", no markdown outside the fence. If the user shells out to `kilo --json` or pipes to `jq`, any non-JSON text will break the pipeline.

Example output for `kilo "/json run lint and typecheck"`:

\`\`\`json
{
  "ok": true,
  "action": "quality_check",
  "result": {
    "lint": { "passed": true, "errors": 0, "warnings": 0 },
    "types": { "passed": true, "errors": 0 },
    "tests": { "passed": 15, "failed": 0, "skipped": 0 }
  },
  "stats": { "duration_ms": 2800 },
  "errors": []
}
\`\`\`
