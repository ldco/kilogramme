import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RalphState } from './types.js'
import { getRalphDir, getStatePath, getLearningsPath, safeReadJson, safeWriteJson, ensureDir } from './tools/utils.js'

const MAX_RETRIES_PER_STORY = 3

export function readState(): RalphState {
  return safeReadJson<RalphState>(getStatePath(), {
    prdPath: '',
    prdName: '',
    startedAt: '',
    complete: false,
    failed: false,
    detectedStack: null,
    stories: [],
    learnings: [],
    currentStoryId: null,
    iteration: 0,
  })
}

export function writeState(state: RalphState): void {
  safeWriteJson(getStatePath(), state)
}

export function archiveState(state: RalphState): void {
  const archiveDir = join(getRalphDir(), 'archive')
  ensureDir(archiveDir)
  const name = `state-${state.prdName}-${Date.now()}.json`
  const src = getStatePath()
  if (existsSync(src)) {
    copyFileSync(src, join(archiveDir, name))
  }
}

export function getStoryFailures(state: RalphState, storyId: string): number {
  return state.learnings.filter(
    l => l.category === 'dead_end' && l.storyId === storyId
  ).length
}

export function shouldSkipAfterFailures(state: RalphState, storyId: string): boolean {
  return getStoryFailures(state, storyId) >= MAX_RETRIES_PER_STORY
}

export function addLearning(state: RalphState, entry: { lesson: string; category: string; storyId?: string }): void {
  state.learnings.push({
    lesson: entry.lesson,
    category: entry.category as 'pattern' | 'gotcha' | 'convention' | 'dead_end',
    storyId: entry.storyId,
    timestamp: new Date().toISOString(),
  })
  appendLearningToFile(entry)
}

function appendLearningToFile(entry: { lesson: string; category: string; storyId?: string }): void {
  ensureDir(getRalphDir())
  const line = `- [${entry.category}]${entry.storyId ? ` [${entry.storyId}]` : ''} ${entry.lesson}`
  try {
    const existing = existsSync(getLearningsPath()) ? readFileSync(getLearningsPath(), 'utf-8') : ''
    const header = '## Learnings\n'
    const content = existing.startsWith(header)
      ? existing + '\n' + line
      : header + line
    writeFileSync(getLearningsPath(), content, 'utf-8')
  } catch {
    // fail silently
  }
}
