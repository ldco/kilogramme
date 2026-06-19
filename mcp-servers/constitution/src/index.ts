#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { tools } from './tools/index.js'
import { findConfig, loadModules } from './core/module-loader.js'

const server = new Server(
  { name: 'constitution-mcp-server', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find(t => t.name === request.params.name)
  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`)
  }
  return {
    content: [
      {
        type: 'text',
        text: await tool.handler(request.params.arguments ?? {}),
      },
    ],
  }
})

async function main() {
  const config = findConfig()
  const modules = await loadModules(config)
  globalThis.__constitution_modules = modules

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(error => {
  console.error('[constitution] Fatal error:', error)
  process.exit(1)
})
