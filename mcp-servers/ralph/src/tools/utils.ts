import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export function getProjectRoot(): string {
  const env = process.env.RALPH_PROJECT_ROOT
  if (env && existsSync(env)) return env
  return process.cwd()
}

export function getRalphDir(): string {
  return resolve(getProjectRoot(), '.ralph')
}

export function getStatePath(): string {
  return resolve(getRalphDir(), 'state.json')
}

export function getLearningsPath(): string {
  return resolve(getRalphDir(), 'learnings.md')
}

export function getCompleteSentinelPath(): string {
  return resolve(getRalphDir(), 'COMPLETE')
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    execSync(`mkdir -p "${dir}"`, { stdio: 'ignore' })
  }
}

export function safeReadJson<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return fallback
  }
}

export function safeWriteJson(path: string, data: unknown): void {
  ensureDir(getRalphDir())
  const tmp = path + '.tmp'
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  execSync(`mv "${tmp}" "${path}"`, { stdio: 'ignore' })
}

export function runCmd(command: string, cwd?: string): { stdout: string; code: number } {
  try {
    const stdout = execSync(command, {
      cwd: cwd ?? getProjectRoot(),
      encoding: 'utf-8',
      timeout: 120_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    return { stdout, code: 0 }
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number }
    return {
      stdout: (err.stdout ?? err.stderr ?? String(e)).toString().trim(),
      code: err.status ?? 1,
    }
  }
}

export function scanGitLogForStoryIds(storyIds: string[]): Map<string, string> {
  const found = new Map<string, string>()
  const result = runCmd('git log --oneline --max-count=100')
  if (result.code !== 0) return found
  const lines = result.stdout.split('\n')
  for (const id of storyIds) {
    const match = lines.find(l => l.includes(id))
    if (match) found.set(id, match)
  }
  return found
}
