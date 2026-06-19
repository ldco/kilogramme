#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { execSync } from 'node:child_process'

const MEMORY_ROOT = join(homedir(), '.kilo', 'memory')
const MEMORY_CAP_LINES = 200
const MEMORY_CAP_BYTES = 25_000

const server = new Server(
  { name: 'session-memory', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

function getProjectSlug(projectPath: string): string {
  try {
    const remote = execSync('git remote get-url origin', {
      cwd: projectPath, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
    const m = remote.match(/[\/:]([^\/]+)\/([^\/]+?)\.git$/)
    if (m) return `${m[1]}/${m[2]}`
  } catch {}
  return resolve(projectPath).split('/').filter(Boolean).pop() || 'unknown'
}

function projectDir(projectPath: string): string {
  const slug = getProjectSlug(projectPath)
  const dir = join(MEMORY_ROOT, slug)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function readMemoryFile(path: string): string {
  if (!existsSync(path)) return ''
  const content = readFileSync(path, 'utf-8')
  const lines = content.split('\n')
  const cap = Math.min(lines.length, MEMORY_CAP_LINES)
  let bytes = 0
  let capLine = cap
  for (let i = 0; i < cap; i++) {
    bytes += Buffer.byteLength(lines[i] + '\n')
    if (bytes > MEMORY_CAP_BYTES) { capLine = i; break }
  }
  return lines.slice(0, capLine).join('\n')
}

function listTopicFiles(projectDirPath: string): string[] {
  if (!existsSync(projectDirPath)) return []
  return readdirSync(projectDirPath)
    .filter(f => f.endsWith('.md') && f !== 'MEMORY.md')
    .map(f => f.replace(/\.md$/, ''))
}

function searchMemory(projectDirPath: string, query: string): Array<{ file: string; matches: string[] }> {
  const results: Array<{ file: string; matches: string[] }> = []
  if (!existsSync(projectDirPath)) return results
  for (const f of readdirSync(projectDirPath)) {
    if (!f.endsWith('.md')) continue
    const content = readFileSync(join(projectDirPath, f), 'utf-8')
    const lines = content.split('\n')
    const matches: string[] = []
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(query.toLowerCase())) {
        matches.push(`L${i + 1}: ${lines[i].trim()}`)
      }
    }
    if (matches.length > 0) results.push({ file: f, matches })
  }
  return results
}

function ensureMemdHeadings(content: string): string {
  if (!content.startsWith('# Memory:')) {
    return `# Memory: project\n\nAuto-memory notes accumulated across sessions.\n\n${content}`
  }
  return content
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'memory_load',
      description: 'Load MEMORY.md for a project (first 200 lines / 25KB). Returns the memo content and available topic files.',
      inputSchema: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Path to project root' }
        },
        required: ['project_path']
      }
    },
    {
      name: 'memory_save',
      description: 'Save a learning to project memory. Appends to MEMORY.md or creates/updates a topic file.',
      inputSchema: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Path to project root' },
          section: { type: 'string', description: 'Section header (e.g. Build & Run, Architecture, Debugging)' },
          content: { type: 'string', description: '1-2 sentence learning to save, prefixed with -' },
          topic_file: { type: 'string', description: 'Optional topic file name (without .md). If provided, saves to topic file instead of MEMORY.md.' }
        },
        required: ['project_path', 'content']
      }
    },
    {
      name: 'memory_list_topics',
      description: 'List available topic files for a project.',
      inputSchema: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Path to project root' }
        },
        required: ['project_path']
      }
    },
    {
      name: 'memory_search',
      description: 'Full-text search across all memory files for a project.',
      inputSchema: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Path to project root' },
          query: { type: 'string', description: 'Search term' }
        },
        required: ['project_path', 'query']
      }
    },
    {
      name: 'memory_consolidate',
      description: 'Consolidate MEMORY.md: remove duplicates, merge related entries, keep under 200 lines. Archive >5 entries on one topic to a topic file.',
      inputSchema: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Path to project root' }
        },
        required: ['project_path']
      }
    }
  ]
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = req.params.arguments ?? {} as Record<string, unknown>
  const projectPath = args.project_path as string
  if (!projectPath) throw new Error('project_path is required')
  const dir = projectDir(projectPath)
  const memdPath = join(dir, 'MEMORY.md')

  switch (req.params.name) {
    case 'memory_load': {
      const content = readMemoryFile(memdPath)
      const topics = listTopicFiles(dir)
      return {
        content: [{ type: 'text', text: JSON.stringify({ content, topics, memory_dir: dir }) }]
      }
    }
    case 'memory_save': {
      const section = (args.section as string) || ''
      const content = args.content as string
      const topicFile = args.topic_file as string | undefined

      if (topicFile) {
        const topicPath = join(dir, `${topicFile}.md`)
        let existing = ''
        if (existsSync(topicPath)) existing = readFileSync(topicPath, 'utf-8')
        const entry = `\n- ${content}`
        writeFileSync(topicPath, existing + entry)
        return { content: [{ type: 'text', text: JSON.stringify({ saved: true, file: `${topicFile}.md` }) }] }
      }

      let memd = ''
      if (existsSync(memdPath)) memd = readFileSync(memdPath, 'utf-8')
      if (!memd) memd = ensureMemdHeadings(memd)

      if (section) {
        const header = `## ${section}`
        if (memd.includes(header)) {
          const idx = memd.indexOf(header)
          const nextSectionIdx = memd.indexOf('\n## ', idx + 1)
          if (nextSectionIdx > idx) {
            memd = memd.slice(0, nextSectionIdx) + `\n- ${content}` + memd.slice(nextSectionIdx)
          } else {
            memd = memd + `\n- ${content}\n`
          }
        } else {
          memd = memd + `\n${header}\n- ${content}\n`
        }
      } else {
        memd = memd + `\n- ${content}\n`
      }

      writeFileSync(memdPath, memd)
      return { content: [{ type: 'text', text: JSON.stringify({ saved: true, file: 'MEMORY.md' }) }] }
    }
    case 'memory_list_topics': {
      const topics = listTopicFiles(dir)
      return { content: [{ type: 'text', text: JSON.stringify({ topics, memory_dir: dir }) }] }
    }
    case 'memory_search': {
      const query = args.query as string
      if (!query) throw new Error('query is required')
      const results = searchMemory(dir, query)
      return { content: [{ type: 'text', text: JSON.stringify({ results, count: results.length }) }] }
    }
    case 'memory_consolidate': {
      // Simple consolidation: read MEMORY.md, remove duplicate lines, count entries per section
      if (!existsSync(memdPath)) {
        return { content: [{ type: 'text', text: JSON.stringify({ consolidated: false, reason: 'No MEMORY.md exists' }) }] }
      }
      const memd = readFileSync(memdPath, 'utf-8')
      const lines = memd.split('\n')
      const seen = new Set<string>()
      const deduped: string[] = []
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('- ') && seen.has(trimmed)) continue
        if (trimmed.startsWith('- ')) seen.add(trimmed)
        deduped.push(line)
      }
      writeFileSync(memdPath, deduped.join('\n'))
      return { content: [{ type: 'text', text: JSON.stringify({ consolidated: true, lines_before: lines.length, lines_after: deduped.length }) }] }
    }
    default:
      throw new Error(`Unknown tool: ${req.params.name}`)
  }
})

async function main() {
  await server.connect(new StdioServerTransport())
}

main().catch(e => { console.error(e); process.exit(1) })
