# Deployment Guide

**Last Updated:** February 13, 2026

This guide covers deploying Agentic Ally to **Cloudflare Workers**.

---

## 1. Prerequisites

1.  **Cloudflare Account** (Workers Paid plan recommended for KV/D1 limits).
2.  **Wrangler CLI** (`npm install -g wrangler`).
3.  **OpenAI API Key** (for Agents).
4.  **Node.js 20+** (see `package.json` engines).

---

## 2. Pre-deploy Checklist

Before running `npm run deploy`:

1. **Validation runs automatically** — `deploy` runs `npm run validate` first (format, lint, tests). Fix any failures before deploying.
2. **Environment** — Ensure all required env vars are set (see `.env.example` for full list).
3. **Secrets** — `wrangler secret put OPENAI_API_KEY` etc. for production.

---

## 3. Environment Variables

Configure these in `.dev.vars` (local) and via `wrangler secret put` (production). See `.env.example` for the complete list.

| Variable | Description | Required? |
|----------|-------------|-----------|
| `OPENAI_API_KEY` | Key for GPT-4o-mini agents. | Yes |
| `CLOUDFLARE_ACCOUNT_ID` | Your CF Account ID. | Yes |
| `CLOUDFLARE_API_KEY` | For programmatic access. | Yes |
| `CLOUDFLARE_KV_TOKEN` | KV access token. | Yes |
| `CLOUDFLARE_AI_GATEWAY_ID` | Metrics & caching proxy. | Optional |
| `PRODUCT_API_KEY` | Main product API key. | Yes (production) |

---

## 4. Deployment Configuration (wrangler.json)

The build outputs `.mastra/output/wrangler.json`. Ensure it defines the bindings (Mastra generates this; `fix-cloudflare-shims.js` patches it):

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

## 5. Deployment Commands

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

## 6. Troubleshooting Common Issues

### "KV Namespace Not Found"
*   **Fix:** Run `npx wrangler kv:namespace create MICROLEARNING_KV` and update the ID in `wrangler.toml`.

### "Worker Size Limit Exceeded"
*   **Fix:** We use `esbuild` to minify. Ensure you are not importing massive libraries.

### "Cron Job Not Firing"
*   **Check:** Go to Cloudflare Dashboard -> Workers -> Triggers -> Cron Triggers.
*   **Note:** Cron triggers might not fire on the free tier reliably.
