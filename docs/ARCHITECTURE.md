# Architecture Documentation

## System Overview

Agentic Ally is built on the **Mastra** framework and deployed on **Cloudflare Workers**. The system uses a **strict 4-state conversational agent** paired with **parallel workflow execution** to generate microlearning modules.

**Core Philosophy:** "Resilience through layered fallbacks. Every step must have an escape route."

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│               HTTP Request (POST /chat)              │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│     Middleware Layer (Context & Rate Limiting)       │
│  • AsyncLocalStorage for request-scoped context      │
│  • Auto-generate correlation ID                      │
│  • Rate limiting with X-RateLimit-* headers          │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│      Microlearning Agent (4-State Machine)           │
│  • STATE 1: Gather topic, dept, level               │
│  • STATE 2: Show summary + time estimate             │
│  • STATE 3: Execute workflow on confirmation         │
│  • STATE 4: Return training URL                      │
└────────────────────┬─────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
    CREATE WORKFLOW        ADD-LANGUAGE
    (Parallel Gen)         WORKFLOW
```

---

## 1. Middleware Layer

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
CHAT endpoint:         50 req/min
HEALTH endpoint:      300 req/min
DEFAULT:             100 req/min
```

**Response headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699999999999
Retry-After: 42 (if rate-limited)
```

---

## 2. Agent Layer (Routing + Specialist Execution)

### Orchestrator Agent (Router)

The **Orchestrator Agent** acts as the intelligent router:

- **Analyzes** user requests and conversation context
- **Identifies** which specialist agent should handle the task:
  - `userInfoAssistant` - User analysis & risk assessment
  - `microlearningAgent` - Training creation & management (4-state machine)
  - `phishingEmailAssistant` - Phishing simulation creation & testing
- **Routes** with task context for precision handling
- **Design:** Stateless routing with explicit history analysis

### Specialist Agents

#### 1. Microlearning Agent (State Machine)

Handles training module creation with strict 4-state progression:

### 4-State Enforcement

The agent implements strict state progression:

```
STATE 1: GATHER
├─ User provides: "Create phishing training"
├─ Agent asks for missing info: department, level
└─ Collects structured data

     ↓ (only proceed after STATE 1 complete)

STATE 2: SUMMARY
├─ Display: topic, dept, level, time estimate
├─ Show: what will be generated
└─ Prompt: "Ready to proceed?" or "Modify?"

     ↓ (only proceed after explicit confirmation)

STATE 3: EXECUTE
├─ Launch workflow (create-microlearning OR add-language)
├─ Show progress
└─ Wait for completion

     ↓ (only proceed after STATE 3 complete)

STATE 4: COMPLETE
├─ Return training URL
├─ Show: metadata (language, dept, level)
└─ Offer: "Want another?" or "Translate?"
```

### Key Constraint

**No tools execute before STATE 2 completion + explicit user confirmation.**

This ensures:
- ✅ User confirms requirements before processing
- ✅ No surprise API calls
- ✅ Clear cost visibility (time estimate shown)
- ✅ Prevents accidental generation

#### 2. Phishing Email Agent (Psychological Profiler)

Designs and executes realistic phishing email simulations:

- **Analyzes** target user profiles (risk factors, vulnerabilities)
- **Applies** Cialdini's 6 Principles (Reciprocity, Commitment, Social Proof, Authority, Liking, Scarcity)
- **Generates** context-aware phishing scenarios (e.g., Invoice for Finance dept, Policy change for HR)
- **Maintains** PII privacy (no real names in outputs)
- **Supports** customizable difficulty levels and psychological triggers

#### 3. User Info Agent (Risk Analyst)

Analyzes user profiles and recommends training levels:

- **Fetches** user details from system
- **Analyzes** user timeline and vulnerability patterns
- **Recommends** risk level assessment
- **Suggests** appropriate training level (Beginner, Intermediate, Advanced)
- **Provides** context for microlearning agent's smart defaults

#### 4. Reasoning Tool (Universal)

All agents support psychological reasoning:

- **Analyzes** decision rationale before major actions
- **Anonymous** language (no PII in reasoning)
- **Transparent** thinking process
- **Consistent** decision framework

---

## 3. Workflow Execution Layer

### Two Main Workflows

#### A. CREATE-MICROLEARNING Workflow

**Purpose:** Generate new training module from scratch

**Flow:**
```
1. ANALYZE step
   ├─ Language detection (NLP)
   ├─ Topic extraction
   ├─ Learning objectives
   ├─ Department relevance
   └─ Difficulty inference

2. GENERATE step
   ├─ Create 8-scene metadata
   ├─ Generate theme + branding
   ├─ Create compliance framework
   └─ Parallel: language content (8 scenes)

3. [PARALLEL] Language Generation
   ├─ Scene 1: Intro
   ├─ Scene 2: Goals
   ├─ Scene 3: Video scenario
   ├─ Scene 4: Actionable items
   ├─ Scene 5: Knowledge quiz
   ├─ Scene 6: Feedback survey
   ├─ Scene 7: Behavioral nudge
   └─ Scene 8: Summary

4. [PARALLEL] Inbox Generation
   ├─ Department-specific emails
   ├─ SMS variants
   ├─ Realistic phishing scenarios
   └─ Interactive inbox simulation

5. SAVE step
   ├─ Wait for KV consistency
   ├─ Save: ml:{id}:base
   ├─ Save: ml:{id}:lang:{code}
   ├─ Save: ml:{id}:inbox:{dept}:{code}
   └─ Return training URL

Total time: 25-35 seconds (due to parallel execution)
```

#### B. ADD-LANGUAGE Workflow

**Purpose:** Translate existing training to new language

**Flow:**
```
1. LOAD step
   ├─ Fetch base from KV
   ├─ Validate structure
   ├─ Extract all 8 scenes
   └─ Load inbox variants

2. LOCALIZE step (3-level)
   ├─ Attempt 1: Direct translation
   ├─ Attempt 2: If corruption detected → retry + auto-fix
   ├─ Attempt 3: If still failing → basic translation fallback
   └─ Preserve: URLs, IDs, HTML tags, types

3. LOCALIZE INBOXES
   ├─ Per-department emails in target language
   ├─ Maintain original structure
   └─ Validate no corruption

4. SAVE step
   ├─ ml:{id}:lang:{newCode}
   ├─ ml:{id}:inbox:{dept}:{newCode}
   └─ Return URL with new language

Total time: 15-25 seconds
```

---

## 4. Storage Architecture

### KV Key Convention

```
ml:{microlearning_id}:base
├─ Microlearning metadata
├─ Theme info
├─ 8 scenes (all languages point here for structure)
└─ Scientific evidence + compliance framework

ml:{microlearning_id}:lang:{code}
├─ Language-specific scene content
├─ {code} = BCP-47 code (en, tr, de, ja, zh-cn, ar, etc.)
└─ Complete translated 8 scenes

ml:{microlearning_id}:inbox:{dept}:{code}
├─ Department-specific simulated inbox
├─ {dept} = IT, HR, Sales, Finance, Operations, Management, All
├─ {code} = Language code
└─ Phishing emails + SMS variants
```

### Why This Structure?

- ✅ **Deduplication:** Base scene structure stored once
- ✅ **Efficiency:** Per-language overrides only store translations
- ✅ **Isolation:** Department inboxes separate by role
- ✅ **Enumerable:** Can list all trainings: `ml:*:base`
- ✅ **Atomic:** Each save is independent (no distributed transactions)

---

## 5. Constants & Timing

### TIMING Constants (`constants.ts`)

All timing values consolidated to avoid magic numbers:

```typescript
export const TIMING = {
  KV_RETRY_DELAY_MS: 500,           // Delay between KV retries
  KV_MAX_RETRIES: 10,               // Max KV read attempts
  ASSIGN_PRE_DELAY_MS: 3000,        // Delay before assignment
  PHISHING_WORKFLOW_DELAY_MS: 3000, // Delay before phishing workflow
  IMAGE_FETCH_TIMEOUT_MS: 5000,     // Image fetch timeout
  IMAGE_VALIDATION_TIMEOUT_MS: 3000, // Image validation timeout
  LLM_TIMEOUT_MS: 30000,            // LLM call timeout
  STREAMING_TIMEOUT_MS: 120000,     // Stream response timeout
}
```

### LIMITS Constants

```typescript
export const LIMITS = {
  CONTEXT_WINDOW_SIZE: 10,  // Previous messages in context
}
```

**Why constants?**
- ✅ Single source of truth
- ✅ Easy to tune performance
- ✅ No scattered magic numbers
- ✅ Enables A/B testing

---

## 6. Error Handling Strategy

### 3-Level Fallback Pattern

Every major operation has 3 escape routes:

**Example: Semantic Analysis**
```
Level 1: Try semantic search (high quality)
   ↓ (if fails)
Level 2: Try sampling approach (medium quality)
   ↓ (if fails)
Level 3: Use basic defaults (guaranteed result)
   Result: System never crashes
```

**Example: JSON Parsing**
```
Level 1: Direct JSON.parse()
   ↓ (if fails)
Level 2: Use jsonrepair library (auto-fix)
   ↓ (if fails)
Level 3: Extract data from response text manually
   Result: Always recovers corrupted JSON
```

**Example: Translation**
```
Level 1: Translate with full context
   ↓ (if fails or corrupts)
Level 2: Retry with corruption guards
   ↓ (if still fails)
Level 3: Auto-correct + fallback translation
   Result: Always completes translation
```

---

## 7. Tools Architecture

### 18 Total Tools

**Main Tools (9):**
1. `analyze-user-prompt-tool` - Intent analysis + language detection
2. `generate-microlearning-tool` - Create 8-scene metadata
3. `translate-language-tool` - Translate content to target language
4. `generate-language-tool` - Generate translated scenes
5. `create-inbox-tool` - Generate simulated inbox
6. `workflow-executor-tool` - Route & execute workflows
7. `upload-training-tool` - Save to KV
8. `assign-training-tool` - Assign to users
9. `code-review-check-tool` - Validate code fixes (Scene 4)

**Scene Generators (8):**
- `scene1-intro-generator`
- `scene2-goals-generator`
- `scene3-video-generator`
- `scene4-actionable-generator`
- `scene5-quiz-generator`
- `scene6-survey-generator`
- `scene7-nudge-generator`
- `scene8-summary-generator`

**Inbox Generators (4):**
- `email-base-generator` - Core emails
- `email-variants-generator` - Variations
- `emails-orchestrator-tool` - Coordinate emails
- `texts-generator` - SMS variants

---

## 8. Data Flow Diagram

```
User → /chat endpoint
  ↓
Request Middleware (AsyncLocalStorage + Rate Limit)
  ↓
Microlearning Agent (State Machine)
  ├─ STATE 1: Gather requirements
  ├─ STATE 2: Show summary
  ├─ STATE 3: Execute workflow
  │   ├─ Route: CREATE or ADD-LANGUAGE
  │   ├─ [PARALLEL] Language generation (8 scenes)
  │   ├─ [PARALLEL] Inbox generation
  │   ├─ Consistency check → Save to KV
  │   └─ Return metadata
  ├─ STATE 4: Complete
  └─ Return training URL
    ↓
Response → User
```

---

## 9. Deployment Architecture

### Cloudflare Workers

**Compute Runtime:**
- Serverless execution
- Auto-scaling
- Edge locations worldwide
- ~50ms cold start

### Storage Stack

| Component | Purpose | Limit |
|-----------|---------|-------|
| **KV** | Microlearning storage | Unlimited (per account) |
| **D1** | Embedding cache + memory | 1GB SQLite per database |
| **Workers AI** | Free LLM inference | 10K requests/day free tier |

---

## 10. Configuration & Environment

### Required Env Variables

```bash
# Cloudflare
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_KV_TOKEN
CLOUDFLARE_API_KEY
CLOUDFLARE_AI_GATEWAY_ID
CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY
CLOUDFLARE_D1_DATABASE_ID

# OpenAI (for gpt-4o-mini agent)
OPENAI_API_KEY

# Optional
GOOGLE_GENERATIVE_AI_API_KEY
MASTRA_MEMORY_URL
MASTRA_MEMORY_TOKEN
LOG_LEVEL  # Default: 'info'
RATE_LIMIT_MAX_REQUESTS  # Default: 100
RATE_LIMIT_WINDOW_MS     # Default: 60000
```

---

## 11. Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| **Create microlearning** | 25-35 sec | Parallel execution |
| **Add language** | 15-25 sec | Translation + inbox |
| **KV write** | ~100 ms | Per save operation |
| **KV read (retry)** | ~500-5000 ms | Up to 10 retries |
| **LLM generation** | 5-15 sec | Depends on model |
| **Cold start** | ~50 ms | Workers edge compute |

---

## 12. Security Model

### Request Context Isolation
- ✅ Per-request AsyncLocalStorage
- ✅ No global state contamination
- ✅ Credentials never logged
- ✅ Token extracted from header, not body

### Rate Limiting
- ✅ IP-based identification (Cloudflare-aware)
- ✅ Sliding window counter
- ✅ Health check bypass
- ✅ Standard X-RateLimit headers

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Framework** | Mastra 0.1.x |
| **Runtime** | Cloudflare Workers |
| **Compute** | Serverless (Edge) |
| **Storage** | KV + D1 |
| **Language** | TypeScript 5.x |
| **Agent** | OpenAI gpt-4o-mini |
| **LLM Fallback** | Cloudflare Workers AI |
| **Logger** | PinoLogger |
| **HTTP Server** | Hono |

---

**Last Updated:** December 18, 2025
**Key Updates:** State machine clarification, middleware layers (context + rate limiting), logging architecture, constants consolidation, 3-level fallback strategy
