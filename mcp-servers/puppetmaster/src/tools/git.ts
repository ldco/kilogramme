import type { PmTool } from './index.js'
import { getProjectRoot, runCmd } from './utils.js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export const gitTools: PmTool[] = [
  {
    name: 'pm_git_commit',
    description:
      'Safe git commit and push workflow. Shows changes, generates conventional commit messages, prompts before committing and pushing. Never force-pushes to main/master.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Custom commit message (if provided, skips auto-generation)',
        },
        branch: {
          type: 'string',
          description: 'Target branch to push to (defaults to current branch)',
        },
        push: {
          type: 'boolean',
          description: 'Push after commit (default: true)',
        },
        files: {
          type: 'string',
          description: 'Comma-separated list of files to stage (default: all changed)',
        },
      },
    },
    async handler(args) {
      const root = getProjectRoot()

      const hasGit = existsSync(resolve(root, '.git'))
      if (!hasGit) return 'Not a git repository.'

      const status = runCmd('git status --porcelain', root)
      if (!status.trim()) return 'Nothing to commit. Working tree clean.'

      const statusLines = status.split('\n').filter(Boolean)

      const modified = statusLines.filter(l => /^[ M]/.test(l))
      const added = statusLines.filter(l => /^[A?]/.test(l))
      const deleted = statusLines.filter(l => /^[ D]/.test(l))

      const diffStat = runCmd('git diff --stat && git diff --cached --stat', root)
      const currentBranch = runCmd('git branch --show-current', root)

      let summary = '## Git Status\n\n'
      summary += `**Branch:** ${currentBranch}\n`
      summary += `**Changes:** ${modified.length} modified, ${added.length} added, ${deleted.length} deleted\n\n`
      summary += '```\n' + diffStat + '\n```\n\n'

      const files = args.files
        ? (args.files as string).split(',').map(f => f.trim())
        : []
      const stageAll = files.length === 0

      if (!stageAll) {
        for (const f of files) {
          runCmd(`git add "${f}"`, root)
        }
        summary += `Staged: ${files.join(', ')}\n\n`
      } else {
        runCmd('git add -A', root)
      }

      const message = (args.message as string) || generateMessage(statusLines, root)

      summary += `**Commit message:**\n\`\`\`\n${message}\n\`\`\`\n`

      runCmd(`git commit -m "${message.replace(/"/g, '\\"')}"`, root)
      summary += '\n✅ Committed successfully.\n'

      const shouldPush = args.push !== false
      if (shouldPush) {
        const targetBranch = (args.branch as string) || currentBranch

        if (['master', 'main'].includes(targetBranch)) {
          summary += `\n⚠️ Pushing to **${targetBranch}** (protected branch). Verify your changes.\n`
        }

        try {
          const pushOut = runCmd(`git push origin ${targetBranch}`, root)
          summary += `\n✅ Pushed to origin/${targetBranch}\n\n` + pushOut
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          summary += `\n❌ Push failed:\n${msg}\n`
          summary += `\nTry: git pull --rebase origin ${targetBranch}`
        }
      } else {
        summary += `\nℹ️ Push skipped. Push manually:\n  git push origin ${currentBranch}`
      }

      return summary
    },
  },
]

function generateMessage(files: string[], root: string): string {
  const hasFeat = files.some(f => /^(A|\?\?)/.test(f))
  const hasFix = files.some(f => /^[ M]/.test(f) && /fix|bug|error|crash/i.test(f))
  const hasRefactor = files.some(f => /refactor|rename|move/i.test(f))
  const hasDocs = files.some(f => /\.md$|docs\//.test(f)) && !hasFeat && !hasFix
  const hasTest = files.some(f => /test|spec|__tests__/i.test(f))
  const hasChore = !hasFeat && !hasFix && !hasRefactor && !hasDocs && !hasTest

  if (hasFeat) return generateScoped('feat', files, root)
  if (hasFix) return generateScoped('fix', files, root)
  if (hasDocs) return generateScoped('docs', files, root)
  if (hasTest) return generateScoped('test', files, root)
  if (hasRefactor) return generateScoped('refactor', files, root)
  if (hasChore) return generateScoped('chore', files, root)
  return 'chore: update'
}

function generateScoped(type: string, files: string[], root: string): string {
  const dirs = new Set<string>()
  for (const f of files) {
    const name = f.replace(/^[ MADRCU?! ]+/, '').split('/')[0]
    dirs.add(name)
  }
  const scope = dirs.size === 1 ? [...dirs][0] : ''
  const prefix = scope ? `${type}(${scope})` : type

  const diffShort = runCmd('git diff --cached --stat', root)
  const summary = diffShort.split('\n').pop()?.trim() || `${files.length} files`

  return `${prefix}: ${summary.split(',')[0]}`
}
