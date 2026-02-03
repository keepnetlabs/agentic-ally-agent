# 📦 Project Handover Document

**Welcome to Agentic Ally!** 👋

This document serves as the **Master Entry Point** for developers taking over the project.

---

## 🏗️ System at a Glance

Agentic Ally is an **Autonomous Security Awareness Platform** powered by **6 Specialized AI Agents**.

### The "S.H.I.E.L.D." Squad (6 Agents)
1.  **Orchestrator:** The router. Decides who handles the request.
2.  **Microlearning Agent:** Creates 5-min training courses (JSON + Content).
3.  **Phishing Agent:** Psychological profiler. Creates phishing simulations.
4.  **User Info Agent:** Risk analyst. Scores user vulnerability.
5.  **Policy Agent:** RAG-based expert. Answers policy questions.
6.  **Email IR Analyst:** Automated incident responder. Analyzes suspicious emails and generates IR reports.

### The Modes of Operation
*   **Reactive:** Standard Chat API (`/chat`).
*   **Proactive:** Autonomous Service (`Cron`) that "heals" users based on risk.

---

## 📚 Essential Reading Order

1.  **[HANDOVER.md](./HANDOVER.md)** (This file) - Critical "Gotchas" and configs.
2.  **[OVERVIEW.md](./OVERVIEW.md)** - High-level functional description.
3.  **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep dive into resilience & state machines.
4.  **[API_REFERENCE.md](./API_REFERENCE.md)** - Full list of endpoints (`/chat`, `/autonomous`).
5.  **[DEVELOPMENT.md](./DEVELOPMENT.md)** - How to debug & run locally.
6.  **[FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md)** - Roadmap for Autonomous Agentic System (Active Learning, Memory).

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
If you see JSON errors in logs, know that we use `jsonrepair`.
*   **Future Improvement:** Implement a dedicated LLM-based "JSON Fixer Agent" for 100% recovery rates.

---

## 🚀 Future Roadmap

If you have time, tackle these:

1.  **Memory Cleanup:** Write a Cron job to delete old `phishing-{thread}` keys from KV Store (older than 7 days).
2.  **Concurrency Control:** Implement `p-limit` for the Autonomous loop to handle 1000+ users without rate limiting.
3.  **Observability:** Add structured logging (JSON) for Datadog/Sentry integration.

---

**Good luck! The system is solid, resilient, and ready for scale.** 🚀
