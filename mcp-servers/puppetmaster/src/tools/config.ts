import type { PmTool } from './index.js'
import { getProjectRoot, loadConfig, fileExists } from './utils.js'

export const configTools: PmTool[] = [
  {
    name: 'pm_config_get',
    description:
      'Read Puppet Master configuration values. Returns pmMode, entities, features, modules, sections, locales, colors, admin settings.',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Dot-notation key to read (e.g. "pmMode", "modules.blog", "colors.brand"). Omit for full config.',
        },
      },
    },
    async handler(args) {
      const config = await loadConfig(getProjectRoot())
      if (!config) return 'No config file found at project/puppet-master.config.ts'

      const key = args.key as string | undefined
      if (!key) return JSON.stringify(config, null, 2)

      const parts = key.split('.')
      let value: unknown = config
      for (const part of parts) {
        if (value == null || typeof value !== 'object') return `Key "${key}" not found.`
        value = (value as Record<string, unknown>)[part]
      }

      if (typeof value === 'object') return JSON.stringify(value, null, 2)
      return String(value)
    },
  },
  {
    name: 'pm_config_set',
    description:
      'Modify a Puppet Master configuration value directly in project/puppet-master.config.ts. Supports dot-notation keys. WARNING: rewrites the config file as JavaScript.',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Dot-notation key to set (e.g. "pmMode", "modules.blog.enabled")',
        },
        value: {
          description: 'New value to set (string, boolean, number, or JSON)',
        },
      },
      required: ['key'],
    },
    async handler(args) {
      const { key, value } = args as { key: string; value?: unknown }

      if (!fileExists('project/puppet-master.config.ts')) {
        return 'Config file not found at project/puppet-master.config.ts'
      }

      const { readFileSync, writeFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')

      const root = getProjectRoot()
      const configPath = resolve(root, 'project/puppet-master.config.ts')
      let content = readFileSync(configPath, 'utf-8')

      const valueStr = typeof value === 'string'
        ? `'${value.replace(/'/g, "\\'")}'`
        : JSON.stringify(value)

      const regex = new RegExp(`(${key.replace(/\./g, '\\.')}\\s*:\\s*)([^,\\n}]+)`, 'g')
      if (!regex.test(content)) {
        return `Key "${key}" not found in config. Manual edit required.`
      }

      content = content.replace(regex, `$1${valueStr}`)
      writeFileSync(configPath, content, 'utf-8')
      return `Set ${key} = ${valueStr} in project/puppet-master.config.ts`
    },
  },
]
