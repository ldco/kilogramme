import { writeFileSync } from 'node:fs'
import type { RalphTool } from '../types.js'
import { readState, writeState, archiveState } from '../state.js'
import { getCompleteSentinelPath } from './utils.js'

export const completeTool: RalphTool = {
  name: 'ralph_complete',
  description: 'Finalize PRD execution. Marks all stories as handled, writes COMPLETE sentinel, archives state for history.',
  inputSchema: { type: 'object', properties: {} },
  async handler() {
    const state = readState()
    if (!state.prdPath) return JSON.stringify({ error: 'No active PRD. Nothing to complete.' })

    const active = state.stories.find(s => s.status === 'active')
    if (active) {
      active.status = 'complete'
      active.verifiedAt = new Date().toISOString()
    }
    for (const story of state.stories) {
      if (story.status === 'pending') {
        story.status = 'complete'
        story.evidence = 'Skipped during finalize'
        story.verifiedAt = new Date().toISOString()
      }
    }

    state.complete = true
    state.iteration += 1
    archiveState(state)
    writeState(state)
    writeFileSync(getCompleteSentinelPath(), new Date().toISOString(), 'utf-8')

    return JSON.stringify({
      complete: true,
      prdName: state.prdName,
      summary: `${state.stories.length}/${state.stories.length} stories handled`,
      iteration: state.iteration,
      message: 'PRD execution complete',
    })
  },
}
