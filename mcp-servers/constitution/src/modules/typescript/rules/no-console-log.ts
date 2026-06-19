import type { Rule, Violation } from '../../../types.js'
import { t } from '../../../i18n/index.js'

const CONSOLE_METHODS = ['log', 'warn', 'error', 'info', 'debug', 'trace', 'dir']

function isTestFile(fn: string): boolean {
  return /\.(test|spec|e2e)\.(ts|tsx|js|jsx)$/.test(fn) || fn.includes('__tests__') || fn.includes('test/')
}

export const rule: Rule = {
  id: 'no-console-log', language: 'typescript', severity: 'warning',
  description: t('constitution.rule.noConsoleLog.message'),
  auto_fixable: true,
  check(source: string, filename: string): Violation[] {
    if (isTestFile(filename)) return []
    const violations: Violation[] = []
    const re = new RegExp(`console\\.(${CONSOLE_METHODS.join('|')})\\s*\\(`)
    for (let i = 0; i < source.split('\n').length; i++) {
      const line = source.split('\n')[i]
      if (line.trim().startsWith('//')) continue
      const m = line.match(re)
      if (!m) continue
      violations.push({
        rule: 'no-console-log', language: 'typescript', severity: 'warning',
        file: filename, line: i + 1, column: (m.index || 0) + 1,
        message: t('constitution.rule.noConsoleLog.message', { method: m[1] }),
        suggestion: t('constitution.rule.noConsoleLog.suggestion'),
        auto_fixable: true,
      })
    }
    return violations
  },
}
