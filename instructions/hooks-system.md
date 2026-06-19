# Hooks System — Lifecycle Automation

Hooks are lifecycle callbacks that fire at specific points during a session. They're managed via the `hooks` MCP server and persisted in `~/.kilo/hooks.json`.

## Hook Events

| Event | When it fires | Matcher field |
|-------|--------------|---------------|
| `PreToolUse` | Before a tool call executes | tool_name |
| `PostToolUse` | After a tool call succeeds | tool_name |
| `SessionStart` | When a session begins | — |
| `SessionEnd` | When a session ends | — |
| `Stop` | When the agent finishes responding | — |

## How to Use

### Register a hook

```
hooks_register(event: "PreToolUse", matcher: "Bash", type: "command", command: "/path/to/script.sh")
```

### Fire hooks

After significant lifecycle events, call:
```
hooks_fire(event: "PreToolUse", tool_name: "Bash", context: { tool_input: { command: "git push" } })
```

### List hooks

```
hooks_list()
```

## Hook Types

| Type | Description |
|------|-------------|
| `command` | Run a shell script. Receives JSON context via stdin and HOOK_CONTEXT env var. |
| `http` | Fire-and-forget HTTP POST to a URL. |
| `mcp_tool` | Call a tool on another MCP server. |

## Convention

- Fire hooks at natural lifecycle points in your workflow
- `PreToolUse` before critical operations (push, deploy, destructive commands)
- `PostToolUse` after edits (auto-format, lint)
- `SessionEnd` when wrapping up (consolidate memory, cleanup)
- Hooks are fire-and-forget — they don't block execution
