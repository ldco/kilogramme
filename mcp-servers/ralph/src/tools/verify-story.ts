import type { RalphTool } from '../types.js'
import { readState, writeState } from '../state.js'

export const verifyStoryTool: RalphTool = {
  name: 'ralph_verify_story',
  description: 'Mark a user story as verified and complete. Requires story ID and evidence of passing verification (test results, lint output, etc.).',
  inputSchema: {
    type: 'object',
    properties: {
      storyId: { type: 'string', description: 'Story ID (e.g. US-001)' },
      evidence: { type: 'string', description: 'Verification evidence (test results, lint output, etc.)' },
    },
    required: ['storyId', 'evidence'],
  },
  async handler(args) {
    const storyId = args.storyId as string
    const evidence = args.evidence as string

    if (!storyId) return JSON.stringify({ error: 'storyId is required' })
    if (!evidence) return JSON.stringify({ error: 'evidence is required' })

    const state = readState()
    const story = state.stories.find(s => s.id === storyId)
    if (!story) return JSON.stringify({ error: `Story ${storyId} not found` })

    story.status = 'complete'
    story.verifiedAt = new Date().toISOString()
    story.evidence = evidence.slice(0, 500)
    state.currentStoryId = null
    state.iteration += 1

    const done = state.stories.filter(s => s.status === 'complete').length
    const total = state.stories.length

    writeState(state)

    return JSON.stringify({
      verified: true,
      storyId,
      progress: `${done}/${total}`,
      remaining: total - done,
      complete: done === total,
    })
  },
}
