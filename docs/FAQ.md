# Frequently Asked Questions

**Last Updated:** February 3, 2026

## 🤖 The Agents

### Q: How many agents are there?
**A:** There are **6 Specialized Agents**:
1.  **Orchestrator:** Routes traffic.
2.  **Microlearning:** Creates training.
3.  **Phishing:** Creates simulations.
4.  **User Info:** Analyzes risk.
5.  **Policy:** Answers policy questions.
6.  **Email IR Analyst:** Analyzes suspicious emails and produces IR reports.

### Q: Can I talk to them individually?
**A:** No, you always talk to the **Orchestrator** (`/chat`). It decides which specialist handles your request based on your intent.

### Q: What is the "Autonomous Loop"?
**A:** It's a background process that runs on a schedule (Cron). It scans all users, calculates their risk score, and *automatically* assigns training or phishing simulations to high-risk users without human intervention.

---

## 🏗️ Technical & Operations

### Q: How do I trigger the Autonomous Loop manually?
**A:** Use the API: `POST /autonomous` (See [API_REFERENCE.md](./API_REFERENCE.md)). Or run `npx tsx src/debug-workflow.ts` locally.

### Q: Why is the Microlearning Timeout so high (10 mins)?
**A:** Generating an 8-scene module involves ~10 parallel LLM calls, video semantic search, and JSON validation. It takes time. Reducing this timeout causes "Double-Generation" bugs.

### Q: Is my data safe?
**A:** Yes. We avoid exposing personal identifiers in outputs and use only what is required for tool execution.

### Q: How do I add a new Language?
**A:** The system supports **Unlimited Languages** via BCP-47 codes. Just ask: "Translate to Turkish (tr-TR)".

---

## 🐛 Troubleshooting

### Q: "Agent stuck in infinite loop"?
**A:** Check `HANDOVER.md`. You likely changed `LONG_RUNNING_AGENT_TIMEOUT_MS`.

### Q: "Hallucinating IDs"?
**A:** You likely removed the `{timestamp}` from the Thread ID format. The agent is remembering a previous run.

### Q: "Rate Limit Exceeded"?
**A:** The standard limit is 50 requests/min. For testing, verify your `.env` configuration.
