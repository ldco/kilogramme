import type { PmTool } from './index.js'
import { getProjectRoot, runCmd, fileExists } from './utils.js'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const STACK_SIGNATURES: Record<string, { name: string; files: string[]; icon: string }> = {
  nuxt:    { name: 'Nuxt/Vue',     files: ['nuxt.config.ts', 'package.json'], icon: '💚' },
  next:    { name: 'Next.js',      files: ['next.config.ts', 'next.config.js'], icon: '▲' },
  svelte:  { name: 'SvelteKit',    files: ['svelte.config.js'], icon: '🧡' },
  go:      { name: 'Go',           files: ['go.mod'], icon: '🔵' },
  rust:    { name: 'Rust',         files: ['Cargo.toml'], icon: '🦀' },
  python:  { name: 'Python',       files: ['pyproject.toml', 'setup.py'], icon: '🐍' },
  elixir:  { name: 'Elixir',       files: ['mix.exs'], icon: '💜' },
  php:     { name: 'PHP',          files: ['composer.json'], icon: '🐘' },
  flutter: { name: 'Flutter',      files: ['pubspec.yaml'], icon: '💙' },
  reactNative: { name: 'React Native', files: ['app.json', 'package.json'], icon: '📱' },
  node:    { name: 'Node.js',      files: ['package.json'], icon: '💛' },
}

function detectStack(root: string): string[] {
  const stacks: string[] = []
  for (const [id, sig] of Object.entries(STACK_SIGNATURES)) {
    if (sig.files.some(f => existsSync(resolve(root, f)))) {
      stacks.push(id)
    }
  }
  return stacks.length > 0 ? stacks : ['unknown']
}

interface CheckResult {
  stage: string
  passed: boolean
  severity: 'critical' | 'error' | 'warning' | 'info'
  output: string
}

function runCheck(label: string, command: string, root: string, isCritical: boolean): CheckResult {
  try {
    const out = runCmd(command, root)
    const hasWarnings = /warning/i.test(out)
    return {
      stage: label,
      passed: true,
      severity: hasWarnings ? 'warning' : 'info',
      output: out.slice(0, 2000),
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      stage: label,
      passed: false,
      severity: isCritical ? 'critical' : 'error',
      output: msg.slice(0, 2000),
    }
  }
}

const SEVERITY_ICONS: Record<string, string> = {
  critical: '🔴',
  error: '🟠',
  warning: '🟡',
  info: '🔵',
}

export const reviewTools: PmTool[] = [
  {
    name: 'pm_review_checklist',
    description:
      'Get the review checklist for a given specialty. Returns a structured checklist of items reviewers should verify.',
    inputSchema: {
      type: 'object',
      properties: {
        specialty: {
          type: 'string',
          enum: ['frontend', 'backend', 'fullstack', 'ux', 'security', 'devops', 'go', 'rust', 'python', 'elixir', 'react-native', 'flutter', 'all'],
          description: 'Specialty to get checklist for (PM-specific + stack-specific)',
        },
      },
    },
    async handler(args) {
      const specialty = (args.specialty as string) || 'all'

      const checklists: Record<string, string[]> = {
        frontend: [
          'NO scoped styles in .vue components (global CSS only)',
          'BEM naming: .component__element--modifier',
          'CSS variables used (no hardcoded colors)',
          'No <style> blocks in .vue files',
          'Icons imported from ~icons/tabler/',
          'Script setup lang="ts" used',
          'Props/emits properly typed',
          'No inline styles',
          'Responsive layout (mobile/tablet/desktop)',
          'Accessibility: labels, aria, focus states',
          'Loading and error states handled',
          'i18n translations wired correctly',
          'No custom section CSS imports without justification',
          'No custom BEM text classes (use semantic h2/h3/p)',
          'Composition API used (no Options API)',
          'useFetch/useAsyncData for data fetching',
          'Pinia for shared state',
          'No relative deep imports (use ~/ alias)',
        ],
        backend: [
          'All inputs validated with Zod',
          'createError() with proper HTTP status codes',
          'requireAuth(event) on protected routes',
          'Drizzle ORM used (no raw SQL)',
          'Response format: { success: true, data }',
          'Audit logging on security-sensitive actions',
          'Types exported from schema',
          'Pagination/limits on list endpoints',
          'No sensitive fields returned to clients',
          'Error messages do not leak internals',
          'Date handling is timezone-aware',
          'Transactions for multi-step writes',
          'RBAC checks for admin features',
          'Input sanitization for user-generated HTML',
          'File upload validation (size, type, storage)',
        ],
        fullstack: [
          'Component-to-API wiring is consistent',
          'Shared types used across layers',
          'Config flags respected by both UI and API',
          'Modules properly toggled and scoped',
          'API contracts match frontend usage',
          'Feature flags gate both UI and API',
          'Forms validate both client and server',
          'ZERO "any" types anywhere',
          'catch (e: unknown) not catch (e: any)',
          'No @ts-ignore, @ts-expect-error, or ! assertions',
          'Discriminated unions with type/status/kind discriminator',
          'switch exhaustiveness: const _exhaustive: never = value',
          'Admin sections align with RBAC rules',
        ],
        ux: [
          'Clear visual hierarchy and spacing rhythm',
          'Consistent typography scale',
          'Touch targets meet minimum size (44px)',
          'Contrast ratios meet WCAG AA',
          'Focus states visible and consistent',
          'Forms show inline validation feedback',
          'Errors are actionable, not technical',
          'Empty states guide next steps',
          'Loading states are non-blocking',
          'RTL layout uses logical properties',
          'Mixed LTR/RTL content flows correctly',
          'Semantic HTML for headings and lists',
          'No placeholder-only labels',
          'Keyboard navigation flows logically',
          'Modal dialogs trap focus and restore on close',
          'Motion reduced for reduce-motion users',
          'Color is not the only indicator of state',
          'Skip-to-content link available',
        ],
        security: [
          'Auth enforced on protected routes',
          'RBAC enforced on admin actions',
          'Passwords stored as bcrypt/argon2 hashes',
          'Login rate limiting in place',
          'Sessions expire and are invalidated on logout',
          'Inputs validated and sanitized',
          'Output encoding for user-generated content (no innerHTML)',
          'File upload restrictions enforced',
          'Secrets from env vars, not committed',
          'No sensitive data in logs',
          'Error messages do not leak internals',
          'Audit logs recorded for privileged actions',
          'CSP headers configured',
          'CORS policy is explicit and minimal',
          'Avoid open redirects',
          'Dependency versions checked for known issues',
          'JWT algorithm explicitly specified',
          'Parameterized queries (no SQL injection)',
          'Rate limits on public endpoints',
        ],
        devops: [
          'Build succeeds in clean environment',
          'Environment variables documented',
          'Database migrations part of deploy',
          'Rollback path is available',
          'Structured logging configured',
          'Health checks active',
          'Monitoring/alerting hooks present',
          'Static assets cached appropriately',
          'Backups planned for SQLite data',
          'CI pipeline includes lint and tests',
          'Secrets rotation process exists',
          'Rate limits configured for public endpoints',
          'Container resource limits defined',
          'Zero-downtime deploy strategy documented',
        ],
        go: [
          'Error values handled (not ignored with _)',
          'defer used for resource cleanup',
          'No naked returns in non-trivial functions',
          'Context propagation through call chain',
          'Goroutine lifecycle managed (no leaks)',
          'Mutex used for shared mutable state',
          'Interfaces are small and focused',
          'No init() side effects in library packages',
          'Tests use table-driven pattern',
          'go vet and golangci-lint passing',
        ],
        rust: [
          'No unsafe blocks without justification',
          'Error handling via Result, not unwrap() in production',
          'Clone() costs considered in hot paths',
          'Lifetimes are minimal (not overly constrained)',
          'Async runtime choice documented (tokio/async-std)',
          'no_std compatible where appropriate',
          'Clippy lints addressed or explicitly allowed',
          'Documentation on public API items',
          'Cargo.lock committed for binaries, .gitignored for libs',
        ],
        python: [
          'Type hints on all public functions',
          'mypy/pyright strict mode passes',
          'async/await used correctly (no blocking in async)',
          'Context managers for resource management',
          'Dataclasses or Pydantic for data structures',
          'No mutable default arguments',
          'Exception handling is specific (not bare except:)',
          'ruff/flake8 checks pass',
          'Requirements pinned with hashes',
          'Virtual environment isolated',
        ],
        elixir: [
          'Pattern matching used over conditionals',
          'Supervision trees for fault tolerance',
          'No raw send/recv outside OTP abstractions',
          'Ecto changesets for data validation',
          'Repo transactions for multi-step writes',
          'Credo and dialyzer checks pass',
          'Telemetry events instrumented',
          'Config separated from secrets (runtime config)',
        ],
        'react-native': [
          'useEffect cleanup functions present',
          'FlatList used for long lists (not ScrollView)',
          'Platform-specific code isolated with Platform.select',
          'Permissions requested at point of use',
          'Image caching strategy in place',
          'SafeAreaView wrapping screens',
          'Offline state handled gracefully',
          'Hermes engine enabled',
        ],
        flutter: [
          'const constructors used where possible',
          'Widget tree depth reasonable (extract widgets)',
          'State management choice documented (GetX/Bloc/Riverpod)',
          'Platform channels cleanly abstracted',
          'No rebuilds due to unstable keys',
          'Accessibility labels set (Semantics widget)',
          'Responsive layout for tablets',
          'App lifecycle handlers registered',
        ],
      }

      if (specialty === 'all') {
        return JSON.stringify(checklists, null, 2)
      }

      const items = checklists[specialty]
      if (!items) return `Unknown specialty: ${specialty}. Valid: ${Object.keys(checklists).join(', ')}`

      return `## ${specialty.toUpperCase()} REVIEW CHECKLIST\n\n${items.map((item, i) => `${String(i + 1).padStart(2, '0')}. [ ] ${item}`).join('\n')}`
    },
  },
  {
    name: 'pm_review_run',
    description:
      'Run automated quality checks with stack auto-detection. Executes lint, typecheck, build, and test for the detected project stack. Returns results with severity levels (critical/error/warning/info).',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['full', 'lint', 'types', 'tests', 'quick'],
          description: 'full = all checks, lint/types/tests = specific, quick = lint+types only',
        },
        fix: {
          type: 'boolean',
          description: 'Auto-fix lint issues when possible',
        },
      },
    },
    async handler(args) {
      const scope = (args.scope as string) || 'full'
      const fix = args.fix === true
      const root = getProjectRoot()
      const stacks = detectStack(root)
      const results: CheckResult[] = []

      const stackNames = stacks.map(s => STACK_SIGNATURES[s]?.name || s).join(' + ')

      if (scope === 'full' || scope === 'lint') {
        if (stacks.includes('nuxt') || stacks.includes('node')) {
          const cmd = fix ? 'npm run lint:fix' : 'npm run lint'
          if (fileExists('package.json')) {
            results.push(runCheck('Lint (ESLint)', cmd, root, false))
          }
        }
        if (stacks.includes('python')) {
          results.push(runCheck('Lint (Ruff)', 'ruff check .', root, false))
        }
        if (stacks.includes('go')) {
          results.push(runCheck('Lint (golangci-lint)', 'golangci-lint run ./...', root, false))
        }
        if (stacks.includes('rust')) {
          results.push(runCheck('Lint (Clippy)', 'cargo clippy -- -D warnings', root, false))
        }
        if (stacks.includes('elixir')) {
          results.push(runCheck('Lint (Credo)', 'mix credo', root, false))
        }
      }

      if (scope === 'full' || scope === 'types') {
        if (stacks.includes('nuxt')) {
          results.push(runCheck('TypeScript (vue-tsc)', 'npx vue-tsc --noEmit 2>&1', root, true))
        } else if (stacks.includes('node') || stacks.includes('next') || stacks.includes('svelte')) {
          results.push(runCheck('TypeScript (tsc)', 'npx tsc --noEmit', root, true))
        }
        if (stacks.includes('python')) {
          results.push(runCheck('Type Check (mypy)', 'mypy . 2>&1', root, true))
        }
        if (stacks.includes('go')) {
          results.push(runCheck('Build Check (go build)', 'go build ./...', root, true))
        }
        if (stacks.includes('rust')) {
          results.push(runCheck('Type Check (cargo check)', 'cargo check', root, true))
        }
        if (stacks.includes('elixir')) {
          results.push(runCheck('Dialyzer', 'mix dialyzer', root, true))
        }
      }

      if (scope === 'full' || scope === 'tests') {
        if (stacks.includes('nuxt') || stacks.includes('node') || stacks.includes('next')) {
          results.push(runCheck('Tests (vitest/jest)', 'npm test', root, false))
        }
        if (stacks.includes('python')) {
          results.push(runCheck('Tests (pytest)', 'python -m pytest', root, false))
        }
        if (stacks.includes('go')) {
          results.push(runCheck('Tests (go test)', 'go test ./...', root, false))
        }
        if (stacks.includes('rust')) {
          results.push(runCheck('Tests (cargo test)', 'cargo test', root, false))
        }
        if (stacks.includes('elixir')) {
          results.push(runCheck('Tests (mix test)', 'mix test', root, false))
        }
      }

      const criticals = results.filter(r => r.severity === 'critical').length
      const errors = results.filter(r => r.severity === 'error').length
      const warnings = results.filter(r => r.severity === 'warning').length
      const passed = results.filter(r => r.passed).length

      const summary = [
        `## Review: ${stackNames}`,
        '',
        `| Stage | Result | Severity |`,
        `|-------|--------|----------|`,
        ...results.map(r =>
          `| ${r.stage} | ${r.passed ? '✅' : '❌'} | ${SEVERITY_ICONS[r.severity]} ${r.severity} |`
        ),
        '',
        `| Severity | Count |`,
        `|----------|-------|`,
        `| 🔴 Critical | ${criticals} |`,
        `| 🟠 Error | ${errors} |`,
        `| 🟡 Warning | ${warnings} |`,
        `| 🔵 Info | ${passed - warnings} |`,
        '',
        `**Verdict:** ${criticals > 0 ? '❌ Needs fixes' : errors > 0 ? '⚠️ Has issues' : warnings > 0 ? '✅ Passed with notes' : '✅ All clear'}`,
        '',
        ...results.filter(r => !r.passed).map(r => `### ${r.stage}\n\`\`\`\n${r.output}\n\`\`\``),
      ].join('\n')

      return summary
    },
  },
]
