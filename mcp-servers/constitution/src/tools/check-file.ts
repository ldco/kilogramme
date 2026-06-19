import type { ToolDefinition } from './index.js'
import { walkTree } from '../core/walker.js'
import { formatSummary } from '../core/violations.js'
import { t } from '../i18n/index.js'
import { extname, resolve, isAbsolute } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'

function detectLanguage(ext: string): string | null {
  const map: Record<string, string> = { '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript', '.cts': 'typescript', '.js': 'typescript', '.jsx': 'typescript', '.py': 'python', '.rs': 'rust', '.go': 'go' }
  return map[ext] || null
}

export const checkFileTool: ToolDefinition = {
  name: t('constitution.tool.checkFile.name'),
  description: t('constitution.tool.checkFile.description'),
  inputSchema: { type: 'object', properties: { path: { type: 'string', description: t('constitution.tool.checkFile.inputPath') } }, required: ['path'] },
  async handler(args: Record<string, unknown>): Promise<string> {
    const filePath = args.path as string
    const modules = globalThis.__constitution_modules
    if (!modules || modules.size === 0) {
      return JSON.stringify({ violations: [], pass: true, file: filePath, language: 'unknown', rules_checked: 0, note: t('constitution.module.noModules') })
    }
    const absPath = isAbsolute(filePath) ? filePath : resolve(process.cwd(), filePath)
    if (!existsSync(absPath)) {
      return JSON.stringify({ violations: [], pass: true, file: filePath, language: 'unknown', rules_checked: 0, error: t('constitution.check.fileNotFound', { path: absPath }) })
    }
    const ext = extname(filePath)
    const lang = detectLanguage(ext)
    if (!lang) {
      return JSON.stringify({ violations: [], pass: true, file: filePath, language: 'unknown', rules_checked: 0, note: t('constitution.module.unknownLang', { ext }) })
    }
    const moduleDef = modules.get(lang)
    if (!moduleDef) {
      return JSON.stringify({ violations: [], pass: true, file: filePath, language: lang, rules_checked: 0, note: t('constitution.module.langNotLoaded', { lang }) })
    }
    const source = readFileSync(absPath, 'utf-8')
    const violations = walkTree(source, filePath, moduleDef.rules)
    const pass = violations.filter(v => v.severity === 'error').length === 0
    return JSON.stringify({ violations, pass, file: filePath, language: lang, rules_checked: moduleDef.rules.length, summary: violations.length > 0 ? formatSummary(violations) : t('constitution.check.passed') })
  },
}
