export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (args: Record<string, unknown>) => Promise<string>
}

import { checkFileTool } from './check-file.js'
import { checkProjectTool } from './check-project.js'
import { listRulesTool } from './list-rules.js'
import { statusTool } from './status.js'

export const tools: ToolDefinition[] = [
  checkFileTool,
  checkProjectTool,
  listRulesTool,
  statusTool,
]
