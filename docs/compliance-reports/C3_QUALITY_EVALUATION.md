# C.3 — AI Output Quality Evaluation Data

**Document Reference:** Compliance Evidence Pack — Section C.3
**Last Updated:** March 2026
**Source:** D1 `dev_mastra_scorers` table (production) + `explainability` objects in KV content records

---

## 1. Overview

AI output quality is evaluated through two complementary mechanisms:

| Mechanism | Tool | Storage | Scope |
|-----------|------|---------|-------|
| **Automated Scoring** | Mastra Evals (`@mastra/evals@1.1.2`) | D1: `dev_mastra_scorers` | Completeness + Tone per agent response |
| **Explainability Objects** | `buildExplainability()` factory | KV: `phishing/smishing/ml base` records | Decision rationale per generated content item |

---

## 2. Automated Evaluation — Mastra Evals

### 2.1 Scorer Configuration

All production agents are configured with automated scorers. Coverage:

| Agent | Scorers Configured | Sampling Rate |
|-------|--------------------|--------------|
| `microlearning-agent` | `completeness`, `tone` | 100% (`ratio: 1`) |
| `phishing-email-agent` | `tone` | 100% |
| `smishing-sms-agent` | `completeness`, `tone` | 100% |
| `user-info-agent` | `completeness`, `tone` | 100% |
| `policy-summary-agent` | `completeness`, `tone` | 100% |
| `vishing-call-agent` | `completeness`, `tone` | 100% |
| `report-agent` | `completeness`, `tone` | 100% |
| `orchestrator-agent` | `completeness` | 100% |
| `out-of-scope-agent` | `completeness`, `tone` | 100% |
| `deepfake-video-agent` | `completeness`, `tone` | 100% |

**Scorer Definitions:**

- **`createCompletenessScorer()`** — Evaluates whether the AI output covers all required fields and sections defined by the agent's output schema (Zod-validated). Returns a 0–1 score.
- **`createToneScorer()`** — Evaluates whether the tone of the output is appropriate (professional, empathetic, non-alarmist) for a security awareness training context. Returns a 0–1 score.

### 2.2 D1 Storage Schema (`dev_mastra_scorers`)

Scorer results are written to D1 after each agent invocation:

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | Unique scorer result ID |
| `agentId` | TEXT | Agent identifier (e.g. `microlearning-agent`) |
| `runId` | TEXT | Agent run / thread ID |
| `scorerName` | TEXT | `completeness` \| `tone` |
| `score` | REAL | 0.0 – 1.0 |
| `reason` | TEXT | Scorer reasoning text |
| `input` | TEXT | Agent input prompt (truncated) |
| `output` | TEXT | Agent output (truncated) |
| `requestContext` | TEXT | Additional context (added migration 0005) |
| `createdAt` | TEXT | ISO 8601 timestamp |

> Migration: `migrations/0005_scorers_add_request_context.sql` — added `requestContext` column for `@mastra/evals@1.1.2` compatibility.

### 2.3 Sample Scorer Records (Production — Demo Tenant)

The following records are representative of the data in `dev_mastra_scorers`:

```json
[
  {
    "id": "scr_001_demo",
    "agentId": "microlearning-agent",
    "runId": "ml-run-uuid-001",
    "scorerName": "completeness",
    "score": 0.94,
    "reason": "Output includes all 8 required scene fields: title, narration, visual_description, interaction_type, key_message, duration, language, quiz_question. Minor: quiz_answer_feedback field slightly brief.",
    "requestContext": "topic=Email Header Analysis, difficulty=Medium, language=en-gb",
    "createdAt": "2026-03-10T09:15:00Z"
  },
  {
    "id": "scr_002_demo",
    "agentId": "microlearning-agent",
    "runId": "ml-run-uuid-001",
    "scorerName": "tone",
    "score": 0.91,
    "reason": "Tone is professional and instructional throughout. Avoids alarmist language. Slight improvement possible in scene 6 where phrasing could be more empathetic.",
    "requestContext": "topic=Email Header Analysis, difficulty=Medium, language=en-gb",
    "createdAt": "2026-03-10T09:15:00Z"
  },
  {
    "id": "scr_003_demo",
    "agentId": "phishing-email-agent",
    "runId": "ph-run-uuid-002",
    "scorerName": "tone",
    "score": 0.88,
    "reason": "Simulated phishing email tone is appropriately deceptive for training purposes. Subject line triggers urgency as intended. Landing page tone is consistent.",
    "requestContext": "topic=Credential Reset, difficulty=Easy, tactic=Urgency+Authority",
    "createdAt": "2026-03-12T11:30:00Z"
  },
  {
    "id": "scr_004_demo",
    "agentId": "smishing-sms-agent",
    "runId": "sm-run-uuid-003",
    "scorerName": "completeness",
    "score": 0.97,
    "reason": "All required SMS fields present: message text, {PHISHINGURL} placeholder, redFlags array (4 items), landing page HTML. Complete.",
    "requestContext": "topic=Parcel Delivery, difficulty=Easy, tactic=Curiosity",
    "createdAt": "2026-03-14T14:00:00Z"
  },
  {
    "id": "scr_005_demo",
    "agentId": "smishing-sms-agent",
    "runId": "sm-run-uuid-003",
    "scorerName": "tone",
    "score": 0.85,
    "reason": "SMS text matches expected casual/urgent tone for delivery notification scam. Could be more concise in second message variant.",
    "requestContext": "topic=Parcel Delivery, difficulty=Easy, tactic=Curiosity",
    "createdAt": "2026-03-14T14:00:00Z"
  },
  {
    "id": "scr_006_demo",
    "agentId": "user-info-agent",
    "runId": "ui-run-uuid-004",
    "scorerName": "completeness",
    "score": 0.89,
    "reason": "Behavioral resilience report includes: ENISA stage, COM-B diagnosis, key_signals_used, strengths, growth_opportunities, AI recommendations. data_gaps field present but underpopulated.",
    "requestContext": "user_id=usr_7f3a2b1c-demo, activities=3",
    "createdAt": "2026-03-20T10:45:00Z"
  },
  {
    "id": "scr_007_demo",
    "agentId": "user-info-agent",
    "runId": "ui-run-uuid-004",
    "scorerName": "tone",
    "score": 0.93,
    "reason": "Report tone is empathetic and non-punitive. Focuses on growth opportunities rather than failure. Appropriate for security awareness coaching context.",
    "requestContext": "user_id=usr_7f3a2b1c-demo, activities=3",
    "createdAt": "2026-03-20T10:45:00Z"
  },
  {
    "id": "scr_008_demo",
    "agentId": "policy-summary-agent",
    "runId": "ps-run-uuid-005",
    "scorerName": "completeness",
    "score": 0.96,
    "reason": "HTML output contains all required blocks: Policy Summary header, verification line, Key Takeaways list (5 items), Action Required section.",
    "requestContext": "policy=Acceptable Use Policy, language=en-gb",
    "createdAt": "2026-03-22T08:30:00Z"
  },
  {
    "id": "scr_009_demo",
    "agentId": "orchestrator-agent",
    "runId": "orch-run-uuid-006",
    "scorerName": "completeness",
    "score": 0.99,
    "reason": "Routing decision complete: intent classified, target agent identified, parameters extracted. No missing fields.",
    "requestContext": "prompt=Create phishing training for finance team",
    "createdAt": "2026-03-23T13:15:00Z"
  },
  {
    "id": "scr_010_demo",
    "agentId": "report-agent",
    "runId": "rpt-run-uuid-007",
    "scorerName": "completeness",
    "score": 0.91,
    "reason": "Executive report contains: summary paragraph, key findings (4 items), risk level, recommended actions, timeline. Missing: benchmark comparison section.",
    "requestContext": "report_type=executive, scope=team, users=12",
    "createdAt": "2026-03-24T16:00:00Z"
  },
  {
    "id": "scr_011_demo",
    "agentId": "report-agent",
    "runId": "rpt-run-uuid-007",
    "scorerName": "tone",
    "score": 0.90,
    "reason": "Executive tone is appropriate: concise, strategic, avoids technical jargon. One paragraph slightly verbose.",
    "requestContext": "report_type=executive, scope=team, users=12",
    "createdAt": "2026-03-24T16:00:00Z"
  }
]
```

---

## 3. Score Summary (Aggregate — Production)

> **Note:** Aggregate statistics (mean, min, max, count) are available by querying the production D1 `dev_mastra_scorers` table directly:
> ```sql
> SELECT agentId, scorerName, AVG(score), MIN(score), MAX(score), COUNT(*)
> FROM dev_mastra_scorers
> GROUP BY agentId, scorerName;
> ```
> The table below shows the agents and scorers that are configured. Actual production values should be pulled from D1 at time of evidence submission.

| Agent | Scorers Configured | Notes |
|-------|--------------------|-------|
| `microlearning-agent` | `completeness`, `tone` | |
| `phishing-email-agent` | `tone` | No completeness scorer |
| `smishing-sms-agent` | `completeness`, `tone` | |
| `user-info-agent` | `completeness`, `tone` | |
| `policy-summary-agent` | `completeness`, `tone` | |
| `vishing-call-agent` | `completeness`, `tone` | |
| `report-agent` | `completeness`, `tone` | |
| `orchestrator-agent` | `completeness` | No tone scorer |
| `out-of-scope-agent` | `completeness`, `tone` | |
| `deepfake-video-agent` | `completeness`, `tone` | |

---

## 4. Explainability — Per-Content Quality Rationale

Every generated content item (phishing, smishing, microlearning) embeds an `explainability` object in its KV base record. This provides decision-level transparency alongside the automated scorer results.

**Schema** (`src/mastra/types/explainability.ts`):

| Field | Type | Purpose |
|-------|------|---------|
| `reasoning` | string? | Why this content was generated (scenario choice rationale) — omitted if model did not provide |
| `targetAudienceReasoning` | string? | Why it fits the target audience — omitted if model did not provide |
| `contentStrategy` | string? | Approach taken (subject line, message framing, etc.) — omitted if model did not provide |
| `userContextReasoning` | string? | User-behaviour-specific reasoning (when personalised) |
| `keyFactors` | string[] | Psychological triggers or learning objectives used — **required** |
| `modelId` | string? | AI model used (e.g. `gpt-4o-mini`, `claude-sonnet-4-6`) |
| `modelProvider` | string? | Provider (`OPENAI`, `ANTHROPIC`, `WORKERS_AI`) |
| `generatedAt` | string | ISO 8601 generation timestamp — **required** |
| `version` | string | Schema version (`1.0`) — **required** |

**Sample Explainability Record (Phishing):**

```json
{
  "reasoning": "Credential reset phishing is among the highest-volume enterprise attack vectors. Easy difficulty ensures foundational exposure for new users.",
  "targetAudienceReasoning": "Effective for general office staff across all departments with no assumed security background.",
  "contentStrategy": "Branded IT department sender with urgent subject line. Short body to minimise cognitive load and maximise click-through for training purposes.",
  "keyFactors": ["Urgency", "Authority"],
  "modelId": "gpt-4o-mini",
  "modelProvider": "OPENAI",
  "generatedAt": "2026-01-15T10:00:00Z",
  "version": "1.0"
}
```

**Sample Explainability Record (Microlearning):**

```json
{
  "reasoning": "Email header analysis is a high-impact skill that directly reduces phishing click rates when users understand sender spoofing.",
  "targetAudienceReasoning": "Medium difficulty appropriate for users who have completed at least one phishing simulation.",
  "contentStrategy": "8-scene interactive module with real-world email header examples. Scene 5 includes a quiz on SPF/DKIM indicators.",
  "keyFactors": ["Email Header Reading", "Sender Verification", "SPF/DKIM Awareness"],
  "modelId": "claude-sonnet-4-6",
  "modelProvider": "ANTHROPIC",
  "generatedAt": "2026-03-10T09:00:00Z",
  "version": "1.0"
}
```

---

## 5. Quality Thresholds and Failure Behaviour

| Threshold | Behaviour |
|-----------|-----------|
| Scorer score < 0.7 | Logged as warning; content still returned (no hard block) |
| Zod validation failure | Hard block — agent throws, workflow aborts, error surfaced to caller |
| Missing required explainability fields | `buildExplainability()` omits optional fields; required fields (`keyFactors`, `generatedAt`, `version`) always present |

Content is not automatically rejected based on scorer scores alone. Scores inform human review and future prompt iteration cycles.

---

## 6. Human Review Process

Currently, AI output quality review is **manual and ad-hoc**:

- Generated content is reviewed by the platform operator before assignment to users
- Scorer results in D1 are available for query but no automated review dashboard exists
- A planned **Critic Agent** (see [AGENTIC_ROADMAP.md](../AGENTIC_ROADMAP.md)) will introduce automated pre-publish quality gates

---

## 7. Related Documents

| Document | Content |
|----------|---------|
| [C1_DATA_SCHEMA.md](./C1_DATA_SCHEMA.md) | Data dictionary, anonymisation methods |
| [C2_SAMPLE_RECORDS.md](./C2_SAMPLE_RECORDS.md) | Sample anonymised behavioural signal records |
| [AI_COMPLIANCE_INVENTORY.md](../AI_COMPLIANCE_INVENTORY.md) | Tool risk classification (EU AI Act Art. 9) |
| [AGENTIC_ROADMAP.md](../AGENTIC_ROADMAP.md) | Critic Agent — planned quality gate |
| `src/mastra/agents/microlearning-agent.ts` | Scorer configuration (line 316–320) |
| `src/mastra/types/explainability.ts` | Explainability schema + `buildExplainability()` factory |
| `migrations/0005_scorers_add_request_context.sql` | `dev_mastra_scorers` schema extension |
