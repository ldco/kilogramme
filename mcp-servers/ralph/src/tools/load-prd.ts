import type { RalphTool } from '../types.js'
import { parsePrd, detectCircularDependencies } from '../prd-parser.js'
import { readState, writeState } from '../state.js'

export const loadPrdTool: RalphTool = {
  name: 'ralph_load_prd',
  description: 'Load a PRD markdown file and initialize execution state. Parses user stories from ### US-XXX sections. If state already exists (resume), returns current progress.',
  inputSchema: {
    type: 'object',
    properties: {
      prdPath: {
        type: 'string',
        description: 'Path to the PRD markdown file (e.g. docs/user-auth.md)',
      },
    },
    required: ['prdPath'],
  },
  async handler(args) {
    const prdPath = args.prdPath as string
    if (!prdPath) return JSON.stringify({ error: 'prdPath is required' })

    // Check for existing state (resume)
    const existingState = readState()
    if (existingState.prdPath === prdPath && existingState.stories.length > 0 && !existingState.complete) {
      const done = existingState.stories.filter(s => s.status === 'complete').length
      const blocked = existingState.stories.filter(s => s.status === 'blocked').length
      return JSON.stringify({
        resumed: true,
        prdName: existingState.prdName,
        totalStories: existingState.stories.length,
        completedStories: done,
        blockedStories: blocked,
        currentStoryId: existingState.currentStoryId,
        iteration: existingState.iteration,
        stateFile: '.ralph/state.json',
      })
    }

    const result = parsePrd(prdPath)
    if (result.error) return JSON.stringify({ error: result.error })
    if (result.stories.length === 0) {
      return JSON.stringify({ error: `No user stories found in ${prdPath}` })
    }

    const cycle = detectCircularDependencies(result.stories)
    if (cycle) return JSON.stringify({ error: cycle })

    // Sort by priority, then by dependency depth
    const sorted = result.stories.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return a.id.localeCompare(b.id)
    })

    const state: import('../types.js').RalphState = {
      prdPath,
      prdName: result.prdName,
      startedAt: new Date().toISOString(),
      complete: false,
      failed: false,
      detectedStack: null,
      stories: sorted,
      learnings: [],
      currentStoryId: null,
      iteration: 0,
    }

    writeState(state)

    return JSON.stringify({
      resumed: false,
      prdName: state.prdName,
      totalStories: state.stories.length,
      stories: state.stories.map(s => ({ id: s.id, title: s.title, priority: s.priority, dependsOn: s.dependsOn })),
      stateFile: '.ralph/state.json',
    })
  },
}
