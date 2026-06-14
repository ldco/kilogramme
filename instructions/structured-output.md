# Structured Output Instruction (Cline-Inspired)

Reference for: headless CLI, JSON output, pipe-friendly responses, CI/CD integration.

---

## When to Output Structured JSON

Output structured JSON when:
- The user explicitly asks for JSON (`/json`, `--json`, "output as JSON")
- The user asks for results that will be piped to another tool (`| jq`, `> file.json`)
- The user is clearly scripting/automating (CI/CD context, shell pipeline)
- A command with `subtask: true` needs structured results for the parent agent

## JSON Output Format

When outputting JSON, wrap it in a markdown code fence and use this schema:

```json
{
  "ok": true,
  "action": "what was done",
  "result": {},
  "stats": {},
  "errors": []
}
```

### Schema by Task Type

**Code changes:**
```json
{
  "ok": true,
  "action": "code_change",
  "result": {
    "files_changed": ["path/to/file.ts"],
    "files_created": ["path/to/new.ts"],
    "files_deleted": [],
    "commit": "abc1234",
    "commit_message": "feat(scope): description"
  },
  "stats": {
    "lines_added": 42,
    "lines_removed": 3,
    "files_total": 2
  },
  "errors": []
}
```

**Quality check:**
```json
{
  "ok": true,
  "action": "quality_check",
  "result": {
    "lint": { "passed": true, "errors": 0, "warnings": 0 },
    "types": { "passed": true, "errors": 0 },
    "tests": { "passed": 15, "failed": 0, "skipped": 0 }
  },
  "stats": { "duration_ms": 3200 },
  "errors": []
}
```

**Repository map:**
```json
{
  "ok": true,
  "action": "repomap",
  "result": {
    "project_name": "my-app",
    "project_type": "nuxt",
    "language": "typescript",
    "directories": ["server/", "client/", "shared/"],
    "modules": [
      { "name": "auth", "files": ["middleware/auth.ts"], "responsibility": "Authentication" }
    ]
  },
  "stats": { "files_indexed": 245, "modules_found": 8 },
  "errors": []
}
```

**Error response:**
```json
{
  "ok": false,
  "action": "what_was_attempted",
  "result": {},
  "stats": {},
  "errors": [
    {
      "code": "LINT_ERROR",
      "message": "Expected indentation of 2 spaces",
      "file": "src/foo.ts",
      "line": 42
    }
  ]
}
```

## Rules for JSON Output

1. Always include `ok: boolean` — top-level success/failure indicator
2. `action` is a snake_case string describing what happened
3. `result` contains the primary output (can be empty object if error)
4. `stats` contains optional metrics (lines, counts, duration)
5. `errors` is always an array, empty on success
6. Use consistent types — don't mix string/array for the same field
7. If a pipeline command fails, still output JSON with `ok: false` and the error

## When NOT to Output JSON

- Normal interactive conversation (use markdown, tables, prose)
- When the user just asked a question ("what does this do?")
- During multi-step tasks where intermediate output is for human review
