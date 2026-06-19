import type { Rule, Violation } from '../../../types.js'
import { t } from '../../../i18n/index.js'

export const rule: Rule = {
  id: 'no-any-type',
  language: 'typescript',
  severity: 'error',
  description: t('constitution.rule.noAnyType.message'),
  auto_fixable: false,
  check(source: string, filename: string): Violation[] {
    const violations: Violation[] = []
    const lines = source.split('\n')
    const typedRe = /:\s*(string|number|boolean|Record|Partial|Omit|Pick|Promise|Array|ReadonlyArray)/

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1
      if (!line.includes('any')) continue
      const col = line.indexOf('any')
      if (col < 0) continue
      const beforeColon = line.slice(0, col)
      if (!beforeColon.includes(':')) continue
      if (typedRe.test(line)) continue
      if (beforeColon.includes('import') || beforeColon.includes('from')) continue

      violations.push({
        rule: 'no-any-type',
        language: 'typescript',
        severity: 'error',
        file: filename,
        line: lineNum,
        column: col + 1,
        message: t('constitution.rule.noAnyType.message'),
        suggestion: t('constitution.rule.noAnyType.suggestion'),
        auto_fixable: false,
      })
    }
    return violations
  },
}
