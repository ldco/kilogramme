---
description: Start a background agent — runs in tmux, results available later
---

# /bg — Run in Background

Start a task that runs in a separate tmux session. You can continue working in the foreground while the background agent runs.

## Usage

```
/bg Fix the failing auth tests
/bg Upgrade all npm dependencies
/bg Review the PR at https://github.com/org/repo/pull/123
```

## How It Works

1. The task is recorded and saved to `~/.kilo/bg-queue/<timestamp>.task`
2. The shell wrapper `kilo-bg` picks up the task and creates a tmux session
3. The background agent runs `kilo -p "<task>"` in isolation
4. Results are captured to `~/.kilo/bg-sessions/<id>/`

## Monitoring

- `/bg-status` — list all background agents and their status
- `/bg-logs <id>` — view the transcript of a completed/failed agent
- `/bg-stop <id>` — abort a running background agent
