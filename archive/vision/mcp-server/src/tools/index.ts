import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { describeImage } from './describe.js'

export interface VisionTool extends Tool {
  handler: (args: Record<string, unknown>) => Promise<string>
}

export const describeImageTool: VisionTool = {
  name: 'describe_image',
  description:
    'Describe an image file using a local vision model (Ollama). Takes a file path and returns a detailed text description of the image contents — colors, layout, text, UI elements, people, objects, etc. Use this to "see" images when the main LLM lacks vision capability.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string',
        description: 'Absolute path to the image file (PNG, JPG, GIF, WEBP)',
      },
      prompt: {
        type: 'string',
        description:
          'Optional custom prompt for the vision model. Default: "Describe this image in detail."',
      },
    },
    required: ['path'],
  },
  handler: async (args: Record<string, unknown>) => {
    return describeImage({
      path: args.path as string,
      prompt: args.prompt as string | undefined,
    })
  },
}

export const tools: VisionTool[] = [describeImageTool]
