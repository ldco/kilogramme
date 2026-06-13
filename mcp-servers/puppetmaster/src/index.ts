import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'

import { tools } from './tools/index.js'

const server = new Server(
  { name: 'pm-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools }
})

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params
  const tool = tools.find(t => t.name === name)
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }
  try {
    const result = await tool.handler(args ?? {})
    return {
      content: [{ type: 'text' as const, text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return {
      content: [{ type: 'text' as const, text: `Error: ${message}` }],
      isError: true,
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('PM MCP Server running on stdio')
}

main().catch((e: unknown) => {
  console.error('Fatal:', e)
  process.exit(1)
})
