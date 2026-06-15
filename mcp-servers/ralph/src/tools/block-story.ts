import type { RalphTool } from '../types.js'
import { readState, writeState } from '../state.js'

export const blockStoryTool: RalphTool = {
  name: 'ralph_block_story',
  description: 'Mark a story as blocked. Human intervention needed. The story will be skipped by ralph_next_story until unblocked via state.json edit.',
  inputSchema: {
    type: 'object',
    properties: {
      storyId: {
        type: 'string',
        description: 'Story ID (e.g. US-003)',
      },
      reason: {
        type: 'string',
        description: 'Why the story is blocked (e.g. "SMTP not configured. Need API key from admin.")',
      },
    },
    required: ['storyId', 'reason'],
  },
  async handler(args) {
    const storyId = args.storyId as string
    const reason = args.reason as string

    if (!storyId) return JSON.stringify({ error: 'storyId is required' })
    if (!reason) return JSON.stringify({ error: 'reason is required' })

    const state = readState()
    const story = state.stories.find(s => s.id === storyId)

    if (!story) return JSON.stringify({ error: `Story ${storyId} not found` })

    story.status = 'blocked'
    story.blockReason = reason

    const blocked = state.stories.filter(s => s.status === 'blocked').length
    const done = state.stories.filter(s => s.status === 'complete').length
    const total = state.stories.length

    writeState(state)

    return JSON.stringify({
      blocked: true,
      storyId,
      reason,
      progress: `${done}/${total}`,
      blockedCount: blocked,
    })
  },
}
