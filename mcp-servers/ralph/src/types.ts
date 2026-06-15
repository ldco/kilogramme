export interface Story {
  id: string
  title: string
  priority: number
  dependsOn: string[]
  description: string
  acceptanceCriteria: string[]
  status: 'pending' | 'active' | 'complete' | 'blocked'
  verifiedAt?: string
  evidence?: string
  blockReason?: string
}

export interface Learning {
  lesson: string
  category: 'pattern' | 'gotcha' | 'convention' | 'dead_end'
  storyId?: string
  timestamp: string
}

export interface StackInfo {
  stack: string | null
  framework: string | null
  packageManager: string | null
  verifyCmd: string | null
  lintCmd: string | null
}

export interface RalphState {
  prdPath: string
  prdName: string
  startedAt: string
  complete: boolean
  failed: boolean
  detectedStack: StackInfo | null
  stories: Story[]
  learnings: Learning[]
  currentStoryId: string | null
  iteration: number
}

export interface RalphTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (args: Record<string, unknown>) => Promise<string>
}
