const apiKey = "sk-abc123def456ghi789jkl"
const dbPassword = "supersecret123"
const token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890"
const accessKey = "AKIAIOSFODNN7EXAMPLE"

// This should NOT be flagged - uses env var
const secret = process.env.API_SECRET
const apiToken = process.env.AUTH_TOKEN
