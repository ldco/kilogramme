import type { PmTool } from './index.js'
import { getProjectRoot, runCmd, runCmdDetached, checkPort } from './utils.js'

export const devTool: PmTool = {
  name: 'pm_dev',
  description:
    'Manage the PM development server. Start, stop, restart, or check status. The dev server runs on port 3000 by default.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['start', 'stop', 'restart', 'status'],
        description: 'Action to perform on the dev server',
      },
      port: {
        type: 'number',
        description: 'Port to check (default: 3000)',
      },
    },
  },
  async handler(args) {
    const action = (args.action as string) || 'status'
    const port = (args.port as number) || 3000
    const root = getProjectRoot()

    const isRunning = checkPort(port)

    if (action === 'status') {
      return JSON.stringify({
        running: isRunning,
        port,
        url: isRunning ? `http://localhost:${port}` : null,
        projectRoot: root,
      })
    }

    if (action === 'stop') {
      if (!isRunning) return 'Dev server is not running.'
      runCmd(`lsof -i :${port} -sTCP:LISTEN -t | xargs kill 2>/dev/null; pkill -f "nuxt" 2>/dev/null || true`)
      return `Dev server on port ${port} has been stopped.`
    }

    if (action === 'start' || action === 'restart') {
      if (isRunning && action === 'start') {
        return `Dev server already running on port ${port}. Use pm_dev restart to cycle it.`
      }
      if (isRunning && action === 'restart') {
        runCmd(`lsof -i :${port} -sTCP:LISTEN -t | xargs kill 2>/dev/null; pkill -f "nuxt" 2>/dev/null || true`)
        await new Promise(r => setTimeout(r, 2000))
      }
      const pid = runCmdDetached('npm', ['run', 'dev'], root)
      return `Dev server starting (pid ${pid}) on port ${port}. Use pm_dev status to verify.`
    }

    return `Unknown action: ${action}`
  },
}
