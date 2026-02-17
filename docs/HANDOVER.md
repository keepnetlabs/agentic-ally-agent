# 📦 Project Handover Document

**Welcome to Agentic Ally!** 👋

This document serves as the **Master Entry Point** for developers taking over the project.

---

## 🏗️ System at a Glance

Agentic Ally is an **Autonomous Security Awareness Platform** powered by **8 Specialized AI Agents**.

### The "S.H.I.E.L.D." Squad (8 Agents)
1.  **Orchestrator:** The router. Decides who handles the request.
2.  **Microlearning Agent:** Creates 5-min training courses (JSON + Content).
3.  **Phishing Agent:** Psychological profiler. Creates phishing simulations.
4.  **Smishing Agent:** SMS-based phishing simulations.
5.  **User Info Agent:** Risk analyst. Scores user vulnerability.
6.  **Policy Agent:** RAG-based expert. Answers policy questions.
7.  **Vishing Call Agent:** Outbound voice phishing simulations via ElevenLabs.
8.  **Email IR Analyst:** Automated incident responder. Analyzes suspicious emails and generates IR reports.

### The Modes of Operation
*   **Reactive:** Standard Chat API (`/chat`).
*   **Proactive:** Autonomous Service (`Cron`) that "heals" users based on risk.

---

## 📚 Essential Reading Order

1.  **[HANDOVER.md](./HANDOVER.md)** (This file) - Critical "Gotchas" and configs.
2.  **[OVERVIEW.md](./OVERVIEW.md)** - High-level functional description.
3.  **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep dive into resilience & state machines.
4.  **[API_REFERENCE.md](./API_REFERENCE.md)** - Full list of endpoints (`/chat`, `/autonomous`, `/smishing/chat`, `/vishing/*`, `/email-ir/analyze`).
5.  **[DEVELOPMENT.md](./DEVELOPMENT.md)** - How to debug & run locally.
6.  **[ERROR_HANDLING.md](./ERROR_HANDLING.md)** - Tool error pattern: `{ success: false, error }` vs `throw`.
7.  **[FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md)** - Roadmap for Autonomous Agentic System (Memory, Critic Agent).
8.  **[AGENTIC_ROADMAP.md](./AGENTIC_ROADMAP.md)** - Active Learning (✅ tamamlandı), Critic Agent, Agent Swarm planı.

---

## ⚠️ Critical "Do Not Touch" Configurations

These settings were tuned after painful debugging sessions. Change them at your own risk.

### 1. Timout Settings (`constants.ts`)
*   **Microlearning Timeout:** `LONG_RUNNING_AGENT_TIMEOUT_MS = 600,000` (10 Minutes).
    *   *Why?* Generating a full course (Structure -> Video Search -> Text Gen -> Email Gen) takes ~2-4 minutes. The default 90s timeout causes infinite retry loops. **Keep this > 5 mins.**

### 2. Thread IDs (`autonomous-service.ts`)
*   **Format:** `phishing-{userId}-{timestamp}`
*   **Why?** We append `{timestamp}` to ensure *every run* starts with a blank memory.
    *   *Risk:* Removing this causes the agent to remember past runs and hallucinate IDs that don't exist in the current session.

### 3. Fallback Logic (`resilience-utils.ts`)
*   **Strategy:** We use a "3-Level Fallback".
    *   *Example:* Translation fails -> Try Auto-Repair -> Try Basic Translation.
    *   *Why?* Reliability > Perfection. The system must never crash.

### 4. API Keys (.env)
*   **PRODUCT_API_KEY:** Required for production. If missing, defaults to 'apikey' (dev mode only).
    *   *Risk:* Integration with main product will fail in Prod if not set.

### 5. User Search & Phone Resolution (`user-search-utils.ts`)
*   **Flow:** Search (get-all) → fallback (target-users/search) if empty → if found but `phoneNumber` missing → direct lookup (GET /target-users/:id) → merge phone into base.
*   **Resilience:** If direct lookup fails (404, 500, network), we return the user without phone and log a warning. Vishing flow continues; call may fail later if phone is required.
*   **See:** [DATA_MODEL.md §3.1](./DATA_MODEL.md), [WORKFLOWS.md §8](./WORKFLOWS.md).

---

## 🛠️ How to Debug Like a Pro

### Local Debugging Script
Don't wait for Cron jobs. Use the manual trigger:

```bash
# Run the Autonomous Workflow manually
npx tsx src/debug-workflow.ts
```
*Logs detailed Emojis (🤖, ✅, ❌) to show exactly what step failed.*

### JSON "Self-Correction"
If you see JSON errors in logs, know that we use `jsonrepair` (industry standard, 1.2M weekly npm) plus 4 extraction strategies in `json-cleaner.ts`. This setup is sufficient.

---

## 🚀 Production Deployment

Before deploying to production:

1. **Pre-deploy validation:** `npm run deploy` automatically runs `npm run validate` (format, lint, tests) first.
2. **Environment:** Ensure `.env` has `PRODUCT_API_KEY` and all required keys (see `.env.example`).
3. **D1 migration (Active Learning):** After deploy, run `npx wrangler d1 execute agentic-ally-memory --remote --file=./migrations/0002_campaign_metadata.sql` — see [DEPLOYMENT.md §6](./DEPLOYMENT.md).

---

## 🚀 Future Roadmap

If you have time, tackle these:

1.  **Memory Cleanup:** Write a Cron job to delete old `phishing-{thread}` keys from D1 (Mastra threads table). *Note: Chat history must be preserved; only autonomous threads (phishing-*, training-*) are candidates.*
2.  **Observability:** Add structured logging (JSON) for Datadog/Sentry integration.
3.  **vishing (future):** `vishing-call` = outbound voice. Future `vishing` type may cover voicemail, VoIP, etc.

**✅ Done:** Active Learning (campaign metadata → User Info tactic enrichment) — Şubat 2026.
**✅ Done:** Error handling — index.ts catch blocks use `errorService` + `logErrorInfo` for structured logging.
**✅ Done:** D1 health check — `/health` endpoint now checks `agentic_ally_memory` D1 binding (SELECT 1) when running on Cloudflare Workers.

---

**Good luck! The system is solid, resilient, and ready for scale.** 🚀
