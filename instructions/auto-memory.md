# Auto Memory — Cross-Session Knowledge

## Concept

Auto memory lets you accumulate knowledge across sessions. Every significant discovery, pattern, or preference is saved to `~/.kilo/memory/<project-slug>/MEMORY.md` and loaded at the start of every session (first 200 lines).

This is NOT a replacement for AGENTS.md instructions. AGENTS.md = instructions you write. Auto memory = learnings discovered during work.

## Session Start (REQUIRED: Run at every boot)

1. Determine the project slug from the git remote or working directory name
2. Read `~/.kilo/memory/<project-slug>/MEMORY.md` (if it exists)
3. Note any relevant entries to the conversation — they're your past learnings
4. If MEMORY.md doesn't exist, say "No prior memory for this project"

## During Work (Automatic — run after any significant discovery)

Save learnings when you discover:
- Build/test commands — `npm run dev`, `cargo build`, `pytest tests/`
- Debugging insights — "The auth module fails because X"
- Architecture patterns — "Components live in src/components/, pages in src/pages/"
- Preferences expressed by the user — "Always use pnpm", "2-space indent"
- Gotchas — "Don't use raw SQL, always use Drizzle ORM"
- Common mistakes — "Forgetting to run migrations causes mysterious 500s"

Save using `task` to invoke the `memory-manager` skill:
```
task(
  description: "Save memory",
  prompt: "Save to project memory: {topic}: {content}. Use the memory-manager skill.",
  subagent_type: "general"
)
```

## Session End (Run before completing)

Consolidate this session's learnings into `~/.kilo/memory/<project-slug>/MEMORY.md`:
- Keep each entry to 1-2 sentences
- Remove outdated or superseded entries
- Group related entries under headers
- Keep MEMORY.md under 200 lines — archive detailed notes to topic files

## Memory File Format

```
# Memory: <project-name>

## Build & Run
- `npm run dev` — start dev server
- `npm test` — run tests

## Architecture
- API routes: src/server/routes/
- DB schema: src/server/db/schema/

## Preferences
- Use pnpm, not npm
- 2-space indent
- Components in src/components/

## Debugging
- Auth failures: check .env for AUTH_SECRET
- Slow queries: look for missing indexes in schema/
```

## Topic Files

For detailed notes (>5 entries on one topic), create topic files:
`~/.kilo/memory/<project-slug>/<topic>.md`

Reference them from MEMORY.md with a one-liner:
```
## Debugging
See debugging.md for auth and query troubleshooting
```

Topic files are NOT loaded at session start — they're read on demand.
