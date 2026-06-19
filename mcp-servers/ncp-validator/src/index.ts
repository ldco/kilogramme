#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, relative, extname, join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { t } from './i18n/index.js'

const VALID_TYPES = ['uuid', 'email', 'string', 'number', 'boolean', 'integer', 'float', 'date', 'datetime', 'jwt', 'enum', 'array', 'object', 'reference']
const VALID_PROTOCOLS = ['ncp/v1']

interface NcpDoc { protocol: string; module: string; version: string; entities: Record<string, any>; endpoints: Record<string, any>; constitution_rules?: string[] }

const server = new Server({ name: 'ncp-validator', version: '0.1.0' }, { capabilities: { tools: {} } })

function listNcpFiles(): string[] {
  const cwd = process.cwd()
  const paths: string[] = []
  for (const dir of ['.', 'ncp', 'spec', '.ncp']) {
    try { for (const f of readdirSync(resolve(cwd, dir))) { if (f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.ncp')) paths.push(resolve(cwd, dir, f)) } } catch { /* skip */ }
    if (paths.length > 0) break
  }
  return paths
}

function parseNcpFile(path: string): { doc?: NcpDoc; errors: string[] } {
  const errors: string[] = []
  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = parseYaml(raw) as any
    if (!parsed || typeof parsed !== 'object') return { errors: [t('ncpValidator.error.emptyFile')] }
    if (!parsed.protocol) errors.push(t('ncpValidator.error.missingProtocol'))
    else if (!VALID_PROTOCOLS.includes(parsed.protocol)) errors.push(t('ncpValidator.error.invalidProtocol', { proto: parsed.protocol, expected: VALID_PROTOCOLS.join(', ') }))
    if (!parsed.module) errors.push(t('ncpValidator.error.missingModule'))
    if (!parsed.version) errors.push(t('ncpValidator.error.missingVersion'))
    if (!parsed.entities || typeof parsed.entities !== 'object') errors.push(t('ncpValidator.error.missingEntities'))
    else for (const [name, entity] of Object.entries(parsed.entities)) {
      if (!(entity as any)?.fields) errors.push(t('ncpValidator.error.entityNoFields', { name }))
      else for (const [fname, field] of Object.entries((entity as any).fields)) {
        const f = field as any
        if (!f.type) errors.push(t('ncpValidator.error.entityFieldNoType', { name, fname }))
        else if (!VALID_TYPES.includes(f.type)) errors.push(t('ncpValidator.error.entityFieldBadType', { name, fname, type: f.type, valid: VALID_TYPES.join(', ') }))
      }
    }
    if (parsed.endpoints && typeof parsed.endpoints === 'object')
      for (const [path, ep] of Object.entries(parsed.endpoints))
        if (!(ep as any)?.request && !(ep as any)?.response) errors.push(t('ncpValidator.error.endpointNoReqRes', { path }))
    return { doc: parsed as NcpDoc, errors }
  } catch (e: unknown) { return { errors: [t('ncpValidator.error.parseError', { error: String((e as Error).message) })] } }
}

function diffDocs(oldDoc: NcpDoc, newDoc: NcpDoc): { breaking: any[]; compatible: any[] } {
  const breaking: any[] = [], compatible: any[] = []
  const oldE = new Set(Object.keys(oldDoc.entities || {}))
  const newE = new Set(Object.keys(newDoc.entities || {}))
  for (const n of newE) if (!oldE.has(n)) compatible.push({ type: t('ncpValidator.diffLabels.entityAdded'), entity: n, message: t('ncpValidator.diffLabels.typeEntityAdded', { name: n }) })
  for (const n of oldE) if (!newE.has(n)) breaking.push({ type: t('ncpValidator.diffLabels.entityRemoved'), entity: n, message: t('ncpValidator.diffLabels.typeEntityRemoved', { name: n }) })
  for (const n of oldE) {
    if (!newE.has(n)) continue
    const of = oldDoc.entities[n].fields || {}; const nf = newDoc.entities[n].fields || {}
    for (const f of Object.keys(of)) {
      if (!(f in nf)) breaking.push({ type: t('ncpValidator.diffLabels.fieldRemoved'), entity: n, field: f, message: t('ncpValidator.diffLabels.typeFieldRemoved', { entity: n, field: f }) })
      else {
        if (of[f].required && !nf[f].required) breaking.push({ type: t('ncpValidator.diffLabels.fieldBecameOptional'), entity: n, field: f, message: t('ncpValidator.diffLabels.typeFieldBecameOptional', { entity: n, field: f }) })
        if (of[f].type !== nf[f].type) breaking.push({ type: t('ncpValidator.diffLabels.fieldTypeChanged'), entity: n, field: f, from: of[f].type, to: nf[f].type, message: t('ncpValidator.diffLabels.typeFieldTypeChanged', { entity: n, field: f, from: of[f].type, to: nf[f].type }) })
      }
    }
    for (const f of Object.keys(nf)) if (!(f in of)) compatible.push({ type: t('ncpValidator.diffLabels.fieldAdded'), entity: n, field: f, message: t('ncpValidator.diffLabels.typeFieldAdded', { entity: n, field: f }) })
  }
  return { breaking, compatible }
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: t('ncpValidator.tool.validate.name'), description: t('ncpValidator.tool.validate.description'), inputSchema: { type: 'object', properties: { path: { type: 'string', description: t('ncpValidator.validate.inputPath') } }, required: ['path'] } },
    { name: t('ncpValidator.tool.list.name'), description: t('ncpValidator.tool.list.description'), inputSchema: { type: 'object', properties: {} } },
    { name: t('ncpValidator.tool.diff.name'), description: t('ncpValidator.tool.diff.description'), inputSchema: { type: 'object', properties: { old: { type: 'string', description: t('ncpValidator.diff.inputOld') }, new: { type: 'string', description: t('ncpValidator.diff.inputNew') } }, required: ['old', 'new'] } },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = req.params.arguments ?? {}
  switch (req.params.name) {
    case t('ncpValidator.tool.validate.name'): {
      const filePath = resolve(process.cwd(), args.path as string)
      if (!existsSync(filePath)) {
        const err = t('ncpValidator.error.fileNotFound', { path: filePath })
        return { content: [{ type: 'text', text: JSON.stringify({ valid: false, errors: [err] }) }] }
      }
      const { doc, errors } = parseNcpFile(filePath)
      const resp = { valid: errors.length === 0, errors, module: doc?.module, entities: doc?.entities ? Object.keys(doc.entities) : [], endpoints: doc?.endpoints ? Object.keys(doc.endpoints) : [] }
      return { content: [{ type: 'text', text: JSON.stringify(resp) }] }
    }
    case t('ncpValidator.tool.list.name'): {
      const files = listNcpFiles().map(f => { const r = parseNcpFile(f); return { path: relative(process.cwd(), f), valid: r.errors.length === 0, errors: r.errors } })
      return { content: [{ type: 'text', text: JSON.stringify({ files, total: files.length, valid_count: files.filter(r => r.valid).length }) }] }
    }
    case t('ncpValidator.tool.diff.name'): {
      const { doc: oldDoc, errors: oldErr } = parseNcpFile(resolve(process.cwd(), args.old as string))
      const { doc: newDoc, errors: newErr } = parseNcpFile(resolve(process.cwd(), args.new as string))
      if (oldErr.length > 0) return { content: [{ type: 'text', text: JSON.stringify({ error: t('ncpValidator.error.oldFileError', { errors: oldErr.join('; ') }) }) }] }
      if (newErr.length > 0) return { content: [{ type: 'text', text: JSON.stringify({ error: t('ncpValidator.error.newFileError', { errors: newErr.join('; ') }) }) }] }
      const diff = diffDocs(oldDoc!, newDoc!)
      return { content: [{ type: 'text', text: JSON.stringify({ breaking: diff.breaking, compatible: diff.compatible, pass: diff.breaking.length === 0 }) }] }
    }
    default: throw new Error(`Unknown tool: ${req.params.name}`)
  }
})

async function main() { await server.connect(new StdioServerTransport()) }
main().catch(e => { console.error(e); process.exit(1) })
