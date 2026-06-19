# Multi-Provider Support

Kilo can use any LLM provider via the LiteLLM proxy. This replaces the default Anthropic API with Bedrock, Vertex AI, OpenAI, DeepSeek, or 200+ other providers.

## Quick Start

### 1. Start the proxy

```bash
# Install LiteLLM and start the proxy
kilo-proxy start

# Check status
kilo-proxy status
```

### 2. Configure providers

```bash
# Interactive setup for API keys
kilo-proxy configure

# Or edit the config directly
nano ~/.kilo/proxy/litellm-config.yaml
```

### 3. Use in kilo.json

The proxy exposes models by name. Use the model name as the model in kilo.json agent configs.

Supported model names from the default config:
- `claude-sonnet-4` — routes to Anthropic, Bedrock, Vertex, or GitHub (whichever is configured)
- `deepseek-v4-pro` — routes through DeepSeek API
- `gpt-4o` — routes through OpenAI

Example kilo.json agent config:
```json
"architect": {
  "mode": "primary",
  "model": "claude-sonnet-4",
  ...
}
```

### 4. Proxy URL

```bash
# Print the proxy URL for reference
kilo-proxy url
# → http://127.0.0.1:8080
```

## Provider Configuration

The proxy config supports these providers out of the box:

| Provider | Config Key | Credentials |
|----------|-----------|-------------|
| Anthropic | `anthropic/claude-*` | `ANTHROPIC_API_KEY` |
| AWS Bedrock | `bedrock/anthropic.*` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` |
| Google Vertex AI | `vertex_ai/claude-*` | `VERTEX_PROJECT`, `VERTEX_LOCATION` |
| GitHub Models | `github/claude-*` | `GITHUB_TOKEN` |
| DeepSeek | `openai/deepseek-chat` | `DEEPSEEK_API_KEY` |
| OpenAI | `openai/gpt-*` | `OPENAI_API_KEY` |

## Multiple Models for Different Tasks

Use cheaper/faster models for simple tasks and stronger models for complex work:

```json
"explore": {
  "mode": "primary",
  "model": "gpt-4o-mini",
  ...
},
"code-reviewer": {
  "mode": "primary",
  "model": "claude-sonnet-4",
  ...
}
```

## Troubleshooting

```bash
# View proxy logs
kilo-proxy logs

# Restart with changes
kilo-proxy stop && kilo-proxy start

# Test the proxy directly
curl http://127.0.0.1:8080/health
```
