import type { RalphTool } from '../types.js'
import { readState, writeState, shouldSkipAfterFailures } from '../state.js'

function getNextStory(): string {
  const state = readState()
  if (state.complete || state.failed) {
    const flag = state.complete ? 'complete' : 'failed'
    return JSON.stringify({ done: true, reason: `PRD is ${flag}`, progress: `${state.stories.filter(s => s.status === 'complete').length}/${state.stories.length}` })
  }

  const pending = state.stories.filter(s => s.status === 'pending')
  const blocked = state.stories.filter(s => s.status === 'blocked')
  const active = state.stories.find(s => s.status === 'active')

  if (active) {
    const remainingAfter = pending.length + blocked.length
    return JSON.stringify({
      id: active.id,
      title: active.title,
      description: active.description,
      acceptanceCriteria: active.acceptanceCriteria,
      priority: active.priority,
      dependsOn: active.dependsOn,
      remainingAfter,
      status: 'in_progress',
    })
  }

  const ready = pending.filter(story =>
    story.dependsOn.every(depId => {
      const depStory = state.stories.find(s => s.id === depId)
      return depStory && depStory.status === 'complete'
    })
  )

  if (ready.length === 0) {
    const allDone = pending.length === 0
    if (allDone) {
      state.complete = true
      writeState(state)
      return JSON.stringify({ done: true, message: 'All stories complete' })
    }
    if (blocked.length > 0 && pending.length === 0) {
      return JSON.stringify({ done: true, message: 'All remaining stories are blocked', blocked: blocked.map(s => ({ id: s.id, reason: s.blockReason })) })
    }
    return JSON.stringify({ done: true, message: 'Next stories have unmet dependencies', pending: pending.map(s => ({ id: s.id, dependsOn: s.dependsOn })), blocked: blocked.map(s => ({ id: s.id, reason: s.blockReason })) })
  }

  const next = ready.sort((a, b) => a.priority - b.priority)[0]

  if (shouldSkipAfterFailures(state, next.id)) {
    next.status = 'blocked'
    next.blockReason = 'Skipped after 3 failed attempts'
    writeState(state)
    return getNextStory()
  }

  next.status = 'active'
  state.currentStoryId = next.id
  writeState(state)

  const remainingAfter = pending.length - 1 + blocked.length
  return JSON.stringify({
    id: next.id,
    title: next.title,
    description: next.description,
    acceptanceCriteria: next.acceptanceCriteria,
    priority: next.priority,
    dependsOn: next.dependsOn,
    remainingAfter,
    status: 'active',
  })
}

export const nextStoryTool: RalphTool = {
  name: 'ralph_next_story',
  description: 'Get the next pending story. Returns one story at a time, respecting priority order and dependency chains. Returns { done: true } when all stories are complete or blocked.',
  inputSchema: { type: 'object', properties: {} },
  async handler() {
    return getNextStory()
  },
}
