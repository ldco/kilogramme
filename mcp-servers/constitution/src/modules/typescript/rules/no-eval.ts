import type { Rule, Violation } from '../../../types.js'
import { t } from '../../../i18n/index.js'

export const rule: Rule = {
  id: 'no-eval', language: 'typescript', severity: 'error',
  description: t('constitution.rule.noEval.message'),
  auto_fixable: false,
  check(source: string, filename: string): Violation[] {
    const violations: Violation[] = []
    for (let i = 0; i < source.split('\n').length; i++) {
      const line = source.split('\n')[i]
      if (line.trim().startsWith('//')) continue
      const em = line.match(/\beval\s*\(/)
      if (em) violations.push({
        rule: 'no-eval', language: 'typescript', severity: 'error',
        file: filename, line: i + 1, column: (em.index || 0) + 1,
        message: t('constitution.rule.noEval.message'),
        suggestion: t('constitution.rule.noEval.suggestion'), auto_fixable: false,
      })
      const fm = line.match(/new\s+Function\s*\(/)
      if (fm) violations.push({
        rule: 'no-eval', language: 'typescript', severity: 'error',
        file: filename, line: i + 1, column: (fm.index || 0) + 1,
        message: t('constitution.rule.newFunction.message'),
        suggestion: t('constitution.rule.newFunction.suggestion'), auto_fixable: false,
      })
    }
    return violations
  },
}
