import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { initTool } from './init.js'
import { devTool } from './dev.js'
import { statusTool } from './status.js'
import { dbTools } from './db.js'
import { deployTools } from './deploy.js'
import { buildTool } from './build.js'
import { lintTool } from './lint.js'
import { testTool } from './test.js'
import { configTools } from './config.js'
import { knowledgeTools } from './knowledge.js'
import { contributeTools } from './contribute.js'
import { reviewTools } from './review.js'
import { gitTools } from './git.js'

export interface PmTool extends Tool {
  handler: (args: Record<string, unknown>) => Promise<string>
}

export const tools: PmTool[] = [
  initTool,
  devTool,
  statusTool,
  ...dbTools,
  ...deployTools,
  buildTool,
  lintTool,
  testTool,
  ...configTools,
  ...knowledgeTools,
  ...contributeTools,
  ...reviewTools,
  ...gitTools,
]
