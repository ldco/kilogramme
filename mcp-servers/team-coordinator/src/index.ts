#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawn, execSync } from 'node:child_process'

const TEAMS_DIR = join(homedir(), '.kilo', 'teams')

interface TeamMember {
  id: string
  task: string
  session: string
  status: string
}

interface Team {
  name: string
  members: TeamMember[]
  created_at: string
}

const server = new Server(
  { name: 'team-coordinator', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

function ensureDir() {
  if (!existsSync(TEAMS_DIR)) mkdirSync(TEAMS_DIR, { recursive: true })
}

function getInboxPath(memberId: string): string {
  return join(TEAMS_DIR, '_inboxes', `${memberId}.json`)
}

function ensureInbox(memberId: string) {
  const inboxDir = join(TEAMS_DIR, '_inboxes')
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true })
  const p = getInboxPath(memberId)
  if (!existsSync(p)) writeFileSync(p, '[]')
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'team_create',
      description: 'Create a new agent team with multiple members. Each member gets a task.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Team name' },
          members: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Member ID' },
                task: { type: 'string', description: 'Task for this member' }
              },
              required: ['id', 'task']
            }
          }
        },
        required: ['name', 'members']
      }
    },
    {
      name: 'team_send',
      description: 'Send a message to a team member inbox.',
      inputSchema: {
        type: 'object',
        properties: {
          member_id: { type: 'string', description: 'Member ID' },
          message: { type: 'string', description: 'Message content' }
        },
        required: ['member_id', 'message']
      }
    },
    {
      name: 'team_receive',
      description: 'Read messages from your inbox.',
      inputSchema: {
        type: 'object',
        properties: {
          member_id: { type: 'string', description: 'Your member ID' }
        },
        required: ['member_id']
      }
    },
    {
      name: 'team_status',
      description: 'Check status of a team or all teams.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Team name (omit for all teams)' }
        }
      }
    },
    {
      name: 'team_start',
      description: 'Start all members of a team (spawns background processes).',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Team name' } },
        required: ['name']
      }
    }
  ]
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = req.params.arguments ?? {} as Record<string, unknown>
  ensureDir()

  switch (req.params.name) {
    case 'team_create': {
      const name = args.name as string
      const members = args.members as Array<{ id: string; task: string }>
      const team: Team = {
        name,
        members: members.map(m => ({
          id: m.id,
          task: m.task,
          session: `kilo-team-${name}-${m.id}`,
          status: 'created'
        })),
        created_at: new Date().toISOString()
      }
      writeFileSync(join(TEAMS_DIR, `${name}.json`), JSON.stringify(team, null, 2))
      for (const m of team.members) ensureInbox(m.id)
      return { content: [{ type: 'text', text: JSON.stringify({ created: true, name, member_count: members.length }) }] }
    }
    case 'team_send': {
      const memberId = args.member_id as string
      const message = args.message as string
      ensureInbox(memberId)
      const inbox = JSON.parse(readFileSync(getInboxPath(memberId), 'utf-8'))
      inbox.push({ from: 'coordinator', message, timestamp: new Date().toISOString() })
      writeFileSync(getInboxPath(memberId), JSON.stringify(inbox, null, 2))
      return { content: [{ type: 'text', text: JSON.stringify({ sent: true, to: memberId }) }] }
    }
    case 'team_receive': {
      const memberId = args.member_id as string
      const inboxPath = getInboxPath(memberId)
      if (!existsSync(inboxPath)) return { content: [{ type: 'text', text: JSON.stringify({ messages: [] }) }] }
      const inbox = JSON.parse(readFileSync(inboxPath, 'utf-8'))
      writeFileSync(inboxPath, '[]') // Clear after read
      return { content: [{ type: 'text', text: JSON.stringify({ messages: inbox }) }] }
    }
    case 'team_status': {
      const teamName = args.name as string | undefined
      if (teamName) {
        const path = join(TEAMS_DIR, `${teamName}.json`)
        if (!existsSync(path)) throw new Error(`Team not found: ${teamName}`)
        const team: Team = JSON.parse(readFileSync(path, 'utf-8'))
        return { content: [{ type: 'text', text: JSON.stringify({ name: team.name, members: team.members }) }] }
      }
      const teams = readdirSync(TEAMS_DIR)
        .filter(f => f.endsWith('.json') && f !== 'inboxes')
        .map(f => {
          const t: Team = JSON.parse(readFileSync(join(TEAMS_DIR, f), 'utf-8'))
          return { name: t.name, members: t.members.length }
        })
      return { content: [{ type: 'text', text: JSON.stringify(teams) }] }
    }
    case 'team_start': {
      const name = args.name as string
      const path = join(TEAMS_DIR, `${name}.json`)
      if (!existsSync(path)) throw new Error(`Team not found: ${name}`)
      const team: Team = JSON.parse(readFileSync(path, 'utf-8'))
      const results: Record<string, string> = {}
      for (const member of team.members) {
        try {
          execSync(`tmux new-session -d -s ${member.session} "kilo -p '${member.task}'"`, { stdio: 'ignore' })
          member.status = 'running'
          results[member.id] = 'started'
        } catch {
          member.status = 'failed'
          results[member.id] = 'failed'
        }
      }
      writeFileSync(path, JSON.stringify(team, null, 2))
      return { content: [{ type: 'text', text: JSON.stringify({ started: true, name, results }) }] }
    }
    default:
      throw new Error(`Unknown tool: ${req.params.name}`)
  }
})

async function main() {
  await server.connect(new StdioServerTransport())
}

main().catch(e => { console.error(e); process.exit(1) })
