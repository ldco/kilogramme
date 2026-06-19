import type { Rule, Violation } from '../../../types.js'
import { t } from '../../../i18n/index.js'

const MAX = 10
const BRANCH_PATTERNS = [/\bif\s*\(/, /\belse\s+if\s*\(/, /\bfor\s*\(/, /\bwhile\s*\(/, /\bdo\s*\{/, /\bcase\s+/, /\bcatch\s*\(/, /\bswitch\s*\(/, /\|\|/, /&&/, /\?\s*[^:]+:/]

export const rule: Rule = {
  id: 'max-complexity', language: 'typescript', severity: 'warning',
  description: t('constitution.rule.maxComplexity.message', { name: '', max: MAX, actual: 0 }),
  auto_fixable: false,
  check(source: string, filename: string): Violation[] {
    const violations: Violation[] = []
    const lines = source.split('\n')
    const funcRe = /\b(function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\(|const\s+\w+\s*=\s*(?:async\s+)?function|class\s+\w+)/
    let depth = 0, inFn = false, start = 0, complexity = 1, name = ''

    for (let i = 0; i < lines.length; i++) {
      const open = (lines[i].match(/\{/g) || []).length
      const close = (lines[i].match(/\}/g) || []).length
      if (!inFn) {
        const m = lines[i].match(funcRe)
        if (m && lines[i].includes('{')) { inFn = true; start = i; name = m[1]; complexity = 1; depth = open - close; continue }
        continue
      }
      depth += open - close
      for (const p of BRANCH_PATTERNS) { if (p.test(lines[i])) complexity++ }
      if (depth <= 0) {
        if (complexity > MAX) violations.push({
          rule: 'max-complexity', language: 'typescript', severity: 'warning',
          file: filename, line: start + 1, column: 1,
          message: t('constitution.rule.maxComplexity.message', { name, max: MAX, actual: complexity }),
          suggestion: t('constitution.rule.maxComplexity.suggestion'), auto_fixable: false,
        })
        inFn = false; depth = 0
      }
    }
    return violations
  },
}
