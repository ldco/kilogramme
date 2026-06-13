# Self-Hosted Embeddings — Zero API Cost Code Indexing

Replace Voyage AI API with a local embedding model running on a Russian VPS.

## Why

- **No API dependency** — fully self-hosted, no US company involvement
- **Fixed monthly cost** — Timeweb VDS paid in rubles, no variable API billing
- **Apache 2.0 model** — Qwen3-Embedding is free, no usage limits, no keys
- **China-sourced** — Alibaba/Qwen, no sanctions issues for Russia

## Recommended Model: Qwen3-Embedding-0.6B

| Parameter | Value |
|-----------|-------|
| Model | `Qwen/Qwen3-Embedding-0.6B` |
| Params | 0.6B |
| Dimension | 1024 (matches Voyage) |
| Context | 32K tokens |
| MTEB Multilingual | 64.33 (BGE-M3: 59.56) |
| Code retrieval | ✅ Explicitly trained for code |
| License | Apache 2.0 |
| Inference | TEI (Text Embeddings Inference) Docker |

## Hardware: Timeweb VDS

| Tariff | vCPU | RAM | Disk | Price/mo |
|--------|------|-----|------|----------|
| Стандарт | 2 | 4 GB | 50 GB NVMe | ~700 ₽ |
| **Бизнес** | **4** | **8 GB** | **80 GB NVMe** | **~1,500 ₽** |

Бизнес recommended — 4 GB overhead for OS + Docker, 4 GB for the model.

## VDS Setup

```bash
# 1. SSH into Timeweb VDS
ssh root@<VDS_IP>

# 2. Install Docker (if not pre-installed)
curl -fsSL https://get.docker.com | sh

# 3. Pull and run TEI with Qwen3-Embedding-0.6B
docker run -d --restart always \
  --name embeddings \
  -p 127.0.0.1:8080:80 \
  -v /data/hf-cache:/data \
  ghcr.io/huggingface/text-embeddings-inference:cpu-1.7.2 \
  --model-id Qwen/Qwen3-Embedding-0.6B

# 4. Verify it works
curl http://127.0.0.1:8080/embed \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"inputs": ["def hello(): return \"world\""]}'
```

## Security — Do NOT Expose to Internet

Ollama/TEI have no auth. Choose one:

### Option A: SSH Tunnel (Simplest)
```bash
# On your main PC, keep this running:
ssh -N -L 8080:127.0.0.1:8080 root@<VDS_IP>
```
Then Kilo connects to `http://127.0.0.1:8080/v1`.

### Option B: WireGuard VPN
Set up WireGuard between your PC and VDS. Bind TEI to the VPN interface IP.

### Option C: UFW Firewall
```bash
ufw allow from <YOUR_HOME_IP> to any port 8080
ufw enable
```
Only your IP can reach the port. Avoid this if your home IP changes.

## Kilo Config

In `kilo.json` (project or global):

```json
"indexing": {
  "enabled": true,
  "provider": "openai-compatible",
  "model": "Qwen3-Embedding-0.6B",
  "dimension": 1024,
  "vectorStore": "lancedb",
  "openai-compatible": {
    "baseUrl": "http://127.0.0.1:8080/v1"
  }
}
```

Remove the `voyage` block and `apiKey` — no longer needed.

## Fallback Tier: nomic-embed-text via Ollama

If the VDS can't handle 0.6B (unlikely, but possible), drop to the lightest option:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull nomic-embed-text    # 274 MB, 137M params
```

```json
"indexing": {
  "provider": "ollama",
  "model": "nomic-embed-text",
  "ollama": {
    "baseUrl": "http://127.0.0.1:11434"
  }
}
```

## Quality Comparison

| Model | MTEB Score | Code-Trained | Cost |
|-------|-----------|-------------|------|
| voyage-code-3 | Not public (best code) | ✅ Purpose-built | $0.14/1M tokens |
| Qwen3-Embedding-0.6B | 64.33 | ✅ Code in training | 1,500 ₽/mo VDS |
| Qwen3-Embedding-4B | 69.45 | ✅ Code in training | 3,000+ ₽/mo VDS |
| BGE-M3 | 59.56 | ❌ General text | 1,500 ₽/mo VDS |
| nomic-embed-text | ~56 | ❌ General text | 400 ₽/mo VDS |

**Voyage is better for pure code search.** Qwen3-0.6B is the best free alternative at acceptable quality.

## Files to Update

- [ ] `kilo.json` — switch `provider` from `voyage` to `openai-compatible`, remove `voyage.apiKey`
- [ ] `kilogramme/.gitignore` — ensure `kilo.json` is gitignored (it already is)
- [ ] `kilogramme/kilo.example.json` — update example to show `openai-compatible` config

## Related

- [Stack Analysis — Russia Value](stack-analysis-russia-value.md)
- [Agent & Model Cheat Sheet](kilocode-agents-models-cheatsheet.md)
