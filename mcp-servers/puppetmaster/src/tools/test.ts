import type { PmTool } from './index.js'
import { npmScript, hasNpmScript, fileExists } from './utils.js'

const VALID_SUITES = ['unit', 'api', 'e2e', 'e2e:playwright', 'staged'] as const

export const testTool: PmTool = {
  name: 'pm_test',
  description:
    'Run tests for the Puppet Master project. Supports unit tests, API tests, E2E tests (Playwright), and the full staged suite.',
  inputSchema: {
    type: 'object',
    properties: {
      suite: {
        type: 'string',
        description: 'Test suite to run: unit, api, e2e, e2e:playwright, staged (default)',
      },
    },
  },
  async handler(args) {
    const suite = (args.suite as string) || 'staged'

    if (!VALID_SUITES.includes(suite as typeof VALID_SUITES[number])) {
      return `Invalid suite: ${suite}. Valid: ${VALID_SUITES.join(', ')}`
    }

    const scriptMap: Record<string, string> = {
      unit: 'test:unit',
      api: 'test:api',
      e2e: 'test:e2e',
      'e2e:playwright': 'test:e2e:playwright',
      staged: 'test:staged',
    }

    const script = scriptMap[suite]
    if (!script || !hasNpmScript(script)) {
      return `Test script "${script}" not found.`
    }

    const output = npmScript(script)
    return output || 'All tests passed.'
  },
}
