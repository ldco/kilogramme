---
description: Survey the repo structure and output a module map (Aider-style repomap)
---

# /repomap — Build Repository Map

## Steps

1. Read the top-level directory listing
2. Read `package.json` for scripts, dependencies, project type
3. Identify key directories: `src/`, `server/`, `lib/`, `components/`, etc.
4. For each key directory, list entry points and key files by responsibility
5. Use `semantic_search` to find related code groupings
6. Document the data flow for the main paths through the system

## Output Format

```markdown
## Repository Map

**Project:** [name] | **Type:** [next/nuxt/express/etc] | **Language:** [ts/js/etc]

### Directory Structure
\```
src/
  server/
    middleware/  — auth, csrf, rate-limit
    routes/      — API route handlers
    utils/       — shared utilities
  client/
    components/  — Vue/React components
    composables/ — shared logic
    pages/       — route pages
\```

### Key Entry Points
| File | Role |
|------|------|
| src/server/index.ts | Server entry, middleware chain |
| src/client/app.vue | Client entry, root component |

### Module Map
| Module | Files | Responsibility |
|--------|-------|----------------|
| Auth | middleware/auth.ts, utils/password.ts, utils/totp.ts | Authentication, 2FA, sessions |
| API | routes/*.ts, utils/validation.ts | API endpoints, input validation |
| DB | db/schema.ts, utils/db.ts | Database schema, connection |

### Data Flow
```
Request → middleware (auth → csrf → rate-limit) → route handler → service → database → response
```

### Testing
- Unit: `tests/unit/` — [N] test files
- API: `tests/api/` — [N] test files
- E2E: `tests/e2e/` — [N] test files
```
