import type { ToolDefinition } from './index.js'
import { t } from '../i18n/index.js'

export const listRulesTool: ToolDefinition = {
  name: t('constitution.tool.listRules.name'),
  description: t('constitution.tool.listRules.description'),
  inputSchema: { type: 'object', properties: {} },
  async handler(): Promise<string> {
    const modules = globalThis.__constitution_modules
    const result: Record<string, any[]> = {}
    if (modules) for (const [name, mod] of modules) result[name] = mod.rules.map(r => ({ id: r.id, severity: r.severity, description: r.description, auto_fixable: r.auto_fixable }))
    return JSON.stringify({ modules: result })
  },
}
