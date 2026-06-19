#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { t } from './i18n/index.js'

interface ApiField { name: string; type: string; required: boolean }
interface ApiEndpoint { method: string; path: string; auth?: string; request?: ApiField[]; response: ApiField[] }

const server = new Server({ name: 'contract-guard', version: '0.1.0' }, { capabilities: { tools: {} } })

function parseEndpoint(line: string): { method: string; path: string } | null {
  const m = line.match(/\b(GET|POST|PUT|DELETE|PATCH)\s+'([^']+)'|\b(GET|POST|PUT|DELETE|PATCH)\s+"([^"]+)"/)
  if (!m) return null
  return { method: m[1] || m[3] || '', path: m[2] || m[4] || '' }
}

function parseSimpleApiSpec(source: string): { endpoints: ApiEndpoint[] } {
  const endpoints: ApiEndpoint[] = []
  let current: ApiEndpoint | null = null
  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue
    const ep = parseEndpoint(trimmed)
    if (ep) { current = { ...ep, response: [] }; endpoints.push(current); continue }
    if (!current) continue
    const fm = trimmed.match(/\s+(\w+\??)\s*:\s*(\w+)/)
    if (fm) current.response.push({ name: fm[1].replace('?', ''), type: fm[2], required: !fm[1].endsWith('?') })
  }
  return { endpoints }
}

function classifyChange(oldEp: ApiEndpoint | undefined, newEp: ApiEndpoint | undefined): any[] {
  const changes: any[] = []
  if (!newEp && oldEp) return [{ severity: t('contractGuard.severity.breaking'), message: t('contractGuard.change.endpointRemoved', { method: oldEp.method, path: oldEp.path }) }]
  if (!oldEp && newEp) return [{ severity: t('contractGuard.severity.compatible'), message: t('contractGuard.change.endpointAdded', { method: newEp.method, path: newEp.path }) }]
  if (!oldEp || !newEp) return []
  if (oldEp.auth && !newEp.auth) changes.push({ severity: t('contractGuard.severity.breaking'), message: t('contractGuard.change.authRemoved', { method: oldEp.method, path: oldEp.path }) })
  const oMap = new Map(oldEp.response.map(f => [f.name, f]))
  const nMap = new Map(newEp.response.map(f => [f.name, f]))
  for (const [name, f] of oMap) {
    const nf = nMap.get(name)
    if (!nf) changes.push({ severity: t('contractGuard.severity.breaking'), message: t('contractGuard.change.fieldRemoved', { method: oldEp.method, path: oldEp.path, field: name }) })
    else if (f.required && !nf.required) changes.push({ severity: t('contractGuard.severity.breaking'), message: t('contractGuard.change.fieldBecomeOptional', { method: oldEp.method, path: oldEp.path, field: name }) })
    else if (f.type !== nf.type) changes.push({ severity: t('contractGuard.severity.breaking'), message: t('contractGuard.change.fieldTypeChanged', { method: oldEp.method, path: oldEp.path, field: name, from: f.type, to: nf.type }) })
  }
  for (const [name] of nMap) if (!oMap.has(name)) changes.push({ severity: t('contractGuard.severity.compatible'), message: t('contractGuard.change.fieldAdded', { method: newEp.method, path: newEp.path, field: name }) })
  return changes
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: t('contractGuard.tool.check.name'), description: t('contractGuard.tool.check.description'), inputSchema: { type: 'object', properties: { backend_file: { type: 'string', description: t('contractGuard.check.inputBackend') }, frontend_file: { type: 'string', description: t('contractGuard.check.inputFrontend') } }, required: ['backend_file'] } },
    { name: t('contractGuard.tool.status.name'), description: t('contractGuard.tool.status.description'), inputSchema: { type: 'object', properties: {} } },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = req.params.arguments ?? {}
  switch (req.params.name) {
    case t('contractGuard.tool.check.name'): {
      const backendPath = resolve(process.cwd(), args.backend_file as string)
      if (!existsSync(backendPath)) return { content: [{ type: 'text', text: JSON.stringify({ error: t('contractGuard.error.fileNotFound', { path: backendPath }) }) }] }
      const backendSpec = parseSimpleApiSpec(readFileSync(backendPath, 'utf-8'))
      let frontendSpec: { endpoints: ApiEndpoint[] } | undefined
      if (args.frontend_file) {
        const fp = resolve(process.cwd(), args.frontend_file as string)
        if (existsSync(fp)) frontendSpec = parseSimpleApiSpec(readFileSync(fp, 'utf-8'))
      }
      const oMap = new Map(backendSpec.endpoints.map(e => [`${e.method} ${e.path}`, e]))
      const nMap = new Map((frontendSpec?.endpoints || []).map(e => [`${e.method} ${e.path}`, e]))
      const allChanges = [...oMap.entries()].flatMap(([k, e]) => classifyChange(e, nMap.get(k)))
      for (const [k, e] of nMap) if (!oMap.has(k)) allChanges.push(...classifyChange(undefined, e))
      const breaking = allChanges.filter(c => c.severity === t('contractGuard.severity.breaking'))
      const compatible = allChanges.filter(c => c.severity === t('contractGuard.severity.compatible'))
      return { content: [{ type: 'text', text: JSON.stringify({ pass: breaking.length === 0, backend_endpoints: backendSpec.endpoints.length, frontend_endpoints: frontendSpec?.endpoints.length ?? 0, breaking, compatible, summary: [breaking.length > 0 ? `\u{1F534} ${breaking.length} breaking changes` : '', `${compatible.length} compatible changes`].filter(Boolean).join(' | ') }) }] }
    }
    case t('contractGuard.tool.status.name'):
      return { content: [{ type: 'text', text: JSON.stringify({ server: 'contract-guard', version: '0.1.0', status: t('contractGuard.status.ready') }) }] }
    default: throw new Error(`Unknown tool: ${req.params.name}`)
  }
})

async function main() { await server.connect(new StdioServerTransport()) }
main().catch(e => { console.error(e); process.exit(1) })
