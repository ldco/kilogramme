import type { ToolDefinition } from './index.js'

export const statusTool: ToolDefinition = {
  name: 'constitution_status',
  description: 'Show Constitution server status: active modules, rules count, config.',
  inputSchema: { type: 'object', properties: {} },
  async handler(): Promise<string> {
    const modules = globalThis.__constitution_modules
    const activeModules: string[] = []
    let activeRules = 0
    if (modules) for (const [name, mod] of modules) { activeModules.push(name); activeRules += mod.rules.length }
    return JSON.stringify({ server: 'constitution-mcp-server', version: '0.1.0', active_modules: activeModules, active_rules: activeRules })
  },
}
