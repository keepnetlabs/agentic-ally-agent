# Quick Start Guide

**Last Updated:** January 10, 2026

Get **Agentic Ally** (The 5-Agent Security Platform) running locally in 5 minutes.

## Prerequisites

- **Node.js** 18+
- **Cloudflare Account** (for Workers & KV)
- **OpenAI API Key**

---

## Step 1: Clone & Install

```bash
git clone https://github.com/keepnetlabs/agentic-ally.git
cd agentic-ally/agent
npm install
```

## Step 2: Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Required for Agents
OPENAI_API_KEY=sk-...

# Required for Cloudflare Infrastructure
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_KV_TOKEN=...
CLOUDFLARE_D1_DATABASE_ID=...
```

## Step 3: Run Development Server

```bash
npm run dev
```

You should see:
```
✓ Server running at http://localhost:8000
✓ Microlearning Agent loaded
✓ Phishing Agent loaded
✓ Orchestrator loaded
```

---

## Step 4: Test the 5 Agents

The platform is **multi-modal**. Test different capabilities:

### A. Create Training (Microlearning Agent)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create 5-min phishing awareness training for Finance"}'
```

### B. Create Simulation (Phishing Agent)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a fake invoice email simulation for HR"}'
```

### C. Ask Policy Question (Policy Agent)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is our policy on remote work?"}'
```

### D. Analyze Risk (User Info Agent)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Who is john.doe@example.com? Analyze risk."}'
```

---

## Step 5: Advanced & Autonomous

To test the **Proactive Autonomous Loop** (without waiting for Cron):

```bash
npx tsx src/debug-workflow.ts
```
*Watch the logs for emojis (🤖, ✅) as it iterates through users and auto-assigns content.*

---

## Where to go next?

1.  **[HANDOVER.md](./HANDOVER.md)** - Critical configurations & pitfalls.
2.  **[API_REFERENCE.md](./API_REFERENCE.md)** - Full API documentation.
3.  **[WORKFLOWS.md](./WORKFLOWS.md)** - Visual logic diagrams.
