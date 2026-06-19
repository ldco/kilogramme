#!/usr/bin/env node
import { findConfig, loadModules } from '../dist/core/module-loader.js'
import { walkTree } from '../dist/core/walker.js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES = resolve(__dirname, 'fixtures/typescript')
const PASS = []
const FAIL = []

function assert(label, pass, detail = '') {
  if (pass) {
    PASS.push(label)
    console.log(`  ✓ ${label}`)
  } else {
    FAIL.push(label)
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

async function main() {
  console.log('\n# Constitution MCP Server — Test Suite\n')

  // 1. Module loading
  console.log('## 1. Module loading')
  const config = findConfig()
  assert('config find: default modules', config.modules.length > 0)
  assert('config find: typescript in modules', config.modules.includes('typescript'))

  const modules = await loadModules(config)
  assert('load modules: typescript loaded', modules.has('typescript'))
  assert('load modules: 11 rules loaded', modules.get('typescript')?.rules.length === 11)
  assert('load modules: correct name', modules.get('typescript')?.name === 'typescript')

  // 2. Rule tests
  console.log('\n## 2. Rules — no-any-type')
  const anySource = readFileSync(resolve(FIXTURES, 'any-type.ts'), 'utf-8')
  const tsModule = modules.get('typescript')
  const anyViolations = tsModule.rules[0].check(anySource, 'any-type.ts')
  assert('no-any-type: detects 3 violations', anyViolations.length === 3, `${anyViolations.length} found`)
  assert('no-any-type: all severity error', anyViolations.every(v => v.severity === 'error'))

  console.log('\n## 3. Rules — no-raw-sql')
  const sqlSource = readFileSync(resolve(FIXTURES, 'raw-sql.ts'), 'utf-8')
  const sqlRule = tsModule.rules.find(r => r.id === 'no-raw-sql')
  const sqlViolations = sqlRule.check(sqlSource, 'raw-sql.ts')
  assert('no-raw-sql: detects violations', sqlViolations.length > 0, `${sqlViolations.length} found`)

  console.log('\n## 4. Rules — no-hardcoded-secrets')
  const secretSource = readFileSync(resolve(FIXTURES, 'hardcoded-secret.ts'), 'utf-8')
  const secretRule = tsModule.rules.find(r => r.id === 'no-hardcoded-secrets')
  const secretViolations = secretRule.check(secretSource, 'hardcoded-secret.ts')
  assert('no-hardcoded-secrets: catches 4 secrets', secretViolations.length === 4, `${secretViolations.length} found`)

  console.log('\n## 5. Rules — no-console-log')
  const consoleSource = 'console.log("test")\nconsole.warn("test")'
  const consoleRule = tsModule.rules.find(r => r.id === 'no-console-log')
  const consoleViolations = consoleRule.check(consoleSource, 'app.ts')
  assert('no-console-log: detects .log and .warn', consoleViolations.length === 2, `${consoleViolations.length} found`)
  const consoleTestViolations = consoleRule.check(consoleSource, 'app.test.ts')
  assert('no-console-log: skips test files', consoleTestViolations.length === 0)

  console.log('\n## 6. Rules — no-eval')
  const evalRule = tsModule.rules.find(r => r.id === 'no-eval')
  const evalViolations = evalRule.check('eval(userInput)\nnew Function("return 1")', 'app.ts')
  assert('no-eval: detects eval() and new Function()', evalViolations.length === 2, `${evalViolations.length} found`)

  console.log('\n## 7. Rules — max-function-lines')
  const funcRule = tsModule.rules.find(r => r.id === 'max-function-lines')
  const longFunc = ['function longFunc() {', ...Array(55).fill('  x();'), '}'].join('\n')
  const funcViolations = funcRule.check(longFunc, 'app.ts')
  assert('max-function-lines: 57-line function flagged', funcViolations.length > 0, `${funcViolations.length} found`)

  console.log('\n## 8. Rules — max-complexity')
  const complexRule = tsModule.rules.find(r => r.id === 'max-complexity')
  const complexFunc = 'function complex(x) {\n' + '  if (x) {}\n'.repeat(12) + '}'
  const complexViolations = complexRule.check(complexFunc, 'app.ts')
  assert('max-complexity: 12 branches flagged', complexViolations.length > 0, `${complexViolations.length} found`)

  console.log('\n## 9. Rules — require-null-check')
  const nullRule = tsModule.rules.find(r => r.id === 'require-null-check')
  const nullViolations = nullRule.check(`
    const users = [{id: "1", name: "a"}]
    const user = users.find(u => u.id === "1")
    return user.name
  `.trim(), 'app.ts')
  assert('require-null-check: flagged null access', nullViolations.length > 0, `${nullViolations.length} found`)

  console.log('\n## 10. Rules — require-error-handling')
  const awaitRule = tsModule.rules.find(r => r.id === 'require-error-handling')
  const awaitViolations = awaitRule.check('const data = await fetch(url)', 'app.ts')
  assert('require-error-handling: flagged bare await', awaitViolations.length > 0, `${awaitViolations.length} found`)

  console.log('\n## 11. Rules — require-csrf-decorator')
  const csrfRule = tsModule.rules.find(r => r.id === 'require-csrf-decorator')
  const csrfViolations = csrfRule.check('app.post("/api/data", handler)', 'routes.ts')
  assert('require-csrf-decorator: flagged POST without CSRF', csrfViolations.length > 0, `${csrfViolations.length} found`)
  const csrfOk = csrfRule.check(`
    import csrfProtection from 'csurf'
    app.use(csrfProtection)
    app.post("/api/data", handler)
  `.trim(), 'routes.ts')
  assert('require-csrf-decorator: no false positive with CSRF', csrfOk.length === 0)

  // Summary
  console.log(`\n## Results: ${PASS.length} passed, ${FAIL.length} failed`)
  if (FAIL.length > 0) {
    console.log(`\nFailed tests:\n${FAIL.map(f => `  ✗ ${f}`).join('\n')}`)
    process.exit(1)
  }
  process.exit(0)
}

main().catch(e => {
  console.error('Test error:', e)
  process.exit(1)
})
