---
paths:
  - "**/*.api.ts"
  - "src/routes/**"
  - "server/routes/**"
  - "api/**"
---

# API Development Rules

- All endpoints must validate input with Zod
- Return consistent error format: { error: { code, message } }
- Use the existing rateLimiter middleware for all public endpoints
- All POST/PUT/DELETE/PATCH endpoints must be CSRF-protected
- Never expose stack traces in error responses
- Use proper HTTP status codes (201 for creation, 204 for deletion, etc.)
- Paginate list endpoints with cursor-based or offset-based pagination
- Document all endpoints with OpenAPI/Swagger annotations
