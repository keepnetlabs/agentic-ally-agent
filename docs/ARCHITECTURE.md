# Architecture Documentation

## System Overview

Agentic Ally is built on the **Mastra** framework and deployed on **Cloudflare Workers**. The system uses a **multi-agent orchestration layer** paired with **parallel workflow execution** to generate microlearning modules, phishing and smishing simulations, and email incident response reports.

**Core Philosophy:** "Resilience through layered fallbacks. Every step must have an escape route."

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│  Orchestration Layer (Router & Decision Maker)       │
│  • Analyzes User Intent (NLP)                        │
│  • Routes to 9 Specialist Agents                     │
└────────────────────┬─────────────────────────────────┘
                     │
     ┌───────┬───────┬───────┬───────┬───────┬───────┬───────┐
     ▼       ▼       ▼       ▼       ▼       ▼       ▼       ▼
  MICRO  PHISH  SMISH  POLICY USER   EMAIL  VISHING DEEPFAKE OUT-OF-
 LEARNING EMAIL  SMS    RAG   INFO    IR     CALL    VIDEO   SCOPE
   AGENT  AGENT  AGENT AGENT  AGENT  AGENT   AGENT   AGENT   AGENT
     │       │      │     │      │      │       │       │
     └───────┴──────┴─────┴──────┴──────┴───────┴───────┘
                │
                ▼
┌──────────────────────────────────────────────────────┐
│       Workflow Engine (Parallel Execution)           │
│  • Create Microlearning (8 scenes parallel)          │
│  • Create Phishing (Email + Landing Page)            │
│  • Smishing (SMS + Landing Page)                     │
│  • Email IR Analysis (Headers + Behavior + Intent)  │
│  • Vishing (ElevenLabs Voice Calls)                  │
│  • Autonomous Loop (Scheduled generation)            │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│        Storage & Infrastructure (Cloudflare)         │
│  • KV: Content storage (ml:*, phishing:*)            │
│  • D1: Vector DB for semantic search                 │
│  • Workers AI: LLM Inference (Fallback)              │
└──────────────────────────────────────────────────────┘
```

---

## 1. Middleware Layer (The Gatekeeper)

### Context Storage Middleware (`context-storage.ts`)

Every incoming request gets wrapped in **AsyncLocalStorage** for request-scoped context:

```typescript
// Every request receives:
const context = {
  correlationId: UUID,           // Unique trace ID
  timestamp: Date.now(),         // Request start time
  token?: string,                // Optional auth token
  env?: CloudflareEnv            // Cloudflare bindings
}
```

**Purpose:**
- Isolate data per request (no cross-request contamination)
- Enable automatic correlation ID injection into all logs
- Pass credentials through async chains without re-threading

### Rate Limiting Middleware (`rate-limit.ts`)

Sliding window counter with configurable tiers:

```
CHAT endpoint:         100 req/min
HEALTH endpoint:      300 req/min
DEFAULT:             100 req/min
```

**Response headers:**
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### GDPR Audit Middleware (`gdpr-audit.ts`)

Fire-and-forget audit for personal data endpoints (GDPR Art. 30). Runs **after** the handler — never blocks the response.

- Only triggers on paths in `GDPR.PERSONAL_DATA_PATHS` (`/api/user`, `/api/target-group`, `/api/assign`, `/api/upload`)
- Logs action, resource type, and company to `data_access_audit` (D1) with SHA-256 hash-chain
- Zero overhead on non-personal-data paths

---

## 2. Core Services Layer (The Foundation)

Located in `src/mastra/services/`, these services power the entire application.

### Key Components:
1.  **KV Service:** Abstraction layer for Cloudflare KV. Handles atomic writes, retries (`KV_MAX_RETRIES`), key namespace management, and TTL-based data retention.
2.  **Error Service:** Centralized error handling. Captures exceptions, formats them for logging, and determines HTTP status codes. See [Error Handling Pattern](#error-handling-pattern) below.
3.  **Health Service:** Diagnostics. Checks KV, D1, and audit chain integrity (lightweight hash-chain health). See `/health` in [API_REFERENCE.md](./API_REFERENCE.md).
4.  **Autonomous Service:** The "Proactive Brain". Manages the scheduling and execution of background security checks.
5.  **GDPR Service:** Audit logging (D1), deletion request tracking, data export helpers, retention policy. Includes SHA-256 hash-chain for tamper-evident records (EU AI Act Art. 12).

### Error Handling Pattern

All catch blocks use `errorService` + `logErrorInfo` for consistent logging and error codes:

```typescript
// Throw path (propagate to caller)
const errorInfo = errorService.aiModel(err.message, { step: '...', stack: err.stack });
logErrorInfo(logger, 'error', 'Message', errorInfo);
const e = new Error(err.message);
(e as Error & { code?: string }).code = errorInfo.code;
throw e;
```

```typescript
// Non-throw path (log and continue / fallback)
const errorInfo = errorService.external(err.message, { step: '...', stack: err.stack });
logErrorInfo(logger, 'warn', 'Message', errorInfo);
```

**Error Service Methods:**
- `auth()` – token/auth failures
- `validation()` – input/schema validation
- `external()` – external API failures
- `aiModel()` – LLM generation/parsing failures
- `notFound()` – resource not found
- `timeout()` – timeouts
- `internal()` – unexpected internal errors

**Result:** 5xx responses include `errorCode` for support tracing. See `docs/API_REFERENCE.md` for the full error code list.

---

## 3. Agent Layer (Specialist Squad)

### Orchestrator Agent (The Dispatcher)
- **Role:** Router.
- **Logic:** Analyzes user prompts -> Routes to specific agent.
- **State:** Stateless.

### 1. Microlearning Agent (The Teacher)
- **Role:** Generates 5-minute security training modules.
- **Mechanism:** Strict 4-State Machine (Gather -> Summary -> Execute -> Complete).
- **Safety:** Never executes before explicit user confirmation (State 2 -> 3).

### 2. Phishing Email Agent (The Attacker)
- **Role:** Designs realistic phishing simulations (Emails & Landing Pages).
- **Features:**
    - uses **Cialdini's 6 Principles** (Reciprocity, Urgency, etc.).
    - Generates **person-specific** attacks based on user info.
    - **Safe-Guards:** Never uses real personal identifiers in final output.

### 3. Smishing SMS Agent (The SMS Simulator)
- **Role:** Designs realistic smishing simulations (SMS & Landing Pages).
- **Features:**
    - Generates short SMS templates with link placeholders.
    - Uses department-aware scenarios (delivery, HR, IT access, payments).
    - **Safe-Guards:** Never uses real personal identifiers in final output.

### 4. User Info Agent (The Profiler)
- **Role:** Analyzes user risk profile.
- **Input:** User activity timeline, department, past incidents.
- **Output:** Risk Score (Low/Med/High) & Recommended Training Level.

### 5. Policy Summary Agent (The Librarian)
- **Role:** Summarizes complex security policies.
- **Usage:** RAG-based lookup. Fetches relevant policy docs and condenses them for other agents to use as context.

### 6. Email IR Analyst (The Incident Responder)
- **Role:** Automated incident response for suspicious emails.
- **Usage:** Performs header/body/intent analysis, triages the email, and generates a SOC-ready report.

### 8. Deepfake Video Agent (The Visual Simulator)
- **Role:** Generates deepfake awareness training videos via HeyGen.
- **Usage:** Creates realistic AI-generated video content for security awareness training scenarios.
- **Features:**
    - Avatar and voice selection via HeyGen API.
    - Async video generation with status polling (`/deepfake/status/:videoId`).

### 9. Out-of-Scope Agent (The Boundary Guard)
- **Role:** Polite scope boundary. Handles requests outside the security awareness domain.
- **Usage:** Orchestrator routes here when the request is clearly out-of-scope (billing, IT helpdesk, general knowledge, etc.).
- **Behavior:** Does NOT answer the question. Acknowledges limitation, lists what the system CAN help with, suggests contacting support.
- **Safety:** Prevents hallucination and misleading responses on topics the system has no verified information for.

### Direct API Agents (Non-Orchestrator)

These agents are invoked directly via dedicated API endpoints, not through the Orchestrator.

**Phishing Template Fixer** (`POST /phishing/template-fixer`) — Split into 3 specialized agents:
- **emailRewriter:** Normalizes phishing email HTML (Outlook compatibility, structure fixes) and classifies metadata (tags, difficulty, from_address, subject).
- **emailClassifier:** Classifies landing page templates (tags, difficulty, domain).
- **phishingLandingPageClassifier:** Dedicated landing page analysis and classification.

**Report Agent** (`reportAgent`) — Generates structured reports. Invoked via the platform report system, not through chat.

**Total Agent Count:** 13 (9 orchestrator-routed + 3 template fixer + 1 report).

---

## 4. Workflow Execution Layer

Workflows handle the heavy lifting. They are **long-running, resilient, and parallel**.

### A. Autonomous Workflow (New!)
**Purpose:** Scheduled background generation.
- **Trigger:** Cron or API.
- **Logic:**
    1. Iterate all users/groups.
    2. Check **Frequency Policy** (e.g., "Max 1 training per week").
    3. If eligible, trigger `Microlearning` or `Phishing` agents.
    4. **Unique Threading:** Uses `phishing-{userId}-{timestamp}` to ensure fresh context.

### B. Create Microlearning Workflow
**Purpose:** Generate full training module.
- **Steps:**
    1. **Analyze:** Extract topic/language.
    2. **Generate Structure:** 8 Scenes (Intro, Goals, Video, Quiz, etc.).
    3. **Enhance:** Parallel generation of content for all 8 scenes.
    4. **Inbox:** Generate simulated email/sms for the scenario.
    5. **Save:** Atomic write to KV (`ml:{id}:base`).

### C. Create Phishing Workflow
**Purpose:** Generate a full attack simulation.
- **Steps:**
    1. **Analyze:** Determine vector (Email/SMS) and tactic (Urgency/Curiosity).
    2. **Generate Email:** Subject, Body, Custom Headers.
    3. **Generate Landing:** Login page or Success page.
    4. **Save:** Atomic write to KV (`phishing:{id}:*`).

### D. Create Smishing Workflow
**Purpose:** Generate a full SMS-based simulation.
- **Steps:**
    1. **Analyze:** Determine scenario, sender style, and method.
    2. **Generate SMS:** 2-4 short messages with link placeholders.
    3. **Generate Landing:** Login/Info page if enabled.
    4. **Save:** Atomic write to KV (`smishing:{id}:*`).

### E. Email IR Analysis Workflow
**Purpose:** Produce a full incident response report for a suspicious email.
- **Steps:**
    1. **Fetch:** Retrieve email from API by ID.
    2. **Analyze:** Parallel header + behavioral + intent analysis.
    3. **Triage:** Categorize (Phishing, CEO Fraud, Benign, etc.).
    4. **Report:** Risk level, confidence, and recommended actions.

### F. Add Language / Multiple Languages
**Purpose:** Localization.
- **Logic:** Parallel translation of existing content.
- **Resilience:** Uses 3-level translation fallback (Direct -> Integrity Check -> Auto-Repair).

---

## 5. Storage Architecture (KV Schema)

### Microlearning
```
ml:{id}:base           -> Core metadata & structure
ml:{id}:lang:{code}    -> Translated content (e.g., tr-TR, en-GB)
ml:{id}:inbox:{dept}   -> Department-specific inbox simulation
```

### Phishing
```
phishing:{id}:base     -> Simulation metadata
phishing:{id}:email    -> Email template content
phishing:{id}:landing  -> Landing page content
```

### Smishing
```
smishing:{id}:base     -> Simulation metadata
smishing:{id}:sms      -> SMS template content
smishing:{id}:landing  -> Landing page content
```

### Autonomous Memory
```
autonomous:threads:{id} -> Conversation history
autonomous:policy:{id}  -> Frequency tracking (last_run_time)
```

---

## 6. Content Quality Pipeline

### 6.1 Threat Intelligence Enhancer

Static JSON-based threat context (`threat-intelligence.json`, 27 categories) injected into LLM prompts to ensure training content reflects real-world threats.

**File:** `src/mastra/services/threat-intelligence-service.ts`

**3-Layer Filtering (Sequential with Fallback):**

| Layer | Filter | Example |
|-------|--------|---------|
| 1. Role | Department keywords (Finance → vendor/invoice/wire) | Finance user sees payment fraud scenarios |
| 2. Difficulty | Score 1-5 based on signal keywords | Beginner gets obvious red flags, Advanced gets subtle impersonation |
| 3. Custom Focus | User's custom requirements (stop words excluded) | "vendor invoice" → vendor-related scenarios only |

**Adaptive Output:**
- Technique count: Beginner=2, Intermediate=3, Advanced=5
- Scenario count: Beginner=1, Intermediate=2, Advanced=3
- Tone: Beginner/Intermediate=casual, Advanced=formal/urgent (random)
- Token budget: ~50-80 tokens (compressed for gpt-oss-120b MoE)

**Safety:** If filtering removes all scenarios, falls back to unfiltered. Threat context enhances user parameters — never overrides them.

### 6.2 Localization Quality Pipeline

3-layer quality assurance for non-English content:

```
Scene Rewriter (gpt-oss-120b, temp 0.4)
    → Cultural Adaptation (currency, dates, names, number formats)
    → Anti-translationese (concrete calque examples)
    → Language-specific rules (per-language injection)
        ↓
Post-Rewrite QC (GPT-5.4-mini for enhanced languages)
    → 7-point checklist:
       1. Untranslated English
       2. Neighboring language contamination
       3. Quoted English in scenarios
       4. Terminology inconsistency
       5. Grammar errors
       6. Translationese patterns (calque detection)
       7. Cultural adaptation gaps (currency, dates)
    → Patches corrections back into JSON via dot-bracket path
```

**Model Selection for QC:**
- Major languages (en, de, fr, es, tr, ar, ja, ko, etc.): gpt-oss-120b (base model)
- Enhanced languages (he, mk, sq, az, km, lo, cy, sw, etc.): **GPT-5.4-mini** (~6x cheaper than GPT-5.1, same quality)
- See `ENHANCED_QC_LANGUAGES` in `post-rewrite-qc.ts` for full list

**Language-Specific Rules:**
- Per-language style rules injected into both rewriter and QC prompts
- Hebrew example: Anti-translationese patterns ("Know that X" → "דעו ש" forbidden, use direct statement)
- Add language-specific patterns only when quality issues are observed (data-driven, not preemptive)

**Measured Impact (Hebrew):**
- Before pipeline: 6.5/10 (literal calques, wrong currency, grammar errors)
- After pipeline: 9/10 (native phrasing, ₪ currency, correct grammar)

---

## 7. Resilience Strategy (The "Safety Net")

Reliability is baked into the core via a **3-Level Fallback Pattern**:

1.  **Level 1 (Ideal):** Try the most sophisticated method (e.g., Semantic Search, Vector DB).
2.  **Level 2 (Heuristic):** If L1 fails/timeouts, use smart heuristics (e.g., Keyword matching).
3.  **Level 3 (Hardcoded):** If L2 fails, fallback to safe defaults (e.g., "General Security" topic).

**Result:** The system almost *never* crashes. It just degrades gracefully.

---

## 8. Critical Configurations

| Constant | Value | Purpose |
|----------|-------|---------|
| `AGENT_CALL_TIMEOUT_MS` | 90,000 | Standard timeout for simple chats |
| `LONG_RUNNING_AGENT_TIMEOUT_MS` | **600,000** | **10 Mins.** for Microlearning/Autonomous tasks |
| `KV_MAX_RETRIES` | 10 | High retry count for eventual consistency |

**Deployment:**
- Runtime: Cloudflare Workers
- AI: OpenAI (`gpt-4o-mini` default) + Workers AI (Backup)

## 9. Model Costing & Selection

| Use Case | Model | Cost (per MTok) | Why |
|----------|-------|-----------------|-----|
| Scene generation (8 scenes) | gpt-oss-120b (Workers AI) | ~Free (CF Workers) | MoE, good diversity at temp 0.75-0.9 |
| Scene localization | gpt-oss-120b | ~Free | Semantic rewrite, temp 0.4 |
| Post-rewrite QC (major langs) | gpt-oss-120b | ~Free | Base model sufficient for en/de/fr/es/tr/ar |
| Post-rewrite QC (enhanced langs) | **GPT-5.4-mini** | $0.40/$1.60 | Hebrew, Swahili, etc. — nuanced judgment needed |
| Prompt analysis | gpt-oss-120b | ~Free | Structured extraction, temp 0.7 |
| Default agents | GPT-5.1 | Higher | Strong instruction following |
| Refinement/routing | GPT-5.4-mini | $0.40/$1.60 | Fast reasoning, intermediate complexity |
| Extraction (brand, metadata) | gpt-oss-120b | ~Free | Pure JSON extraction, temp 0.1 |

**Cost optimization (March 2026):** QC for enhanced languages switched from GPT-5.1 to GPT-5.4-mini — same quality, ~6x cost reduction. Validated on Hebrew (9/10 quality maintained).
