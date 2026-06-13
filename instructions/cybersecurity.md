# Cybersecurity Knowledge Base

Reference for: security headers, OWASP, auth patterns, encryption, CSP, CSRF, rate limiting, input validation.

---

## 1. HTTP Security Headers Checklist

| Header | Recommended Value | Implemented | Priority |
|--------|-------------------|-------------|----------|
| `Content-Security-Policy` | `script-src 'self' 'nonce-{rnd}' 'strict-dynamic'` | via `csp-nonce.ts` | CRITICAL |
| `X-Frame-Options` | `DENY` | ✅ | HIGH |
| `X-Content-Type-Options` | `nosniff` | ✅ | HIGH |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | ✅ | HIGH |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ | MEDIUM |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | ✅ | MEDIUM |
| `Cross-Origin-Opener-Policy` | `same-origin` | ✅ | MEDIUM |
| `Cross-Origin-Resource-Policy` | `same-origin` | ✅ | MEDIUM |
| `Access-Control-Allow-Origin` | Explicit allowlist | ❌ MISSING | MEDIUM |
| `Cache-Control` | `no-store` on sensitive pages | Check per-route | LOW |

---

## 2. OWASP Top 10 → PM Framework Mapping

### A01:2021 — Broken Access Control
- **Defense:** `requireAuth(event)`, `requireRole()`, `requirePageAccess()`, `requireAdminRouteAccessByPath()`
- **Files:** `server/middleware/auth.ts`, `server/utils/permissions.ts`, `server/utils/admin-rbac.ts`
- **Must verify:** Every `/api/admin/*` route calls `requireAuth` AND `requirePageAccess`
- **Pattern:** Always check ownership before mutation — never trust `userId` from client

### A02:2021 — Cryptographic Failures
- **Defense:** scrypt for passwords, AES-256-GCM for secrets, timing-safe comparison
- **Files:** `server/utils/password.ts`, `server/utils/secrets.ts`, `server/utils/totp.ts`
- **Rules:**
  - Never store plaintext passwords/secrets
  - `PM_SETTINGS_ENCRYPTION_KEY` must be set in production (min 64 hex chars)
  - `TOTP_ENCRYPTION_KEY` must be set if 2FA enabled
  - Use `crypto.timingSafeEqual` for all secret comparisons

### A03:2021 — Injection
- **Defense:** Drizzle ORM (no raw SQL), HTML sanitization, Zod validation
- **Files:** `server/utils/sanitize.ts`, `server/utils/sanitization.ts`, `server/utils/validation.ts`
- **Rules:**
  - **NEVER raw SQL** — Drizzle ORM only for all queries
  - All API inputs go through Zod schemas
  - User HTML content → `sanitizeHtml()` before storage
  - File uploads → magic byte validation (never trust `Content-Type`)

### A04:2021 — Insecure Design
- **Defense:** Rate limiting, account lockout, CSRF tokens, audit logging
- **Files:** `server/utils/rateLimit.ts`, `server/utils/accountLockout.ts`, `server/middleware/csrf.ts`
- **Rules:**
  - Every state-changing endpoint must be CSRF-protected (POST/PUT/DELETE/PATCH)
  - Login/contact/2FA endpoints must have rate limits
  - Failed login attempts must trigger account lockout
  - All security-sensitive actions → audit log

### A05:2021 — Security Misconfiguration
- **Defense:** Environment validation plugin, setup guard, security headers
- **Files:** `server/plugins/01.env-validation.ts`, `server/plugins/02.error-handlers.ts`, `server/utils/setup-guard.ts`
- **Rules:**
  - No default passwords in code
  - Production checks: HTTPS enforced, HSTS set, CSP strict
  - Error messages must NOT leak stack traces to client
  - `.env` in `.gitignore` — never committed

### A06:2021 — Vulnerable Components
- **Defense:** Audit npm dependencies, lockfile committed
- **Tools:** `npm audit`, Renovate (configured in `renovate.json`)
- **Rules:** Regular `npm audit` runs, auto-merge security patches

### A07:2021 — Auth Failures
- **Defense:** Session validation, 2FA, password policy, account lockout
- **Files:** `server/middleware/auth.ts`, `server/utils/totp.ts`, `server/utils/password.ts`
- **Rules:**
  - Session cookies: HttpOnly, Secure (prod), SameSite=Lax
  - Password policy: min 8 chars, uppercase, lowercase, number, special
  - Reject common passwords
  - 2FA TOTP with backup codes (hashed)
  - Account lockout: 5 fails → 30 min

### A08:2021 — Software & Data Integrity Failures
- **Defense:** Virus scanning for uploads, magic byte validation
- **Files:** `server/utils/virusScanning.ts`, `server/utils/fileValidation.ts`
- **Rules:** All uploads scanned with ClamAV (prod), validated by actual content bytes

### A09:2021 — Security Logging & Monitoring Failures
- **Defense:** Audit logging, Sentry error tracking, performance monitoring
- **Files:** `server/utils/audit.ts`, `server/plugins/sentry.ts`, `server/middleware/performance.ts`
- **Rules:**
  - Log: login, login_failed, logout, password_change, role_change, user CRUD
  - Log: account_locked, account_unlocked, 2fa_enabled/disabled/verified/failed
  - Audit failures must NOT crash requests
  - Redact sensitive headers in logs (auth, cookie, csrf)
  - Sentry must strip CSRF tokens and emails

### A10:2021 — SSRF
- **Defense:** Input validation on URLs, no raw user URL fetching
- **Rules:** Validate any user-supplied URLs, restrict internal network access

---

## 3. CSRF Protection Pattern

```
Token:    crypto.randomBytes(32).toString('hex')
Cookie:   pm-csrf, HttpOnly, Secure(prod), SameSite=Strict
Header:   x-csrf-token
Verify:   crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header))
Methods:  POST, PUT, DELETE, PATCH (GET/HEAD exempt)
Exempt:   /api/auth/login, /api/auth/logout, /api/analytics/performance,
          /api/contact/submit, /api/health, /api/setup/*
```

**Adding a new state-changing endpoint:**
1. It must be POST/PUT/DELETE/PATCH (not GET)
2. If exempt from CSRF, register in `server/middleware/csrf.ts` exempt list
3. Client must read CSRF token from cookie and send as `x-csrf-token` header

---

## 4. Rate Limiting Patterns

```typescript
import { createLoginRateLimiter, createContactRateLimiter } from '../utils/rateLimit'

// Login: 5 attempts per 15 min per IP
const loginLimiter = createLoginRateLimiter()
await loginLimiter.checkRateLimit(ip)

// Contact: 5 submissions per 60 min per IP
const contactLimiter = createContactRateLimiter()
await contactLimiter.checkRateLimit(ip)

// Custom: N attempts per T ms
const customLimiter = createRateLimiter({ maxAttempts: 10, windowMs: 300_000 })
await customLimiter.checkRateLimit(key)
```

---

## 5. Auth Guard Patterns

```typescript
// Route-level auth (public API with optional auth)
const { session, user } = event.context  // Set by auth middleware for /api/*

// Enforced auth (admin)
import { requireAuth } from '../middleware/auth'
await requireAuth(event)  // Throws 401 if no valid session

// Role check
import { requireRole, requireMaster } from '../utils/roles'
requireRole(user, 'admin')  // Throws 403 if insufficient

// Page-level permission (admin UI)
import { requirePageAccess } from '../utils/permissions'
await requirePageAccess(user, 'settings')  // Throws 403
```

---

## 6. Input Validation Patterns

```typescript
import { z } from 'zod'
import { validateInput } from '../utils/validation'

const mySchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
})

const result = await validateInput(event, mySchema)
if (!result.success) {
  throw createError({ statusCode: 400, statusMessage: result.error.message })
}
const { name, email, age } = result.data
```

---

## 7. HTML Sanitization Patterns

```typescript
import { sanitizeHtml } from '../utils/sanitize'

// Server-side XSS prevention for user content
const clean = sanitizeHtml(dirtyHtml)

// Escaping for attributes
import { escapeHtml } from '../utils/sanitize'
const safeAttr = escapeHtml(userInput)
```

---

## 8. File Upload Security

```typescript
import { validateImageFile } from '../utils/fileValidation'
import { scanFileForViruses } from '../utils/virusScanning'

// 1. Validate magic bytes (NOT Content-Type header)
const validation = await validateImageFile(buffer)
if (!validation.valid) throw createError({ statusCode: 400 })

// 2. Virus scan (ClamAV, fail-open in dev)
const scanResult = await scanFileForViruses(buffer)
if (scanResult.infected) throw createError({ statusCode: 400 })
```

---

## 9. Password Security

```
Hash:       scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
Store:      hex(salt) + ':' + hex(hash)
Verify:     timingSafeEqual(storedHash, computedHash)
Policy:     min 8 chars, 1 upper, 1 lower, 1 digit, 1 special
Reject:     common passwords list
```

---

## 10. Encryption at Rest

```
Algorithm:  AES-256-GCM
Key source: PM_SETTINGS_ENCRYPTION_KEY env var (64+ hex chars)
Envelope:   enc:v1:{ivHex}:{authTagHex}:{cipherHex}
Fallback:   Dev mode: hardcoded key with warning. Prod: FAILS FAST.
```

---

## 11. CSP Directives Reference

```
Production:
  default-src 'self'
  script-src 'self' 'nonce-{random}' 'strict-dynamic'
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
  img-src 'self' data: blob: https:
  font-src 'self' https://fonts.gstatic.com
  connect-src 'self' ws: wss:
  object-src 'none'
  frame-ancestors 'none'
  form-action 'self'
  upgrade-insecure-requests
  base-uri 'self'

Development additionally:
  script-src + 'unsafe-eval' (Vue devtools)
```

---

## 12. Common Vulnerabilities by Stack (Node.js/Nuxt/Vue)

| Vulnerability | Mitigation |
|--------------|------------|
| Prototype pollution | No `Object.assign` with user input, validate object keys |
| Server-side prototype pollution | No `__proto__` / `constructor.prototype` in user objects |
| NoSQL injection | Drizzle ORM (SQLite) — not applicable |
| Path traversal | `sanitizeFileName()` strips `../`, validate file paths |
| Event handler injection | `sanitizeHtml()` strips `on*=` attributes |
| Open redirect | Validate redirect URLs against allowlist |
| Mass assignment | Select allowed fields with Zod, never spread `req.body` |
| Timing attacks | `timingSafeEqual` for all secret comparisons |
| ReDoS | No user-controlled regex patterns |
| Dependency confusion | Scope internal packages, verify registry |

---

## 13. Security Checklist for New Features

- [ ] New API route → appropriate auth guard (`requireAuth`, `requireRole`, or `requirePageAccess`)
- [ ] New form → Zod validation schema
- [ ] New state-changing endpoint → CSRF protection (or registered exempt)
- [ ] New public endpoint → appropriate rate limiting
- [ ] New user-visible content field → `sanitizeHtml()` before storage
- [ ] New file upload → magic byte validation + virus scan
- [ ] New sensitive action → audit log call
- [ ] New setting → check if it needs encryption (`encryptSecretValue`)
- [ ] New user input → no raw SQL, no string concatenation in queries
- [ ] Error responses → no stack traces, no internal paths
- [ ] New cookie → HttpOnly + Secure(prod) + SameSite consideration
