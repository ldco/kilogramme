import type { ToolDefinition } from './index.js'
import { t } from '../i18n/index.js'
import { checkFileTool } from './check-file.js'

export const checkProjectTool: ToolDefinition = {
  name: t('constitution.tool.checkProject.name'),
  description: t('constitution.tool.checkProject.description'),
  inputSchema: { type: 'object', properties: { glob: { type: 'string', description: t('constitution.tool.checkProject.inputGlob') }, paths: { type: 'array', items: { type: 'string' }, description: t('constitution.tool.checkProject.inputPaths') }, max_files: { type: 'number', description: t('constitution.tool.checkProject.inputMaxFiles') } } },
  async handler(args: Record<string, unknown>): Promise<string> {
    const paths = args.paths as string[] | undefined
    const maxFiles = (args.max_files as number) || 100
    if (!paths || paths.length === 0) {
      return JSON.stringify({ files_checked: 0, files_with_violations: 0, violations: [], pass: true, summary: t('constitution.check.empty') })
    }
    const filesToCheck = paths.slice(0, maxFiles)
    const allViolations: any[] = []
    const filesWithViolations = new Set<string>()
    let filesChecked = 0
    for (const filePath of filesToCheck) {
      const result = JSON.parse(await checkFileTool.handler({ path: filePath }))
      filesChecked++
      if (result.violations && result.violations.length > 0) {
        filesWithViolations.add(filePath); allViolations.push(...result.violations)
      }
    }
    const pass = allViolations.filter(v => v.severity === 'error').length === 0
    return JSON.stringify({
      files_checked: filesChecked, files_with_violations: filesWithViolations.size,
      violations: allViolations.slice(0, 500), pass,
      truncated: allViolations.length > 500,
      summary: t('constitution.check.summary', { checked: String(filesChecked), violated: String(filesWithViolations.size), total: String(Math.min(allViolations.length, 500)) }) + (allViolations.length > 500 ? t('constitution.check.truncated', { max: '500' }) : '') + '\n' + (pass ? t('constitution.check.passed') : t('constitution.check.failed')),
    })
  },
}
