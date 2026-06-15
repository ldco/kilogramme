import { existsSync, readFileSync } from 'node:fs'
import type { Story } from './types.js'

interface ParseResult {
  prdName: string
  stories: Story[]
  error?: string
}

export function parsePrd(filePath: string): ParseResult {
  if (!existsSync(filePath)) {
    return { prdName: '', stories: [], error: `File not found: ${filePath}` }
  }

  const content = readFileSync(filePath, 'utf-8')
  const basename = filePath.split('/').pop()?.replace(/\.md$/i, '') ?? 'unknown'

  // Extract feature name from # heading
  const headingMatch = content.match(/^#\s+(.+)/m)
  const prdName = headingMatch?.[1] ?? basename

  // Split on ### US-XXX sections
  const sections = content.split(/(?=^###\s+US-\d+\s+)/m)

  const stories: Story[] = []

  for (const section of sections) {
    const idMatch = section.match(/^###\s+(US-\d+)/m)
    if (!idMatch) continue
    const id = idMatch[1]

    const titleMatch = section.match(/^###\s+US-\d+\s+[—–-]?\s*(.+)$/m)
    const title = titleMatch?.[1]?.trim() ?? ''

    const priorityMatch = section.match(/\*\*Priority:\*\*\s*(\d+)/i)
    const priority = priorityMatch ? parseInt(priorityMatch[1], 10) : 999

    const depsMatch = section.match(/\*\*Depends on:\*\*\s*(.+)/i)
    const dependsOn: string[] = []
    if (depsMatch) {
      dependsOn.push(
        ...depsMatch[1]
          .split(/[,;]/)
          .map(d => d.trim())
          .filter(d => /^US-\d+$/.test(d))
      )
    }

    // Description: first paragraph after the heading/metadata block
    const descLines: string[] = []
    const lines = section.split('\n')
    let inMetadata = true
    for (const line of lines) {
      if (inMetadata && (line.startsWith('###') || line.startsWith('**') || line.trim() === '')) continue
      if (line.startsWith('**Acceptance Criteria:**')) break
      inMetadata = false
      if (line.trim()) descLines.push(line.trim())
    }
    const description = descLines.join(' ') || `Story ${id}`

    // Acceptance criteria
    const ac: string[] = []
    let inAc = false
    for (const line of lines) {
      if (line.startsWith('**Acceptance Criteria:**')) {
        inAc = true
        continue
      }
      if (inAc) {
        if (line.startsWith('###') || line.startsWith('**')) break
        const trimmed = line.replace(/^-\s*/, '').trim()
        if (trimmed) ac.push(trimmed)
      }
    }

    // Detect circular dependencies
    const depSet = new Set(dependsOn)
    if (depSet.has(id)) {
      return { prdName: '', stories: [], error: `Circular dependency: ${id} depends on itself` }
    }

    stories.push({
      id,
      title,
      priority,
      dependsOn,
      description,
      acceptanceCriteria: ac.length > 0 ? ac : [],
      status: 'pending',
    })
  }

  // Validate DAG
  for (const story of stories) {
    for (const depId of story.dependsOn) {
      if (!stories.find(s => s.id === depId)) {
        return { prdName: '', stories: [], error: `Story ${story.id} depends on ${depId} which does not exist` }
      }
    }
  }

  if (stories.length === 0) {
    return { prdName: '', stories: [], error: `No user stories found in ${filePath}. Expected ### US-XXX sections.` }
  }

  return { prdName, stories }
}

export function detectCircularDependencies(stories: Story[]): string | null {
  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(id: string): boolean {
    if (inStack.has(id)) return true
    if (visited.has(id)) return false
    visited.add(id)
    inStack.add(id)
    const story = stories.find(s => s.id === id)
    if (story) {
      for (const dep of story.dependsOn) {
        if (dfs(dep)) return true
      }
    }
    inStack.delete(id)
    return false
  }

  for (const story of stories) {
    if (dfs(story.id)) {
      return `Circular dependency detected involving ${story.id}`
    }
  }
  return null
}
