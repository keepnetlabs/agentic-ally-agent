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
│  • Routes to 8 Specialist Agents                     │
└────────────────────┬─────────────────────────────────┘
                     │
     ┌───────┬───────┼───────┬───────┬───────┐
     ▼       ▼       ▼       ▼       ▼       ▼
  MICRO  PHISH  SMISH  POLICY USER   EMAIL   VISHING
 LEARNING  EMAIL  SMS   RAG    INFO    IR     CALL
   AGENT   AGENT  AGENT AGENT  AGENT  AGENT   AGENT
     │       │      │     │      │      │       │
     └───────┴──────┴─────┴──────┴──────┴───────┘
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

---

## 2. Core Services Layer (The Foundation)

Located in `src/mastra/services/`, these services power the entire application.

### Key Components:
1.  **KV Service:** Abstraction layer for Cloudflare KV. Handles atomic writes, retries (`KV_MAX_RETRIES`), and key namespace management.
2.  **Error Service:** Centralized error handling. Captures exceptions, formats them for logging, and determines HTTP status codes. See [Error Handling Pattern](#error-handling-pattern) below.
3.  **Health Service:** Diagnostics. Checks connectivity to OpenAI, Cloudflare KV, and other dependencies.
4.  **Autonomous Service:** The "Proactive Brain". Manages the scheduling and execution of background security checks.

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

## 6. Resilience Strategy (The "Safety Net")

Reliability is baked into the core via a **3-Level Fallback Pattern**:

1.  **Level 1 (Ideal):** Try the most sophisticated method (e.g., Semantic Search, Vector DB).
2.  **Level 2 (Heuristic):** If L1 fails/timeouts, use smart heuristics (e.g., Keyword matching).
3.  **Level 3 (Hardcoded):** If L2 fails, fallback to safe defaults (e.g., "General Security" topic).

**Result:** The system almost *never* crashes. It just degrades gracefully.

---

## 7. Critical Configurations

| Constant | Value | Purpose |
|----------|-------|---------|
| `AGENT_CALL_TIMEOUT_MS` | 90,000 | Standard timeout for simple chats |
| `LONG_RUNNING_AGENT_TIMEOUT_MS` | **600,000** | **10 Mins.** for Microlearning/Autonomous tasks |
| `KV_MAX_RETRIES` | 10 | High retry count for eventual consistency |

**Deployment:**
- Runtime: Cloudflare Workers
- AI: OpenAI (`gpt-4o-mini` default) + Workers AI (Backup)
