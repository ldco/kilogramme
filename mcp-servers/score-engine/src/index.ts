#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { t } from './i18n/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HISTORY_DIR = resolve(__dirname, '..', '..', '..', '.nocowboy', 'scores')
const HISTORY_FILE = resolve(HISTORY_DIR, 'history.json')

const DIMENSIONS = [
  { name: t('scoreEngine.dimension.ncpCompliance.name'), weight: 0.25, description: t('scoreEngine.dimension.ncpCompliance.description') },
  { name: t('scoreEngine.dimension.constitution.name'), weight: 0.30, description: t('scoreEngine.dimension.constitution.description') },
  { name: t('scoreEngine.dimension.contractIntegrity.name'), weight: 0.20, description: t('scoreEngine.dimension.contractIntegrity.description') },
  { name: t('scoreEngine.dimension.testCoverage.name'), weight: 0.15, description: t('scoreEngine.dimension.testCoverage.description') },
  { name: t('scoreEngine.dimension.securityPosture.name'), weight: 0.10, description: t('scoreEngine.dimension.securityPosture.description') },
]

interface ScoreRecord { timestamp: string; score: number; dimensions: Record<string, number>; passed: boolean }

function ensureHistory(): void {
  if (!existsSync(HISTORY_DIR)) mkdirSync(HISTORY_DIR, { recursive: true })
  if (!existsSync(HISTORY_FILE)) writeFileSync(HISTORY_FILE, '[]', 'utf-8')
}

function readHistory(): ScoreRecord[] {
  try { return JSON.parse(readFileSync(HISTORY_FILE, 'utf-8')) } catch { return [] }
}
function writeHistory(records: ScoreRecord[]): void {
  writeFileSync(HISTORY_FILE, JSON.stringify(records.slice(-100), null, 2), 'utf-8')
}

function computeScore(dims: Record<string, number>): number {
  let total = 0, wSum = 0
  for (const d of DIMENSIONS) { total += Math.max(0, Math.min(1, (dims[d.name] ?? 0))) * d.weight; wSum += d.weight }
  return Math.round((total / wSum) * 100)
}

function generateBadge(score: number): string {
  const bar = '\u2588'.repeat(Math.floor(score / 5)) + '\u2591'.repeat(Math.max(0, 20 - Math.floor(score / 5)))
  return ['\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510', `\u2502  NoCowboy Score: ${String(score).padStart(3)}  \u2502`, `\u2502  ${bar}  \u2502`, '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518'].join('\n')
}

const server = new Server({ name: 'score-engine', version: '0.1.0' }, { capabilities: { tools: {} } })

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: t('scoreEngine.tool.compute.name'), description: t('scoreEngine.tool.compute.description'), inputSchema: { type: 'object', properties: { dimensions: { type: 'object', description: t('scoreEngine.tool.compute.inputDims') } }, required: ['dimensions'] } },
    { name: t('scoreEngine.tool.history.name'), description: t('scoreEngine.tool.history.description'), inputSchema: { type: 'object', properties: { limit: { type: 'number', description: t('scoreEngine.tool.history.inputLimit') } } } },
    { name: t('scoreEngine.tool.badge.name'), description: t('scoreEngine.tool.badge.description'), inputSchema: { type: 'object', properties: { score: { type: 'number', description: t('scoreEngine.tool.badge.inputScore') } }, required: ['score'] } },
    { name: t('scoreEngine.tool.breakdown.name'), description: t('scoreEngine.tool.breakdown.description'), inputSchema: { type: 'object', properties: { dimensions: { type: 'object' } }, required: ['dimensions'] } },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = req.params.arguments ?? {}
  switch (req.params.name) {
    case t('scoreEngine.tool.compute.name'): {
      const dims = (args.dimensions ?? {}) as Record<string, number>
      const score = computeScore(dims)
      const passed = Boolean(args.passed_constitution ?? true) && Boolean(args.passed_contracts ?? true)
      const record: ScoreRecord = { timestamp: new Date().toISOString(), score, dimensions: dims, passed }
      ensureHistory()
      const history = readHistory()
      history.push(record); writeHistory(history)
      const prev = history.length > 1 ? history[history.length - 2].score : score
      return { content: [{ type: 'text', text: JSON.stringify({ score, passed, dimensions: dims, trend: score > prev ? t('scoreEngine.result.trendUp') : score < prev ? t('scoreEngine.result.trendDown') : t('scoreEngine.result.trendStable'), change: score - prev }) }] }
    }
    case t('scoreEngine.tool.history.name'): {
      ensureHistory(); const history = readHistory()
      const limit = Math.min(args.limit as number || 10, 100)
      const recent = history.slice(-limit)
      return { content: [{ type: 'text', text: JSON.stringify({ scores: recent, recent: recent.slice(-1)[0] ?? null, trend: recent.length >= 2 ? (recent[recent.length - 1].score - recent[0].score) : 0 }) }] }
    }
    case t('scoreEngine.tool.badge.name'): {
      return { content: [{ type: 'text', text: generateBadge(Math.max(0, Math.min(100, args.score as number || 0))) }] }
    }
    case t('scoreEngine.tool.breakdown.name'): {
      const dims = (args.dimensions ?? {}) as Record<string, number>
      return { content: [{ type: 'text', text: JSON.stringify({ dimensions: DIMENSIONS.map(d => ({ name: d.name, weight: d.weight, current_value: dims[d.name] ?? 0 })) }) }] }
    }
    default: throw new Error(`Unknown tool: ${req.params.name}`)
  }
})

async function main() { await server.connect(new StdioServerTransport()) }
main().catch(e => { console.error(e); process.exit(1) })
