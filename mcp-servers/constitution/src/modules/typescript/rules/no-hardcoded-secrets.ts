import type { Rule, Violation } from '../../../types.js'
import { t } from '../../../i18n/index.js'

const SECRET_VAR_NAMES = [
  'api_key', 'apikey', 'api-key', 'apiKey',
  'token', 'secret', 'secrets', 'password',
  'private_key', 'privatekey', 'privateKey',
  'access_key', 'accesskey', 'accessKey',
  'secret_key', 'secretkey', 'secretKey',
  'auth_token', 'authtoken', 'authToken',
]
const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/, /pk-[a-zA-Z0-9]{20,}/,
  /AKIA[A-Z0-9]{16,}/, /gh[pousb]_[a-zA-Z0-9]{36}/,
  /xox[bpras]-[a-zA-Z0-9-]{10,}/,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
]

function isEnvAccess(line: string): boolean {
  return line.includes('process.env') || line.includes('Deno.env') || line.includes('Bun.env')
}
function matchesSecretPattern(line: string): boolean { return SECRET_PATTERNS.some(p => p.test(line)) }
function matchesSecretVarDecl(line: string): boolean {
  const idx = line.indexOf('=')
  if (idx < 0) return false
  const lower = line.slice(0, idx).trim().toLowerCase()
  return SECRET_VAR_NAMES.some(n => {
    const p = lower.indexOf(n); return p >= 0 && (lower.length === p + n.length || lower[p + n.length] === ' ' || lower[p + n.length] === '\t')
  })
}

export const rule: Rule = {
  id: 'no-hardcoded-secrets', language: 'typescript', severity: 'error',
  description: t('constitution.rule.noHardcodedSecrets.message'),
  auto_fixable: false,
  check(source: string, filename: string): Violation[] {
    const violations: Violation[] = []
    for (let i = 0; i < source.split('\n').length; i++) {
      const line = source.split('\n')[i]
      if (isEnvAccess(line) || line.trim().startsWith('//')) continue
      if (!matchesSecretPattern(line) && !matchesSecretVarDecl(line)) continue
      violations.push({
        rule: 'no-hardcoded-secrets', language: 'typescript', severity: 'error',
        file: filename, line: i + 1, column: 1,
        message: t('constitution.rule.noHardcodedSecrets.message'),
        suggestion: t('constitution.rule.noHardcodedSecrets.suggestion'),
        auto_fixable: false,
      })
    }
    return violations
  },
}
