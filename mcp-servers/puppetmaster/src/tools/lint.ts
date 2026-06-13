import type { PmTool } from './index.js'
import { npmScript, hasNpmScript } from './utils.js'

export const lintTool: PmTool = {
  name: 'pm_lint',
  description:
    'Run linting on the project. Supports ESLint and formatting checks. Can auto-fix issues with the fix option.',
  inputSchema: {
    type: 'object',
    properties: {
      fix: {
        type: 'boolean',
        description: 'Auto-fix lint issues',
      },
      format: {
        type: 'boolean',
        description: 'Run Prettier format check (or fix if combined with fix: true)',
      },
    },
  },
  async handler(args) {
    const results: string[] = []
    const fix = args.fix === true

    if (fix) {
      if (hasNpmScript('lint:fix')) {
        results.push(npmScript('lint:fix'))
      }
      if (hasNpmScript('format')) {
        results.push(npmScript('format'))
      }
    } else {
      if (hasNpmScript('lint')) {
        results.push(npmScript('lint'))
      }
      if (hasNpmScript('format:check')) {
        results.push(npmScript('format:check'))
      }
    }

    return results.join('\n') || 'Lint completed.'
  },
}
