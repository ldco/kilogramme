import type { Plugin } from "@kilocode/plugin"

const OLLAMA_URL = "http://127.0.0.1:11434"
const VISION_MODEL = "gemma3:4b"

async function describe(imagePath: string): Promise<string> {
  const buf = await fetch(`file://${imagePath}`).then(r => r.arrayBuffer())
  const b64 = Buffer.from(buf).toString("base64")
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 25_000)
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL,
        prompt: "Describe this image in detail. Note all text, colors, layout, elements, and any notable features.",
        images: [b64],
        stream: false,
      }),
      signal: ac.signal,
    })
    if (!res.ok) throw new Error(`Ollama ${res.status}`)
    const data = (await res.json()) as { response: string }
    return data.response
  } finally {
    clearTimeout(timer)
  }
}

interface Part {
  type: string
  mime?: string
  url?: string
  filename?: string
  text?: string
  id: string
  sessionID: string
  messageID: string
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]

function isImagePath(p: string): boolean {
  return IMAGE_EXTENSIONS.some(ext => p.toLowerCase().endsWith(ext))
}

const VisionBridge: Plugin = async () => ({
  "tool.execute.before": async (
    input: { tool: string },
    output: { args: Record<string, unknown> },
  ) => {
    if (input.tool === "read" && typeof output.args.filePath === "string" && isImagePath(output.args.filePath)) {
      throw new Error(
        `Image file detected. Do NOT use the Read tool. Instead, call the describe_image MCP tool with the file path: ${output.args.filePath}`
      )
    }
  },

  "chat.message": async (
    _input: Record<string, unknown>,
    output: { message?: Record<string, unknown>; parts?: Part[] },
  ) => {
    if (!output.parts) return

    for (let i = output.parts.length - 1; i >= 0; i--) {
      const p = output.parts[i]!
      if (p.type !== "file" || !p.mime?.startsWith("image/") || !p.url?.startsWith("file://")) continue

      const path = p.url.slice(7)
      try {
        const description = await describe(path)
        const { unlink } = await import("node:fs/promises")
        void unlink(path).catch(() => {})
        output.parts[i] = {
          id: p.id,
          sessionID: p.sessionID,
          messageID: p.messageID,
          type: "text",
          text: `[Image: ${p.filename ?? "unnamed"} — ${description}]`,
        } as Part
      } catch (e: unknown) {
        output.parts[i] = {
          id: p.id,
          sessionID: p.sessionID,
          messageID: p.messageID,
          type: "text",
          text: `[Image: ${p.filename ?? "unnamed"} — describe error: ${e instanceof Error ? e.message : String(e)}]`,
        } as Part
      }
    }
  },
})

export default { id: "vision-bridge", server: VisionBridge }
