---
description: Generate or improve AGENTS.md by analyzing the codebase
---

# /init — Generate Project Instructions

Analyze the current codebase and create or improve AGENTS.md with build commands, conventions, and architecture notes.

## Steps

1. **Read project manifest** — Check package.json, Cargo.toml, go.mod, pyproject.toml, Makefile, Dockerfile, docker-compose.yml, README.md
2. **Survey directory structure** — Top-level layout, src/ layout, config files
3. **Detect tooling** — Linter (ESLint, ruff, clippy), test framework (vitest, pytest, cargo test), formatter (prettier, black, rustfmt), type checker (tsc, mypy, cargo check)
4. **Check for existing AGENTS.md or CLAUDE.md** — If exists, suggest improvements rather than overwriting

## Output

Generate/update AGENTS.md with sections:

```markdown
# <Project> — Agent Instructions

## Build & Run
- `npm run dev` — start dev server
- `npm run build` — production build

## Test
- `npm test` — run all tests
- `npm run test:watch` — watch mode

## Lint & Format
- `npm run lint` — check
- `npm run format` — auto-fix

## Architecture
- [discovered from directory structure]
- [discovered from README]

## Conventions
- [discovered from existing config]
```

## When to /init

- Starting work on a new/unfamiliar project
- After significant project restructuring
- When AGENTS.md doesn't exist yet
