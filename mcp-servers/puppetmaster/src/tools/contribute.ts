import type { PmTool } from './index.js'
import { getProjectRoot, runCmd } from './utils.js'
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const contributeTools: PmTool[] = [
  {
    name: 'pm_contribute_list',
    description:
      'List all existing contribution documents in docs/contributing/. These are fixes/features exported from client projects that can be applied to the PM framework.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status keyword found in the doc (e.g. ENGRAVED, PROPOSED)',
        },
      },
    },
    async handler(args) {
      const root = getProjectRoot()
      const contribDir = resolve(root, 'docs/contributing')
      if (!existsSync(contribDir)) return 'No docs/contributing/ directory found.'

      const allFiles = readdirSync(contribDir).filter(f => f.endsWith('.md'))
      if (allFiles.length === 0) return 'No contribution documents found.'

      const statusFilter = args.status as string | undefined

      const results: string[] = []
      for (const file of allFiles.sort()) {
        const content = readFileSync(resolve(contribDir, file), 'utf-8')
        if (statusFilter && !content.includes(statusFilter)) continue

        const firstLine = content.split('\n')[0].replace(/^#\s*/, '')
        const statusMatch = content.match(/Status:\s*(.+)/)
        const status = statusMatch ? statusMatch[1].trim() : 'unknown'
        const dateMatch = content.match(/Date:\s*(.+)/)
        const date = dateMatch ? dateMatch[1].trim() : ''

        results.push(`${file} | ${status} | ${date} | ${firstLine}`)
      }

      return results.length === 0
        ? `No contributions found${statusFilter ? ` with status "${statusFilter}"` : ''}.`
        : results.join('\n')
    },
  },
  {
    name: 'pm_contribute_read',
    description:
      'Read a specific contribution document. Returns the full content for review or application.',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Filename of the contribution doc (from pm_contribute_list)',
        },
      },
      required: ['file'],
    },
    async handler(args) {
      const root = getProjectRoot()
      const fileName = args.file as string
      const filePath = resolve(root, 'docs/contributing', fileName)

      if (!existsSync(filePath)) {
        return `Contribution "${fileName}" not found. Use pm_contribute_list to see available docs.`
      }

      return readFileSync(filePath, 'utf-8')
    },
  },
  {
    name: 'pm_contribute_export',
    description:
      'Export current git changes as a PM contribution document. Generates a .pm-contribution.md file with diffs, descriptions, and testing instructions. Use this when you fix a bug or add a feature in a client project that should be contributed back to the PM framework.',
    inputSchema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'One-line summary of the contribution',
        },
        type: {
          type: 'string',
          enum: ['bugfix', 'feature', 'enhancement', 'refactor', 'docs'],
          description: 'Type of contribution',
        },
        problem: {
          type: 'string',
          description: 'What was broken or why was this needed',
        },
        solution: {
          type: 'string',
          description: 'How the problem was solved',
        },
        testing: {
          type: 'string',
          description: 'Step-by-step testing instructions',
        },
        files: {
          type: 'string',
          description: 'Comma-separated list of files to include (defaults to git diff --name-only)',
        },
      },
    },
    async handler(args) {
      const root = getProjectRoot()

      const summary = (args.summary as string) || 'Untitled contribution'
      const contType = (args.type as string) || 'bugfix'
      const problem = (args.problem as string) || 'No problem description provided.'
      const solution = (args.solution as string) || 'No solution description provided.'
      const testing = (args.testing as string) || '1. Apply changes\n2. Run tests\n3. Verify fix'

      const now = new Date().toISOString().split('T')[0]
      const id = `PM-${now.replace(/-/g, '')}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`

      let fileList: string[] = []
      if (args.files) {
        fileList = (args.files as string).split(',').map(f => f.trim())
      } else {
        try {
          const diffNames = runCmd('git diff --name-only HEAD', root)
          fileList = diffNames.split('\n').filter(Boolean)
        } catch {
          fileList = []
        }
      }

      const domains: string[] = []
      for (const f of fileList) {
        if (/app\/components\/|app\/pages\/|app\/layouts\/|app\/composables\//.test(f)) domains.push('Frontend')
        if (/server\/api\/|server\/utils\/|server\/middleware\//.test(f)) domains.push('Backend')
        if (/server\/database\/|migrations/.test(f)) domains.push('Database')
        if (/assets\/css\//.test(f)) domains.push('Styles')
        if (/config\.ts|nuxt\.config/.test(f)) domains.push('Config')
        if (/app\/types\//.test(f)) domains.push('Types')
        if (/docs\/|\.md$/.test(f)) domains.push('Docs')
      }
      const uniqueDomains = [...new Set(domains)]

      let filesSection = ''
      for (const file of fileList) {
        const filePath = resolve(root, file)
        if (!existsSync(filePath)) {
          filesSection += `### ${file}\n\n**Note:** File not found in working tree.\n\n`
          continue
        }

        try {
          const diff = runCmd(`git diff HEAD -- "${file}"`, root)
          if (diff) {
            filesSection += `### Modified: \`${file}\`\n\n\`\`\`diff\n${diff}\n\`\`\`\n\n`
          } else {
            const content = readFileSync(filePath, 'utf-8')
            const ext = file.split('.').pop() || ''
            filesSection += `### Created: \`${file}\`\n\n\`\`\`${ext}\n${content.slice(0, 4000)}\n\`\`\`\n\n`
          }
        } catch {
          filesSection += `### ${file}\n\nCould not read diff.\n\n`
        }
      }

      const doc = `# PM Contribution

## Meta
- ID: ${id}
- Type: ${contType}
- Priority: medium
- Created: ${now}
- Source: Client Project

## Summary
${summary}

## Problem
${problem}

## Solution
${solution}

## Domains Affected
${uniqueDomains.map(d => `- [x] ${d}`).join('\n')}

## Files Changed
${filesSection}
## Dependencies

None

## Breaking Changes

None

## Testing

${testing.replace(/\n/g, '\n> ')}

## Notes

Generated by pm_contribute_export on ${now}.

---
*Copy this file to the PM framework repository and use pm_contribute_apply to apply.*
`

      const outPath = resolve(root, '.pm-contribution.md')
      writeFileSync(outPath, doc, 'utf-8')

      return `Contribution exported to .pm-contribution.md

ID: ${id}
Type: ${contType}
Files: ${fileList.length} changed
Domains: ${uniqueDomains.join(', ')}

Next: copy this file to the PM framework repo and run pm_contribute_apply`
    },
  },
  {
    name: 'pm_contribute_apply',
    description:
      'Read a .pm-contribution.md file and display its contents for manual application. Lists changed files, affected domains, dependencies, and testing instructions. Does NOT auto-apply — the AI agent reviews and applies.',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Path to the contribution file (defaults to .pm-contribution.md in project root)',
        },
      },
    },
    async handler(args) {
      const root = getProjectRoot()
      const filePath = resolve(root, (args.file as string) || '.pm-contribution.md')

      if (!existsSync(filePath)) {
        return `No contribution file found at ${filePath}.

To apply a contribution:
1. Copy the .pm-contribution.md file from your client project to this PM framework repo
2. Run pm_contribute_apply to review it
3. Apply the changes manually or with AI agent assistance`
      }

      const content = readFileSync(filePath, 'utf-8')
      return content
    },
  },
]
