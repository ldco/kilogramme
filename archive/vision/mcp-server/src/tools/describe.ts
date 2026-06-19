import { readFileSync } from 'node:fs'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'

export async function describeImage(params: {
  path: string
  prompt?: string
}): Promise<string> {
  const { path: imagePath, prompt } = params

  if (!imagePath) {
    throw new Error('Missing required parameter: path')
  }

  let imageBuffer: Buffer
  try {
    imageBuffer = readFileSync(imagePath)
  } catch {
    throw new Error(`Cannot read file: ${imagePath}`)
  }

  if (imageBuffer.length === 0) {
    throw new Error(`File is empty: ${imagePath}`)
  }

  if (imageBuffer.length > 20 * 1024 * 1024) {
    throw new Error(`Image too large (max 20 MB): ${imagePath}`)
  }

  const base64 = imageBuffer.toString('base64')
  const userPrompt = prompt || 'Describe this image in detail. Note all text, colors, layout, elements, and any notable features.'

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemma3:4b',
      prompt: userPrompt,
      images: [base64],
      stream: false,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Ollama API error ${response.status}: ${text.slice(0, 200)}`)
  }

  const data = (await response.json()) as { response: string }
  return data.response
}
