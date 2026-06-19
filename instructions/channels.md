# Channels — Push Events Into Running Sessions

Channels let you receive messages from external tools (CI, alerts, chat) during a session. The agent checks for messages at the start of each turn and reacts to them.

## How It Works

1. External tools POST JSON to the webhook endpoint
2. Messages are stored in `~/.kilo/channels/<channel>.json`
3. The agent calls `channels_read()` at the start of each turn
4. Messages are cleared after being read

## Setting Up

### Start the webhook listener (background)

```
channels_listen(port: 9337)
```

Or from the terminal:
```bash
kilo-channel-webhook --port 9337 &
```

### Post a message

From any tool:
```bash
curl -X POST http://127.0.0.1:9337 \
  -H "Content-Type: application/json" \
  -d '{"channel":"ci","from":"github-actions","message":"Tests passing? PR #42 needs review"}'
```

### Read messages (agent does this automatically)

```
channels_read()
channels_read(channel: "ci")
```

### Post directly from MCP

```
channels_post(channel: "ci", from: "github-actions", message: "Build #123 passed")
```

## Common Channel Patterns

| Channel | Sources | Expected Messages |
|---------|---------|-------------------|
| `ci` | GitHub Actions, GitLab CI | Build pass/fail, test results |
| `alerts` | Sentry, Datadog, Grafana | Error spikes, performance alerts |
| `chat` | Slack webhook, Discord | Team messages, mentions |
| `review` | GitHub PR webhook | PR opened, review requested |
| `deploy` | ArgoCD, Jenkins | Deployment status |

## Agent Behavior

At the START of every turn:
1. Call `channels_read()` to check for new messages
2. If there are messages, process them:
   - **ci failures**: investigate and fix
   - **alerts**: correlate with recent changes
   - **chat**: acknowledge and respond
   - **review requests**: switch to review mode
3. Report to user: "Received N messages from channels: [summary]"
