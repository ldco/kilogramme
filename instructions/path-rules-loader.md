# Path-Scoped Rules

Some instructions only apply when working on certain parts of the codebase. These are defined in `instructions/rules/*.md` with `paths:` frontmatter.

## How It Works

When you start working on a file, check if any path-scoped rules match. A rule with:

```yaml
---
paths:
  - "src/api/**/*.ts"
---
```

applies whenever you read or edit files under `src/api/`.

## Sections

| File | Applies To | Topics |
|------|-----------|--------|
| `rules/api-patterns.md` | `**/*.api.ts`, `src/routes/**` | API conventions, error formats |
| `rules/database.md` | `**/db/**`, `**/schema/**`, `**/migrations/**` | DB access patterns, migration rules |
| `rules/frontend.md` | `src/components/**`, `src/pages/**` | UI conventions, component patterns |

## Loading Rules

When you Read or Edit a file:
1. Check its path against all rule `paths:` patterns
2. If matched, load the rule content into context
3. Apply the rule's instructions to your work

## Format

Each rule file is markdown with YAML frontmatter:

```markdown
---
paths:
  - "src/api/**/*.ts"
  - "server/routes/**"
---

# API Development Rules

- All endpoints must validate input with Zod
- Return consistent error format: { error: { code, message } }
- Use the existing rateLimiter middleware for all public endpoints
```

The `paths` field uses glob patterns:
- `**/*.ts` — all TypeScript files everywhere
- `src/**/*.{ts,tsx}` — TS/TSX files under src/
- `config/*.yaml` — YAML files in config/
