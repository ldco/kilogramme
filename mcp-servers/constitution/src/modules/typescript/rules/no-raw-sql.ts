import type { Rule, Violation } from '../../../types.js'
import { t } from '../../../i18n/index.js'

const SQL_PATTERNS = [
  /\bSELECT\s+.+\s+FROM\b/i, /\bINSERT\s+INTO\b/i,
  /\bUPDATE\s+.+\s+SET\b/i, /\bDELETE\s+FROM\b/i,
  /\bCREATE\s+TABLE\b/i, /\bALTER\s+TABLE\b/i, /\bDROP\s+TABLE\b/i,
]

export const rule: Rule = {
  id: 'no-raw-sql',
  language: 'typescript',
  severity: 'error',
  description: t('constitution.rule.noRawSql.message'),
  auto_fixable: false,
  check(source: string, filename: string): Violation[] {
    const violations: Violation[] = []
    const lines = source.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue
      if (!SQL_PATTERNS.some(p => p.test(trimmed))) continue
      const col = trimmed.search(/SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP/i)
      violations.push({
        rule: 'no-raw-sql', language: 'typescript', severity: 'error',
        file: filename, line: i + 1, column: Math.max((col || 0) + 1, 1),
        message: t('constitution.rule.noRawSql.message'),
        suggestion: t('constitution.rule.noRawSql.suggestion'),
        auto_fixable: false,
      })
    }
    return violations
  },
}
