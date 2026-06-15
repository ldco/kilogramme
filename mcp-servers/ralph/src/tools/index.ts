import type { RalphTool } from '../types.js'
import { loadPrdTool } from './load-prd.js'
import { nextStoryTool } from './next-story.js'
import { verifyStoryTool } from './verify-story.js'
import { blockStoryTool } from './block-story.js'
import { learnTool } from './learn.js'
import { statusTool } from './status.js'
import { completeTool } from './complete.js'
import { detectStackTool } from './detect-stack.js'

export const tools: RalphTool[] = [
  loadPrdTool,
  nextStoryTool,
  verifyStoryTool,
  blockStoryTool,
  learnTool,
  statusTool,
  completeTool,
  detectStackTool,
]
