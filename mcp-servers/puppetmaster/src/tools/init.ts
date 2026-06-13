import type { PmTool } from './index.js'
import { getProjectRoot, runCmd, fileExists } from './utils.js'

export const initTool: PmTool = {
  name: 'pm_init',
  description:
    'Initialize a Puppet Master project. Checks dependencies, reads pmMode from config, and guides through setup (develop or build mode). Optionally starts the dev server.',
  inputSchema: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['develop', 'build', 'auto'],
        description: 'Set pmMode: develop (framework dev, seeded DB), build (client project, empty DB), or auto (read existing config)',
      },
      startDev: {
        type: 'boolean',
        description: 'Start dev server after initialization',
      },
    },
  },
  async handler(args) {
    const root = getProjectRoot()
    const results: string[] = []

    if (!fileExists('node_modules/.bin/nuxt')) {
      results.push('Dependencies missing. Run: npm install')
      return results.join('\n')
    }

    const configPath = 'project/puppet-master.config.ts'
    const configRaw = fileExists(configPath)
      ? await import(`${root}/project/puppet-master.config.ts`).then(m => m.default).catch(() => null)
      : null

    results.push(`Project root: ${root}`)
    results.push(`Config exists: ${!!configRaw}`)

    if (configRaw) {
      results.push(`Current pmMode: ${configRaw.pmMode}`)
    }

    const mode = args.mode as string ?? 'auto'
    results.push(`Requested mode: ${mode}`)
    results.push('Next steps: verify config, run db:push, optionally db:seed, start dev server.')
    results.push('Use pm_status for full project status.')

    return results.join('\n')
  },
}
