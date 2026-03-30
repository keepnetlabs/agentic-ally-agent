# 📦 Project Handover Document

**Welcome to Agentic Ally!** 👋

This document serves as the **Master Entry Point** for developers taking over the project.

---

## 🏗️ System at a Glance

Agentic Ally is an **Autonomous Security Awareness Platform** powered by **9 Specialized AI Agents**.

### The "S.H.I.E.L.D." Squad (9 Agents)
1.  **Orchestrator:** The router. Decides who handles the request.
2.  **Microlearning Agent:** Creates 5-min training courses (JSON + Content).
3.  **Phishing Agent:** Psychological profiler. Creates phishing simulations.
4.  **Smishing Agent:** SMS-based phishing simulations.
5.  **User Info Agent:** Risk analyst. Scores user vulnerability.
6.  **Policy Agent:** RAG-based expert. Answers policy questions.
7.  **Vishing Call Agent:** Outbound voice phishing simulations via ElevenLabs.
8.  **Email IR Analyst:** Automated incident responder. Analyzes suspicious emails and generates IR reports.
9.  **Out-of-Scope Agent:** Boundary guard. Politely refuses and redirects when the request is outside the security awareness domain (prevents hallucination).

### The Modes of Operation
*   **Reactive:** Standard Chat API (`/chat`).
*   **Proactive:** Autonomous Service (`Cron`) that "heals" users based on risk.

---

## 📚 Essential Reading Order

1.  **[HANDOVER.md](./HANDOVER.md)** (This file) - Critical "Gotchas" and configs.
2.  **[OVERVIEW.md](./OVERVIEW.md)** - High-level functional description.
3.  **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep dive into resilience & state machines.
4.  **[API_REFERENCE.md](./API_REFERENCE.md)** - Full list of endpoints (`/chat`, `/autonomous`, `/smishing/chat`, `/vishing/*`, `/email-ir/analyze`, `/audit/verify`, `/deepfake/status`).
5.  **[DEVELOPMENT.md](./DEVELOPMENT.md)** - How to debug & run locally.
6.  **[ERROR_HANDLING.md](./ERROR_HANDLING.md)** - Tool error pattern: `{ success: false, error }` vs `throw`.
7.  **[FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md)** - Roadmap for Autonomous Agentic System (Memory, Critic Agent).
8.  **[AGENTIC_ROADMAP.md](./AGENTIC_ROADMAP.md)** - Active Learning (✅ tamamlandı), Critic Agent, Agent Swarm planı.
9.  **[AI_COMPLIANCE_INVENTORY.md](./AI_COMPLIANCE_INVENTORY.md)** - EU AI Act inventory, tool risk classification.
10. **[AI_COMPLIANCE_PROGRESS.md](./AI_COMPLIANCE_PROGRESS.md)** - AI compliance done vs planned.
11. **[EU_AI_ACT_WORKFLOW.md](./EU_AI_ACT_WORKFLOW.md)** - EU AI Act süreç, raporlama, araçlar (eu-ai-act-scanner, ActProof, Lexsight).

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
4. **D1 migration (GDPR Audit):** `npx wrangler d1 execute agentic-ally-memory --remote --file=./migrations/0003_gdpr_audit.sql` — creates `data_access_audit` + `data_deletion_requests` tables.
5. **D1 migration (Hash-Chain):** `npx wrangler d1 execute agentic-ally-memory --remote --file=./migrations/0004_audit_integrity_hash.sql` — adds `integrity_hash` + `prev_hash` columns for tamper-evident logging (EU AI Act Art. 12).

---

## 🚀 Future Roadmap

If you have time, tackle these:

1.  **Memory Cleanup:** Write a Cron job to delete old `phishing-{thread}` keys from D1 (Mastra threads table). *Note: Chat history must be preserved; only autonomous threads (phishing-*, training-*) are candidates.*
2.  **Observability:** Add structured logging (JSON) for Datadog/Sentry integration.
3.  **vishing (future):** `vishing-call` = outbound voice. Future `vishing` type may cover voicemail, VoIP, etc.

### Completed Milestones

| Milestone | Date |
|-----------|------|
| Active Learning (campaign metadata → User Info tactic enrichment) | Feb 2026 |
| Error handling (`errorService` + `logErrorInfo` structured logging) | Feb 2026 |
| D1 health check (`/health` → `agentic_ally_memory` SELECT 1) | Feb 2026 |
| GDPR compliance — audit logging, deletion requests, data export, KV TTL, tamper-evident hash-chain (Art. 12) | Mar 2026 |
| Threat Intel Enhancer — role/level/keyword filtering, adaptive counts, token-efficient format | Mar 2026 |
| Localization Quality Pipeline — cultural adaptation, anti-translationese, 7-point QC | Mar 2026 |
| QC model optimization — GPT-5.1 → GPT-5.4-mini for enhanced languages (6x cost reduction) | Mar 2026 |

See [AI_COMPLIANCE_PROGRESS.md](./AI_COMPLIANCE_PROGRESS.md) for full compliance details.

---

**Good luck! The system is solid, resilient, and ready for scale.** 🚀
