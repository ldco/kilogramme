import type { Rule, Violation } from '../../../types.js'
import { t } from '../../../i18n/index.js'

const SUPPRESSION_PATTERNS = [
  { pattern: /@ts-ignore/, id: 'ts-ignore', severity: 'error' as const },
  { pattern: /@ts-expect-error/, id: 'ts-expect-error', severity: 'error' as const },
  { pattern: /@ts-nocheck/, id: 'ts-nocheck', severity: 'error' as const },
  { pattern: /eslint-disable-next-line/, id: 'eslint-disable-next-line', severity: 'warning' as const },
  { pattern: /eslint-disable/, id: 'eslint-disable', severity: 'warning' as const },
]

const EMPTY_CATCH_RE = /catch\s*(\([^)]*\))?\s*\{\s*\}/

export const rule: Rule = {
  id: 'no-type-suppressions',
  language: 'typescript',
  severity: 'error',
  description: t('constitution.rule.noTypeSuppressions.message'),
  auto_fixable: false,
  check(source: string, filename: string): Violation[] {
    const violations: Violation[] = []
    const lines = source.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1

      for (const sp of SUPPRESSION_PATTERNS) {
        const m = line.match(sp.pattern)
        if (!m) continue

        const preceding = lines.slice(0, i).reverse().find(l => l.trim() !== '') || ''
        const hasReasonComment = preceding.includes('//') || preceding.includes('/*')
        if (hasReasonComment) continue

        violations.push({
          rule: 'no-type-suppressions',
          language: 'typescript',
          severity: 'error',
          file: filename,
          line: lineNum,
          column: (m.index || 0) + 1,
          message: t('constitution.rule.noTypeSuppressions.suppressionMsg', { pattern: sp.id }),
          suggestion: t('constitution.rule.noTypeSuppressions.suggestion'),
          auto_fixable: false,
        })
      }

      const ec = line.match(EMPTY_CATCH_RE)
      if (ec) {
        violations.push({
          rule: 'no-type-suppressions',
          language: 'typescript',
          severity: 'error',
          file: filename,
          line: lineNum,
          column: (ec.index || 0) + 1,
          message: t('constitution.rule.noTypeSuppressions.emptyCatchMsg'),
          suggestion: t('constitution.rule.noTypeSuppressions.suggestion'),
          auto_fixable: false,
        })
      }
    }
    return violations
  },
}
