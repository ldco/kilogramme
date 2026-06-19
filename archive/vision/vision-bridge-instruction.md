# Vision Bridge Instruction

This project has a vision bridge: when the user references or drops an image file (PNG, JPG, GIF, WEBP, BMP), you can "see" it by calling the `describe_image` MCP tool with the file path. This is an Ollama-backed local vision model that returns a detailed text description.

## Behavior Rules

1. **When you see an image path or the user says "look at this image"** → immediately call `describe_image` with the absolute path. Do not ask permission, just do it.

2. **When the user drops/pastes an image and you get a "model does not support image input" error** → note the file path from the error or ask the user for the filename, then call `describe_image`.

3. **After getting the description** → analyze it and respond as if you had seen the image directly. Reference specific elements, colors, text, layout mentioned in the description.

4. **Use custom prompts when helpful** → e.g. `describe_image(path="/tmp/screenshot.png", prompt="What UI errors or bugs are visible in this screenshot?")` for debugging, or `prompt="Read all text visible in this image"` for OCR.

5. **Workspace-aware** — if an image file exists in the workspace directory, prefer the absolute path.

## Example flow

```
User: drops error-screenshot.png → Kilo: "model does not support image input"
Assistant: calls describe_image(path="/path/to/error-screenshot.png")
→ gets: "A terminal window showing Error: ENOSPC: no space left on device at line 42"
Assistant: "Your disk is full. The error is at src/main.ts:42. Let me check disk usage..."
```

Never apologize for being "text-only" — just call the tool.
