#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

interface HookHandler {
  id: string
  type: 'command' | 'http' | 'mcp_tool'
  event: string
  matcher: string
  command?: string
  args?: string[]
  url?: string
  server?: string
  tool?: string
  input?: Record<string, string>
  timeout?: number
  async?: boolean
}

const HOOKS_CONFIG = join(homedir(), '.kilo', 'hooks.json')
const CHANNELS_DIR = join(homedir(), '.kilo', 'channels')

interface Message {
  id: string
  from: string
  channel: string
  message: string
  timestamp: string
}

interface HooksConfig {
  hooks: Record<string, HookHandler[]>
}

function loadConfig(): HooksConfig {
  if (!existsSync(HOOKS_CONFIG)) return { hooks: {} }
  try { return JSON.parse(readFileSync(HOOKS_CONFIG, 'utf-8')) } catch { return { hooks: {} } }
}

function saveConfig(config: HooksConfig): void {
  const dir = join(homedir(), '.kilo')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(HOOKS_CONFIG, JSON.stringify(config, null, 2))
}

function matchesTool(name: string, matcher: string): boolean {
  if (!matcher || matcher === '*') return true
  const parts = matcher.split('|')
  for (const p of parts) {
    const trimmed = p.trim()
    if (trimmed.includes('*')) {
      const re = new RegExp('^' + trimmed.replace(/\*/g, '.*') + '$')
      if (re.test(name)) return true
    } else if (trimmed === name) return true
  }
  return false
}

function executeCommand(handler: HookHandler, context: Record<string, unknown>): void {
  if (!handler.command) return
  const cmd = handler.command
  const args = handler.args ?? []
  const proc = spawn(cmd, args, {
    stdio: ['pipe', 'ignore', 'ignore'],
    env: { ...process.env, HOOK_CONTEXT: JSON.stringify(context) }
  })
  proc.stdin.write(JSON.stringify(context))
  proc.stdin.end()
  if (handler.timeout) {
    setTimeout(() => proc.kill(), handler.timeout * 1000)
  }
}

const server = new Server(
  { name: 'hooks', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'hooks_register',
      description: 'Register a lifecycle hook. The hook fires when the specified event occurs with matching tool.',
      inputSchema: {
        type: 'object',
        properties: {
          event: {
            type: 'string',
            description: 'Lifecycle event: PreToolUse, PostToolUse, SessionStart, SessionEnd, Stop',
            enum: ['PreToolUse', 'PostToolUse', 'SessionStart', 'SessionEnd', 'Stop']
          },
          matcher: { type: 'string', description: 'Tool name pattern. Use * for all, Bash|Edit for multiple, or a regex.' },
          type: {
            type: 'string',
            description: 'Handler type',
            enum: ['command', 'http', 'mcp_tool']
          },
          command: { type: 'string', description: 'Shell command (for type=command)' },
          args: { type: 'array', items: { type: 'string' }, description: 'Command arguments (for type=command)' },
          url: { type: 'string', description: 'HTTP URL (for type=http)' },
          server: { type: 'string', description: 'MCP server name (for type=mcp_tool)' },
          tool: { type: 'string', description: 'MCP tool name (for type=mcp_tool)' },
          timeout: { type: 'number', description: 'Timeout in seconds' }
        },
        required: ['event', 'type']
      }
    },
    {
      name: 'hooks_fire',
      description: 'Fire hooks for a given event. The agent calls this at lifecycle points.',
      inputSchema: {
        type: 'object',
        properties: {
          event: { type: 'string', description: 'Event name' },
          tool_name: { type: 'string', description: 'Name of the tool being used (for tool events)' },
          context: { type: 'object', description: 'Additional context data' }
        },
        required: ['event']
      }
    },
    {
      name: 'hooks_list',
      description: 'List all registered hooks.',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'hooks_remove',
      description: 'Remove a registered hook by its ID.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Hook ID to remove' }
        },
        required: ['id']
      }
    },
    {
      name: 'hooks_persist',
      description: 'Save current hooks to persistent config (.kilo/hooks.json).',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'channels_post',
      description: 'Post a message to a channel. External tools can use this to send notifications, CI results, or alerts into the session.',
      inputSchema: {
        type: 'object',
        properties: {
          channel: { type: 'string', description: 'Channel name (e.g. ci, alerts, chat)' },
          from: { type: 'string', description: 'Sender name (e.g. github-actions, slack-bot)' },
          message: { type: 'string', description: 'Message content' }
        },
        required: ['channel', 'from', 'message']
      }
    },
    {
      name: 'channels_read',
      description: 'Read pending messages from all channels. Returns messages posted since last read.',
      inputSchema: { type: 'object', properties: {
        channel: { type: 'string', description: 'Optional: filter by channel name' }
      } }
    },
    {
      name: 'channels_listen',
      description: 'Start a background HTTP webhook server that accepts POST requests and writes them to channels. Returns the webhook URL.',
      inputSchema: {
        type: 'object',
        properties: {
          port: { type: 'number', description: 'Port to listen on (default: 9337)' }
        }
      }
    }
  ]
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = req.params.arguments ?? {} as Record<string, unknown>
  const config = loadConfig()

  switch (req.params.name) {
    case 'hooks_register': {
      const handler: HookHandler = {
        id: `${args.event}-${args.type}-${Date.now()}`,
        type: args.type as HookHandler['type'],
        event: args.event as string,
        matcher: (args.matcher as string) || '*',
        command: args.command as string | undefined,
        args: args.args as string[] | undefined,
        url: args.url as string | undefined,
        server: args.server as string | undefined,
        tool: args.tool as string | undefined,
        timeout: args.timeout as number | undefined
      }
      if (!config.hooks[handler.event]) config.hooks[handler.event] = []
      config.hooks[handler.event].push(handler)
      saveConfig(config)
      return { content: [{ type: 'text', text: JSON.stringify({ registered: true, id: handler.id }) }] }
    }
    case 'hooks_fire': {
      const event = args.event as string
      const toolName = args.tool_name as string | undefined
      const context = (args.context as Record<string, unknown>) ?? {}
      const eventHooks = config.hooks[event] ?? []
      let fired = 0

      for (const handler of eventHooks) {
        if (toolName && !matchesTool(toolName, handler.matcher)) continue
        switch (handler.type) {
          case 'command':
            executeCommand(handler, { event, tool_name: toolName, ...context })
            fired++
            break
          case 'http':
            if (handler.url) {
              // Fire-and-forget HTTP POST
              const url = handler.url
              spawn('curl', ['-s', '-X', 'POST', url, '-H', 'Content-Type: application/json', '-d', JSON.stringify({ event, tool_name: toolName, ...context })], { stdio: 'ignore' })
              fired++
            }
            break
          case 'mcp_tool':
            // MCP tool hooks are handled separately by the instruction system
            fired++
            break
        }
      }
      return { content: [{ type: 'text', text: JSON.stringify({ event, fired, total: eventHooks.length }) }] }
    }
    case 'hooks_list': {
      return { content: [{ type: 'text', text: JSON.stringify(config.hooks) }] }
    }
    case 'hooks_remove': {
      const id = args.id as string
      for (const event of Object.keys(config.hooks)) {
        config.hooks[event] = config.hooks[event].filter(h => h.id !== id)
        if (config.hooks[event].length === 0) delete config.hooks[event]
      }
      saveConfig(config)
      return { content: [{ type: 'text', text: JSON.stringify({ removed: true, id }) }] }
    }
    case 'hooks_persist': {
      saveConfig(config)
      return { content: [{ type: 'text', text: JSON.stringify({ persisted: true }) }] }
    }
    case 'channels_post': {
      const channel = args.channel as string
      const from = args.from as string
      const messageText = args.message as string
      if (!existsSync(CHANNELS_DIR)) mkdirSync(CHANNELS_DIR, { recursive: true })
      const msg: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        from, channel, message: messageText,
        timestamp: new Date().toISOString()
      }
      const inboxPath = join(CHANNELS_DIR, `${channel}.json`)
      let inbox: Message[] = []
      if (existsSync(inboxPath)) {
        try { inbox = JSON.parse(readFileSync(inboxPath, 'utf-8')) } catch {}
      }
      inbox.push(msg)
      writeFileSync(inboxPath, JSON.stringify(inbox, null, 2))
      return { content: [{ type: 'text', text: JSON.stringify({ posted: true, id: msg.id, channel }) }] }
    }
    case 'channels_read': {
      const filterChannel = args.channel as string | undefined
      if (!existsSync(CHANNELS_DIR)) {
        return { content: [{ type: 'text', text: JSON.stringify({ messages: [], count: 0 }) }] }
      }
      const allMessages: Message[] = []
      const files = filterChannel
        ? [`${filterChannel}.json`]
        : (readdirSync(CHANNELS_DIR) as string[]).filter(f => f.endsWith('.json'))
      for (const f of files) {
        const fp = join(CHANNELS_DIR, f)
        if (!existsSync(fp)) continue
        try {
          const msgs: Message[] = JSON.parse(readFileSync(fp, 'utf-8'))
          allMessages.push(...msgs)
          // Clear inbox after read
          writeFileSync(fp, '[]')
        } catch {}
      }
      allMessages.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      return { content: [{ type: 'text', text: JSON.stringify({ messages: allMessages, count: allMessages.length }) }] }
    }
    case 'channels_listen': {
      const port = (args.port as number) || 9337
      const webhookUrl = `http://127.0.0.1:${port}`
      const http = require('node:http')
      const server = http.createServer((req: any, res: any) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (c: string) => body += c)
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              const channel = data.channel || 'webhook'
              const from = data.from || 'webhook'
              const messageText = data.message || data.text || JSON.stringify(data)
              if (!existsSync(CHANNELS_DIR)) mkdirSync(CHANNELS_DIR, { recursive: true })
              const msg: Message = {
                id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                from, channel, message: messageText,
                timestamp: new Date().toISOString()
              }
              const inboxPath = join(CHANNELS_DIR, `${channel}.json`)
              let inbox: Message[] = []
              if (existsSync(inboxPath)) {
                try { inbox = JSON.parse(readFileSync(inboxPath, 'utf-8')) } catch {}
              }
              inbox.push(msg)
              writeFileSync(inboxPath, JSON.stringify(inbox, null, 2))
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: true, id: msg.id }))
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: String(e) }))
            }
          })
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end(`kilo-channel-webhook running. POST JSON { channel, from, message } to this URL.\n`)
        }
      })
      server.listen(port, '127.0.0.1')
      return { content: [{ type: 'text', text: JSON.stringify({ listening: true, url: webhookUrl, port }) }] }
    }
    default:
      throw new Error(`Unknown tool: ${req.params.name}`)
  }
})

async function main() {
  await server.connect(new StdioServerTransport())
}

main().catch(e => { console.error(e); process.exit(1) })
