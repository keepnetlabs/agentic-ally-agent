# Deployment Guide

**Last Updated:** January 10, 2026

This guide covers deploying Agentic Ally to **Cloudflare Workers**.

---

## 1. Prerequisites

1.  **Cloudflare Account** (Workers Paid plan recommended for KV/D1 limits).
2.  **Wrangler CLI** (`npm install -g wrangler`).
3.  **OpenAI API Key** (for Agents).

---

## 2. Environment Variables

Configure these in `.dev.vars` (local) and via `wrangler secret put` (production).

| Variable | Description | Required? |
|----------|-------------|-----------|
| `OPENAI_API_KEY` | Key for GPT-4o-mini agents. | Yes |
| `CLOUDFLARE_ACCOUNT_ID` | Your CF Account ID. | Yes |
| `CLOUDFLARE_API_KEY` | For programmatic access. | Yes |
| `CLOUDFLARE_AI_GATEWAY_ID` | Metrics & caching proxy. | Optional |

---

## 3. Deployment Configuration (`wrangler.toml`)

Ensure your `wrangler.toml` defines the bindings:

```toml
name = "agentic-ally-agent"
main = "src/index.ts"
compatibility_date = "2024-09-23"

[kv_namespaces]
[[kv_namespaces]]
binding = "MICROLEARNING_KV"
id = "your-kv-id-here"

[d1_databases]
[[d1_databases]]
binding = "VECTOR_DB"
database_name = "agentic-vectors"
database_id = "your-db-id-here"

[ai]
binding = "AI"

[triggers]
crons = ["0 0 * * *"] # Run Autonomous task daily at midnight
```

---

## 4. Deployment Commands

### Production Deploy
```bash
npm run deploy
# OR
npx wrangler deploy
```

### verify Deployment
```bash
# Check health endpoint
curl https://your-worker.workers.dev/health
```

### Tail Logs (Live Debugging)
```bash
npx wrangler tail
```

---

## 5. Troubleshooting Common Issues

### "KV Namespace Not Found"
*   **Fix:** Run `npx wrangler kv:namespace create MICROLEARNING_KV` and update the ID in `wrangler.toml`.

### "Worker Size Limit Exceeded"
*   **Fix:** We use `esbuild` to minify. Ensure you are not importing massive libraries.

### "Cron Job Not Firing"
*   **Check:** Go to Cloudflare Dashboard -> Workers -> Triggers -> Cron Triggers.
*   **Note:** Cron triggers might not fire on the free tier reliably.
