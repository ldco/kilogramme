import type { Rule, Violation } from '../../../types.js'
import { t } from '../../../i18n/index.js'

export const rule: Rule = {
  id: 'require-error-handling', language: 'typescript', severity: 'warning',
  description: t('constitution.rule.requireErrorHandling.message'),
  auto_fixable: false,
  check(source: string, filename: string): Violation[] {
    const violations: Violation[] = []
    const inTestFile = /\.(test|spec|e2e)\./.test(filename)
    let inTry = false, depth = 0

    for (let i = 0; i < source.split('\n').length; i++) {
      const trimmed = source.split('\n')[i].trim()
      if (trimmed.startsWith('//')) continue
      if (!inTry && (trimmed.startsWith('try ') || trimmed === 'try {')) { inTry = true; depth = 1; continue }
      if (inTry) {
        if (trimmed.startsWith('}') || trimmed.startsWith('catch') || trimmed.startsWith('finally')) { depth--; if (depth <= 0) inTry = false }
        else depth += (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length
        continue
      }
      const m = trimmed.match(/\bawait\s+(\w[\w.]*\(.*\))/)
      if (!m || m[0].includes('.catch(') || m[0].includes('.then(')) continue
      if (inTestFile && trimmed.includes('expect(')) continue
      violations.push({
        rule: 'require-error-handling', language: 'typescript', severity: 'warning',
        file: filename, line: i + 1, column: trimmed.indexOf('await') + 1,
        message: t('constitution.rule.requireErrorHandling.message'),
        suggestion: t('constitution.rule.requireErrorHandling.suggestion'),
        auto_fixable: false,
      })
    }
    return violations
  },
}
