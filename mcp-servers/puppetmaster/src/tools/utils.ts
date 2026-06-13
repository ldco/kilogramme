import { execSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

export function getProjectRoot(): string {
  const env = process.env.PM_PROJECT_ROOT
  if (env && existsSync(env)) return env
  return process.cwd()
}

export function runCmd(command: string, cwd?: string): string {
  return execSync(command, {
    cwd: cwd ?? getProjectRoot(),
    encoding: 'utf-8',
    timeout: 300_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

export function runCmdDetached(command: string, args: string[], cwd?: string): number {
  const child = spawn(command, args, {
    cwd: cwd ?? getProjectRoot(),
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  return child.pid ?? 0
}

export function hasNpmScript(name: string): boolean {
  const pkg = JSON.parse(readFileSync(resolve(getProjectRoot(), 'package.json'), 'utf-8'))
  return name in (pkg.scripts ?? {})
}

export function npmScript(name: string, cwd?: string): string {
  return runCmd(`npm run ${name}`, cwd)
}

export function fileExists(path: string): boolean {
  return existsSync(resolve(getProjectRoot(), path))
}

export function fileSize(path: string): number {
  try {
    return statSync(resolve(getProjectRoot(), path)).size
  } catch {
    return 0
  }
}

export function checkPort(port: number): boolean {
  try {
    const out = execSync(`lsof -i :${port} -sTCP:LISTEN -t`, { encoding: 'utf-8', timeout: 3000 })
    return out.trim().length > 0
  } catch {
    return false
  }
}

export async function loadConfig(root: string): Promise<Record<string, unknown> | null> {
  const configPath = resolve(root, 'project/puppet-master.config.ts')
  if (!existsSync(configPath)) return null
  try {
    const mod = await import(configPath)
    return (mod.default ?? mod) as Record<string, unknown>
  } catch {
    return null
  }
}
