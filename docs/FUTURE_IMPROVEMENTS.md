# Future Agentic Capabilities Roadmap

This document outlines proposed architectural enhancements to elevate the **Agentic Ally** system from an Advanced Assistant to a fully **Autonomous Agentic System**.

These proposals focus on "closing the loop"—enabling agents to learn from their actions, remember user context long-term, and validate their own outputs.

---

## 1. 🧠 Active Learning: Metadata Correlation Loop — **✅ IMPLEMENTED** (February 2026)
**Goal:** Enable the system to understand *why* a user failed a simulation, not just *that* they failed.

### Status
Implemented. See [AGENTIC_ROADMAP.md](./AGENTIC_ROADMAP.md) for details. Flow: `upload-phishing-tool` / `upload-smishing-tool` → D1 `campaign_metadata` → `get-user-info-tool` enriches timeline with `[Tactic: X]` for LLM analysis. **Phishing + Smishing** both supported.

### The Problem (solved)
Previously, the `PhishingEmailAgent` generated a simulation with specific intent (e.g., "Authority Bias", "Scarcity"), but this intent was lost once the content was generated. When the `UserInfoAgent` saw a "Clicked Link" event in the timeline, it lacked the context of *which psychological trigger* was effective.

### The Solution: "Tagging & Matching"
Establish a **Metadata Correlation Loop** using a shared `resourceId`.

#### Architecture
1.  **Generation Phase (Write Side):**
    *   **Agent:** `PhishingEmailAgent`
    *   **Action:** When generating a simulation (e.g., ID `sim-123`), save its "DNA" to a local database (D1 `campaign_metadata` table).
    *   **Data Stored:**
        ```json
        {
          "resourceId": "sim-123",
          "tactic": "Authority Bias",
          "emotion": "Fear",
          "difficulty": "Hard",
          "timestamp": "2024-01-01T10:00:00Z"
        }
        ```

2.  **Execution Phase (External):**
    *   **User:** Clicks the link for `sim-123`.
    *   **System:** Records `ActionType: Clicked Link` for `resourceId: sim-123`.

3.  **Analysis Phase (Read Side):**
    *   **Agent:** `UserInfoAgent`
    *   **Action:** When analyzing the user timeline, it performs a **JOIN** operation.
    *   **Logic:**
        *   Fetch Timeline: `User clicked sim-123`
        *   Look up Metadata: `sim-123` = `Authority Bias` + `Fear`
        *   **Insight:** "User is susceptible to **Authority-based Fear** tactics."

### Impact
This allows the system to adaptively recommend training. Instead of generic "Phishing 101", it can prescribe: *"Module: How to Question Authority Figures"* because it knows exactly where the user's defense failed.

---

## 2. 🗄️ Long-Term Memory (User Persona Evolution)
**Goal:** Enable agents to remember user preferences and history across different sessions.

### Proposal
Implement a **Vector Database** (e.g., Cloudflare Vectorize) to store a "Security Persona" for each user.

*   **What to Store:**
    *   **Weaknesses:** "Failed 3 QR phishing tests."
    *   **Preferences:** "Responds better to Turkish content."
    *   **History:** "Already took 'Badge Security' training in Q1."
*   **Usage:** Before generating any new content, the agent queries this persona to personalize the difficulty and topic.

---

## 3. ⚖️ Self-Correction (Constitutional AI)
**Goal:** Prevent hallucinations and logic errors before they reach the user.

### Proposal
Introduce a **Critic Agent** layer between the Generator and the User.

*   **Workflow:**
    1.  **Generator (Phishing Agent):** Drafts an email.
    2.  **Critic (Reviewer Agent):** Analyzes the draft against specific rules (e.g., "Is the tone consistent?", "Are there forbidden words?").
    3.  **Decision:**
        *   ✅ **Pass:** Send to user.
        *   ❌ **Fail:** Send back to Generator with specific feedback ("Too informal for a CEO email. Rewrite.").

---

## 4. 🐝 Agent Swarm (Collaboration)
**Goal:** Allow agents to consult each other to solve complex problems.

### Proposal
Create an **Inter-Agent Communication Protocol**.

*   **Scenario:**
    *   `MicrolearningAgent` is creating a quiz.
    *   It asks `PhishingEmailAgent`: *"Give me an example of a sophisticated subject line for a 'Finance' scenario."*
    *   `PhishingEmailAgent` responds with a generated example.
    *   `MicrolearningAgent` incorporates this into the quiz question.

---

## Implementation Priority
1.  ~~**Active Learning (Metadata Correlation)**~~ — ✅ Done (Feb 2026, Phishing + Smishing).
2.  **Long-Term Memory:** High value for personalization.
3.  **Self-Correction (Critic Agent):** Improves reliability.
4.  **Agent Swarm:** Advanced feature for complex workflows.

---

## Next Steps (Devam)

| Area | Action |
|------|--------|
| **Product API** | Timeline response'da `scenarioResourceId`/`resourceId` — tactic enrichment için gerekli |
| **Critic Agent** | Phishing/Smishing çıktısını ton, yasak kelime, gerçekçilik açısından kontrol |
| **Long-Term Memory** | Vectorize ile kullanıcı persona (zayıflıklar, tercihler, geçmiş) |
| **Quick wins** | p-limit (rate limit), ~~structured logging~~ ✅, JSON Fixer Agent |
