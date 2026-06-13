import type { PmTool } from './index.js'
import { getProjectRoot, checkPort, fileExists, fileSize, loadConfig } from './utils.js'

export const statusTool: PmTool = {
  name: 'pm_status',
  description:
    'Display full Puppet Master project status: config mode, database state, dev server, enabled modules, features, and sections.',
  inputSchema: {
    type: 'object',
    properties: {
      detail: {
        type: 'string',
        enum: ['summary', 'config', 'modules', 'db', 'full'],
        description: 'Level of detail to return',
      },
    },
  },
  async handler(args) {
    const root = getProjectRoot()
    const detail = (args.detail as string) || 'summary'

    const status: Record<string, unknown> = { projectRoot: root }

    const config = await loadConfig(root)
    status.configExists = config !== null
    status.pmMode = config?.pmMode ?? 'unknown'

    if (detail === 'summary') {
      status.database = { exists: fileExists('data/sqlite.db') }
      status.devServer = { running: checkPort(3000), port: 3000 }
      const sections = config?.sections as string[] | undefined
      status.activeSections = sections ?? []
      return JSON.stringify(status, null, 2)
    }

    if (detail === 'config' || detail === 'modules' || detail === 'full') {
      status.aiWorkflow = config?.aiWorkflow ?? 'unknown'
      status.entities = config?.entities ?? {}
      status.features = config?.features ?? {}
      status.modules = config?.modules ?? {}
      status.locales = config?.locales ?? []
      status.defaultLocale = config?.defaultLocale ?? 'unknown'
      status.colors = config?.colors ?? {}
    }

    if (detail === 'db' || detail === 'full') {
      status.database = {
        exists: fileExists('data/sqlite.db'),
        path: 'data/sqlite.db',
        sizeBytes: fileSize('data/sqlite.db'),
      }
    }

    if (detail === 'modules' || detail === 'full') {
      if (config?.admin) {
        status.admin = config.admin
      }
      const sections = config?.sections as string[] | undefined
      status.activeSections = sections ?? []
    }

    if (detail === 'full') {
      status.devServer = {
        running: checkPort(3000),
        port: 3000,
        url: checkPort(3000) ? 'http://localhost:3000' : null,
      }
    }

    return JSON.stringify(status, null, 2)
  },
}
