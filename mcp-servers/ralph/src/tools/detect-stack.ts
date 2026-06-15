import type { RalphTool, StackInfo } from '../types.js'
import { readState, writeState } from '../state.js'
import { getProjectRoot, runCmd } from './utils.js'
import { existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function detectStackInternal(): StackInfo {
  const root = getProjectRoot()
  const files = [
    'puppet-master.config.ts',
    'Cargo.toml',
    'package.json',
    'pyproject.toml',
    'go.mod',
    'mix.exs',
    'composer.json',
  ]

  for (const file of files) {
    const path = resolve(root, file)
    if (!existsSync(path)) continue

    if (file === 'puppet-master.config.ts') {
      return {
        stack: 'node',
        framework: 'puppetmaster',
        packageManager: null,
        verifyCmd: null, // agent should use pm_review_run
        lintCmd: null,
      }
    }
    if (file === 'Cargo.toml') {
      return {
        stack: 'rust',
        framework: null,
        packageManager: 'cargo',
        verifyCmd: 'cargo test',
        lintCmd: 'cargo clippy',
      }
    }
    if (file === 'package.json') {
      const pkg = JSON.parse(readFileSync(path, 'utf-8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>
      let framework: string | null = null
      let verifyCmd: string | null = 'npm test'
      let lintCmd: string | null = 'npm run lint 2>/dev/null || true'

      if (deps['nuxt'] || deps['nuxt3']) {
        framework = 'nuxt'
        verifyCmd = deps['vitest'] ? 'npx vitest run' : null
      } else if (deps['next']) {
        framework = 'next'
        verifyCmd = null
      } else if (deps['vitest']) {
        verifyCmd = 'npx vitest run'
      }

      const pm = deps['yarn'] ? 'yarn' : deps['pnpm'] ? 'pnpm' : 'npm'

      return {
        stack: 'node',
        framework,
        packageManager: pm,
        verifyCmd,
        lintCmd,
      }
    }
    if (file === 'pyproject.toml') {
      return {
        stack: 'python',
        framework: null,
        packageManager: 'pip',
        verifyCmd: 'pytest',
        lintCmd: 'ruff check . 2>/dev/null || true',
      }
    }
    if (file === 'go.mod') {
      return {
        stack: 'go',
        framework: null,
        packageManager: 'go',
        verifyCmd: 'go test ./...',
        lintCmd: null,
      }
    }
    if (file === 'mix.exs') {
      return {
        stack: 'elixir',
        framework: null,
        packageManager: 'mix',
        verifyCmd: 'mix test',
        lintCmd: null,
      }
    }
    if (file === 'composer.json') {
      return {
        stack: 'php',
        framework: null,
        packageManager: 'composer',
        verifyCmd: 'vendor/bin/phpunit 2>/dev/null || true',
        lintCmd: null,
      }
    }
  }

  return {
    stack: null,
    framework: null,
    packageManager: null,
    verifyCmd: null,
    lintCmd: null,
  }
}

export const detectStackTool: RalphTool = {
  name: 'ralph_detect_stack',
  description: 'Detect the project stack by scanning for manifest files in the project root. Auto-detects: Node, Rust, Python, Go, Elixir, PHP, and PM Framework.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  async handler() {
    const result = detectStackInternal()

    // Optionally persist to state
    const state = readState()
    if (state.prdPath) {
      state.detectedStack = result
      writeState(state)
    }

    return JSON.stringify({
      stack: result.stack ?? 'unknown',
      framework: result.framework,
      packageManager: result.packageManager,
      suggestedVerifyCommand: result.verifyCmd ?? 'No default verify command. Use tausik_verify or manual test.',
      suggestedLintCommand: result.lintCmd ?? 'No default lint command.',
    })
  },
}
