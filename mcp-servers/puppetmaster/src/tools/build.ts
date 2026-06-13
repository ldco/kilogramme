import type { PmTool } from './index.js'
import { npmScript, hasNpmScript } from './utils.js'

export const buildTool: PmTool = {
  name: 'pm_build',
  description:
    'Run a production build of the Puppet Master project. Creates optimized output in .output/ directory. Only use when explicitly requested for deployment or testing.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  async handler() {
    if (!hasNpmScript('build')) {
      return 'Build script not found.'
    }
    const output = npmScript('build')
    return output || 'Build completed successfully.'
  },
}
