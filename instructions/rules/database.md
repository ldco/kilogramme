---
paths:
  - "**/db/**"
  - "**/schema/**"
  - "**/migrations/**"
  - "**/models/**"
  - "**/entities/**"
  - "**/*repository*"
  - "**/*dao*"
---

# Database Access Rules

- Never use raw SQL — use the ORM (Drizzle, Prisma, TypeORM, SQLAlchemy)
- Always validate inputs before database queries
- Use parameterized queries for any raw SQL (if unavoidable)
- Index all columns used in WHERE, JOIN, and ORDER BY clauses
- Add unique constraints for business-unique fields
- Use migrations for schema changes, never manual ALTER TABLE
- Keep migrations reversible (both up and down)
- Paginate all list queries to prevent memory exhaustion
- Use transactions for multi-step write operations
- Never select * — always specify columns
- Add database-level foreign keys for referential integrity
