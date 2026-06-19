#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const REGISTRY_URL = 'https://raw.githubusercontent.com/Kilo-Org/kilo-extensions/main/registry.json'
const SKILLS_DIR = join(homedir(), '.kilo', 'skills')
const MCP_DIR = join(homedir(), '.config', 'kilo', 'mcp-servers')

interface RegistryEntry {
  name: string
  type: 'skill' | 'mcp'
  description: string
  source: string
  version: string
  author?: string
}

interface Registry {
  version: string
  entries: RegistryEntry[]
}

const server = new Server(
  { name: 'plugin-registry', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'plugin_search',
      description: 'Search for available extensions in the registry.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term' },
          type: { type: 'string', enum: ['skill', 'mcp', ''], description: 'Filter by type' }
        },
        required: ['query']
      }
    },
    {
      name: 'plugin_install',
      description: 'Install an extension from the registry.',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Extension name' } },
        required: ['name']
      }
    },
    {
      name: 'plugin_list',
      description: 'List installed extensions.',
      inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['skill', 'mcp', ''] } } }
    },
    {
      name: 'plugin_remove',
      description: 'Remove an installed extension.',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Extension name' } },
        required: ['name']
      }
    }
  ]
}))

async function fetchRegistry(): Promise<Registry> {
  try {
    const res = await fetch(REGISTRY_URL)
    if (res.ok) return await res.json() as Registry
  } catch {}
  return { version: '0.0.0', entries: [] }
}

function listInstalledSkills(): string[] {
  if (!existsSync(SKILLS_DIR)) return []
  return readdirSync(SKILLS_DIR).filter(d => existsSync(join(SKILLS_DIR, d, 'SKILL.md')))
}

function listInstalledMcps(): string[] {
  if (!existsSync(MCP_DIR)) return []
  return readdirSync(MCP_DIR).filter(d => existsSync(join(MCP_DIR, d, 'package.json')))
}

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = req.params.arguments ?? {} as Record<string, unknown>

  switch (req.params.name) {
    case 'plugin_search': {
      const query = (args.query as string || '').toLowerCase()
      const type = args.type as string || ''
      const registry = await fetchRegistry()
      let results = registry.entries
      if (query) results = results.filter(e => e.name.toLowerCase().includes(query) || e.description.toLowerCase().includes(query))
      if (type) results = results.filter(e => e.type === type)
      return { content: [{ type: 'text', text: JSON.stringify({ results, count: results.length }) }] }
    }
    case 'plugin_install': {
      const name = args.name as string
      if (!name) throw new Error('name is required')
      const registry = await fetchRegistry()
      const entry = registry.entries.find(e => e.name === name)
      if (!entry) throw new Error(`Plugin not found in registry: ${name}`)

      if (entry.type === 'skill') {
        const targetDir = join(SKILLS_DIR, entry.name)
        if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true })
        execSync(`git clone ${entry.source} /tmp/kilo-install-${name} 2>/dev/null || curl -sL ${entry.source} -o ${join(targetDir, 'SKILL.md')}`, { stdio: 'ignore' })
        if (existsSync(`/tmp/kilo-install-${name}`)) {
          execSync(`cp -r /tmp/kilo-install-${name}/* ${targetDir}/ && rm -rf /tmp/kilo-install-${name}`, { stdio: 'ignore' })
        }
      } else if (entry.type === 'mcp') {
        const targetDir = join(MCP_DIR, entry.name)
        if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true })
        execSync(`git clone ${entry.source} ${targetDir} 2>/dev/null && cd ${targetDir} && npm install 2>/dev/null`, { stdio: 'ignore' })
      }

      return { content: [{ type: 'text', text: JSON.stringify({ installed: true, name, type: entry.type }) }] }
    }
    case 'plugin_list': {
      const filterType = args.type as string || ''
      const skills = filterType && filterType !== 'skill' ? [] : listInstalledSkills()
      const mcps = filterType && filterType !== 'mcp' ? [] : listInstalledMcps()
      return { content: [{ type: 'text', text: JSON.stringify({ skills, mcps }) }] }
    }
    case 'plugin_remove': {
      const name = args.name as string
      const skillDir = join(SKILLS_DIR, name)
      const mcpDir = join(MCP_DIR, name)
      if (existsSync(skillDir)) {
        execSync(`rm -rf "${skillDir}"`, { stdio: 'ignore' })
        return { content: [{ type: 'text', text: JSON.stringify({ removed: true, name, type: 'skill' }) }] }
      }
      if (existsSync(mcpDir)) {
        execSync(`rm -rf "${mcpDir}"`, { stdio: 'ignore' })
        return { content: [{ type: 'text', text: JSON.stringify({ removed: true, name, type: 'mcp' }) }] }
      }
      throw new Error(`Not found: ${name}`)
    }
    default:
      throw new Error(`Unknown tool: ${req.params.name}`)
  }
})

async function main() {
  await server.connect(new StdioServerTransport())
}

main().catch(e => { console.error(e); process.exit(1) })
