import type { RalphTool } from '../types.js'
import { readState, getStoryFailures } from '../state.js'

export const statusTool: RalphTool = {
  name: 'ralph_status',
  description: 'Get full execution status: progress, current story, learnings, iteration count, stack info.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  async handler() {
    const state = readState()

    if (!state.prdPath) {
      return JSON.stringify({ error: 'No active PRD. Call ralph_load_prd first.' })
    }

    const stories = state.stories
    const done = stories.filter(s => s.status === 'complete').length
    const active = stories.find(s => s.status === 'active')
    const blocked = stories.filter(s => s.status === 'blocked')
    const failed = stories.filter(s => {
      const f = getStoryFailures(state, s.id)
      return f > 0
    })

    return JSON.stringify({
      prdName: state.prdName,
      prdPath: state.prdPath,
      complete: state.complete,
      totalStories: stories.length,
      completedStories: done,
      blockedStories: blocked.length,
      failedStories: failed.length,
      progress: `${done}/${stories.length}`,
      currentStory: active ? { id: active.id, title: active.title } : null,
      iteration: state.iteration,
      detectedStack: state.detectedStack,
      stories: stories.map(s => ({
        id: s.id,
        title: s.title,
        status: s.status,
        priority: s.priority,
        evidence: s.evidence ? s.evidence.slice(0, 100) : null,
      })),
      recentLearnings: state.learnings.slice(-5).map(l => ({
        lesson: l.lesson.slice(0, 150),
        category: l.category,
        storyId: l.storyId,
      })),
    })
  },
}
