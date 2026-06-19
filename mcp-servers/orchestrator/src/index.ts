#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const WORKFLOWS_DIR = join(homedir(), '.kilo', 'workflows')

interface WorkflowStep {
  id: string
  agent: string
  task: string
  depends_on?: string[]
  timeout?: number
}

interface Workflow {
  name: string
  steps: WorkflowStep[]
  status: 'created' | 'running' | 'completed' | 'failed'
  created_at: string
}

const server = new Server(
  { name: 'orchestrator', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

function ensureDir() {
  if (!existsSync(WORKFLOWS_DIR)) mkdirSync(WORKFLOWS_DIR, { recursive: true })
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'workflow_create',
      description: 'Define a multi-step workflow with parallel/sequential steps.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Workflow name (kebab-case)' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Step ID' },
                agent: { type: 'string', description: 'Agent type (explore, plan, general)' },
                task: { type: 'string', description: 'Task description for this step' },
                depends_on: { type: 'array', items: { type: 'string' }, description: 'Step IDs this step depends on' },
                timeout: { type: 'number', description: 'Timeout in seconds' }
              },
              required: ['id', 'agent', 'task']
            }
          }
        },
        required: ['name', 'steps']
      }
    },
    {
      name: 'workflow_run',
      description: 'Execute a workflow. Spawns subagents for each step, respecting dependencies.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Workflow name to run' }
        },
        required: ['name']
      }
    },
    {
      name: 'workflow_status',
      description: 'Check progress of a running/completed workflow.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Workflow name' }
        },
        required: ['name']
      }
    },
    {
      name: 'workflow_list',
      description: 'List all defined workflows.',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'workflow_cancel',
      description: 'Cancel a running workflow.',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Workflow name' } },
        required: ['name']
      }
    }
  ]
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = req.params.arguments ?? {} as Record<string, unknown>
  ensureDir()

  switch (req.params.name) {
    case 'workflow_create': {
      const name = args.name as string
      const steps = args.steps as WorkflowStep[]
      const workflow: Workflow = {
        name,
        steps,
        status: 'created',
        created_at: new Date().toISOString()
      }
      writeFileSync(join(WORKFLOWS_DIR, `${name}.json`), JSON.stringify(workflow, null, 2))
      return { content: [{ type: 'text', text: JSON.stringify({ created: true, name, step_count: steps.length }) }] }
    }
    case 'workflow_run': {
      const name = args.name as string
      const wfPath = join(WORKFLOWS_DIR, `${name}.json`)
      if (!existsSync(wfPath)) throw new Error(`Workflow not found: ${name}`)
      const workflow: Workflow = JSON.parse(readFileSync(wfPath, 'utf-8'))
      workflow.status = 'running'
      const results: Record<string, string> = {}
      const ordered = topologicalSort(workflow.steps)

      for (const step of ordered) {
        const logFile = join(WORKFLOWS_DIR, name, `${step.id}.log`)
        const dir = join(WORKFLOWS_DIR, name)
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

        const proc = spawn('kilo', ['-p', step.task, '--agent', step.agent], {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: (step.timeout ?? 300) * 1000
        })
        const chunks: Buffer[] = []
        proc.stdout.on('data', (c: Buffer) => chunks.push(c))
        proc.stderr.on('data', (c: Buffer) => chunks.push(c))
        await new Promise<void>((resolve) => proc.on('exit', () => resolve()))
        const output = Buffer.concat(chunks).toString('utf-8')
        writeFileSync(logFile, output)
        results[step.id] = proc.exitCode === 0 ? 'passed' : 'failed'
      }

      workflow.status = Object.values(results).every(r => r === 'passed') ? 'completed' : 'failed'
      writeFileSync(wfPath, JSON.stringify(workflow, null, 2))
      return { content: [{ type: 'text', text: JSON.stringify({ name, status: workflow.status, results }) }] }
    }
    case 'workflow_status': {
      const name = args.name as string
      const wfPath = join(WORKFLOWS_DIR, `${name}.json`)
      if (!existsSync(wfPath)) throw new Error(`Workflow not found: ${name}`)
      const workflow: Workflow = JSON.parse(readFileSync(wfPath, 'utf-8'))
      const logs: Record<string, string> = {}
      const logDir = join(WORKFLOWS_DIR, name)
      if (existsSync(logDir)) {
        for (const f of readdirSync(logDir)) {
          if (f.endsWith('.log')) logs[f.replace('.log', '')] = 'exists'
        }
      }
      return { content: [{ type: 'text', text: JSON.stringify({ name, status: workflow.status, steps: workflow.steps.length, logs }) }] }
    }
    case 'workflow_list': {
      ensureDir()
      const workflows = readdirSync(WORKFLOWS_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const w: Workflow = JSON.parse(readFileSync(join(WORKFLOWS_DIR, f), 'utf-8'))
          return { name: w.name, status: w.status, steps: w.steps.length }
        })
      return { content: [{ type: 'text', text: JSON.stringify(workflows) }] }
    }
    case 'workflow_cancel': {
      const name = args.name as string
      const wfPath = join(WORKFLOWS_DIR, `${name}.json`)
      if (!existsSync(wfPath)) throw new Error(`Workflow not found: ${name}`)
      const workflow: Workflow = JSON.parse(readFileSync(wfPath, 'utf-8'))
      workflow.status = 'failed'
      writeFileSync(wfPath, JSON.stringify(workflow, null, 2))
      return { content: [{ type: 'text', text: JSON.stringify({ cancelled: true, name }) }] }
    }
    default:
      throw new Error(`Unknown tool: ${req.params.name}`)
  }
})

function topologicalSort(steps: WorkflowStep[]): WorkflowStep[] {
  const visited = new Set<string>()
  const sorted: WorkflowStep[] = []
  const stepMap = new Map(steps.map(s => [s.id, s]))

  function visit(id: string, path: Set<string>) {
    if (visited.has(id)) return
    if (path.has(id)) throw new Error(`Circular dependency at step: ${id}`)
    path.add(id)
    const step = stepMap.get(id)
    if (step) {
      for (const dep of step.depends_on ?? []) visit(dep, path)
      sorted.push(step)
      visited.add(id)
    }
    path.delete(id)
  }

  for (const step of steps) visit(step.id, new Set())
  return sorted
}

async function main() {
  await server.connect(new StdioServerTransport())
}

main().catch(e => { console.error(e); process.exit(1) })
