import type { RalphTool } from '../types.js'
import { readState, writeState, addLearning } from '../state.js'

export const learnTool: RalphTool = {
  name: 'ralph_learn',
  description: 'Record a lesson learned during execution. Persisted across iterations and session restarts. Categories: pattern, gotcha, convention, dead_end.',
  inputSchema: {
    type: 'object',
    properties: {
      lesson: {
        type: 'string',
        description: 'What was learned',
      },
      category: {
        type: 'string',
        enum: ['pattern', 'gotcha', 'convention', 'dead_end'],
        description: 'Category of learning',
      },
      storyId: {
        type: 'string',
        description: 'Optional — link the learning to a specific story (e.g. US-002)',
      },
    },
    required: ['lesson', 'category'],
  },
  async handler(args) {
    const lesson = args.lesson as string
    const category = args.category as string
    const storyId = args.storyId as string | undefined

    if (!lesson) return JSON.stringify({ error: 'lesson is required' })
    if (!['pattern', 'gotcha', 'convention', 'dead_end'].includes(category)) {
      return JSON.stringify({ error: 'category must be: pattern, gotcha, convention, or dead_end' })
    }

    const state = readState()
    addLearning(state, { lesson, category, storyId })
    writeState(state)

    return JSON.stringify({
      recorded: true,
      lesson,
      category,
      storyId: storyId ?? null,
      totalLearnings: state.learnings.length,
    })
  },
}
