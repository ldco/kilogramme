import type { Rule, Violation } from '../../../types.js'
import { t } from '../../../i18n/index.js'

const MAX_LINES = 50

export const rule: Rule = {
  id: 'max-function-lines', language: 'typescript', severity: 'warning',
  description: t('constitution.rule.maxFunctionLines.message', { max: MAX_LINES, actual: 0 }),
  auto_fixable: false,
  check(source: string, filename: string): Violation[] {
    const violations: Violation[] = []
    const lines = source.split('\n')
    const funcRe = /\b(function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\(|const\s+\w+\s*=\s*(?:async\s+)?function|class\s+\w+)/
    let depth = 0, start = -1, count = 0

    for (let i = 0; i < lines.length; i++) {
      const open = (lines[i].match(/\{/g) || []).length
      const close = (lines[i].match(/\}/g) || []).length
      if (start < 0) {
        if (funcRe.test(lines[i]) && lines[i].includes('{')) { start = i; count = 1; depth = open - close; continue }
      }
      if (start >= 0) { count++; depth += open - close }
      if (start >= 0 && depth <= 0) {
        if (count > MAX_LINES) violations.push({
          rule: 'max-function-lines', language: 'typescript', severity: 'warning',
          file: filename, line: start + 1, column: 1,
          message: t('constitution.rule.maxFunctionLines.message', { max: MAX_LINES, actual: count }),
          suggestion: t('constitution.rule.maxFunctionLines.suggestion'), auto_fixable: false,
        })
        start = -1; count = 0; depth = 0
      }
    }
    return violations
  },
}
