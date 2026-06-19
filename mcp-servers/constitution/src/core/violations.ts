import type { Violation } from '../types.js'
import { t } from '../i18n/index.js'

export function formatViolation(v: Violation): string {
  return t('constitution.violation.format', {
    symbol: v.severity === 'error' ? '⚠' : '⚡',
    rule: v.rule,
    file: v.file,
    line: String(v.line),
    col: String(v.column),
    message: v.message,
  })
}

export function formatSummary(violations: Violation[]): string {
  const errors = violations.filter(v => v.severity === 'error').length
  const warnings = violations.filter(v => v.severity === 'warning').length
  const byRule = new Map<string, number>()
  for (const v of violations) {
    byRule.set(v.rule, (byRule.get(v.rule) || 0) + 1)
  }
  const ruleBreakdown = Array.from(byRule.entries())
    .map(([rule, count]) => `  ${rule}: ${count}`)
    .join('\n')

  const lines = [
    t('constitution.violation.summaryTitle', { count: String(violations.length) }),
    t('constitution.violation.errorsLabel', { count: String(errors), warnings: String(warnings) }),
  ]
  if (ruleBreakdown) {
    lines.push(t('constitution.violation.byRule'))
    lines.push(ruleBreakdown)
  }
  return lines.join('\n')
}
