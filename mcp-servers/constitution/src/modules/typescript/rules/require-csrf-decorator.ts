import type { Rule, Violation } from '../../../types.js'
import { t } from '../../../i18n/index.js'

const ROUTE_PATTERNS = [/\b(?:app|router|server|route)\.(post|put|delete|patch)\s*\(/i, /\bdefineEventHandler\s*\(/, /@(Post|Put|Delete|Patch)\(/]
const CSRF_REFS = ['csrf', 'csrfProtection', 'csrfProtect', 'doubleCsrfProtection', 'csurf', 'createCsrfMiddleware', 'useCsrf', 'x-csrf-token', 'x-xsrf-token']

function hasCsrf(line: string): boolean { return CSRF_REFS.some(r => line.includes(r)) }
function hasCsrfInFile(source: string): boolean { return source.split('\n').some(l => hasCsrf(l)) }

export const rule: Rule = {
  id: 'require-csrf-decorator', language: 'typescript', severity: 'error',
  description: t('constitution.rule.requireCsrfDecorator.message'),
  auto_fixable: false,
  check(source: string, filename: string): Violation[] {
    if (hasCsrfInFile(source)) return []
    for (let i = 0; i < source.split('\n').length; i++) {
      const line = source.split('\n')[i]
      if (line.trim().startsWith('//')) continue
      for (const p of ROUTE_PATTERNS) {
        const m = line.match(p)
        if (!m || hasCsrf(line)) continue
        if (hasCsrf(source.split('\n').slice(i + 1, i + 10).join('\n'))) continue
        return [{
          rule: 'require-csrf-decorator', language: 'typescript', severity: 'error',
          file: filename, line: i + 1, column: (m.index || 0) + 1,
          message: t('constitution.rule.requireCsrfDecorator.message'),
          suggestion: t('constitution.rule.requireCsrfDecorator.suggestion'),
          auto_fixable: false,
        }]
      }
    }
    return []
  },
}
