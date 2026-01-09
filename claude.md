# Agentic Ally - Project Guide

## 🎯 Quick Start

**Platform:** AI-powered microlearning generation on Cloudflare Workers
**Stack:** Mastra (agent) → TypeScript → Cloudflare Workers/KV/D1
**Purpose:** Generates 8-scene interactive cybersecurity training modules
**Core Flow:** User → Agent (state machine) → Workflow → [Parallel: Language + Inbox] → KV → Training URL

---

## 📂 Core Structure

```
src/mastra/
├── agents/microlearning-agent.ts       # State machine agent (state 1→4)
├── tools/                              # 18 tools (9 main + 8 scene + 4 inbox)
│   ├── Main: analyze-prompt, generate-microlearning, translate-language,
│   │   generate-language, create-inbox, workflow-executor
│   ├── Scene: scene1-intro through scene8-summary
│   └── Inbox: email-base, email-variants, emails-orchestrator, texts
├── workflows/                          # 2 workflows
│   ├── create-microlearning-workflow   # Analyze → Generate → [Lang||Inbox] → Save
│   └── add-language-workflow           # Load → Translate → Update Inbox
├── services/                           # 4 services
│   ├── kv-service.ts                   # Cloudflare KV REST API
│   ├── microlearning-service.ts        # In-memory cache
│   ├── example-repo.ts                 # Semantic search + D1 embeddings
│   └── remote-storage-service.ts       # Backup persistence
├── types/ & schemas/                   # TypeScript + Zod validation
├── utils/                              # Helpers (language, video, URL, JSON)
└── index.ts                            # Endpoints: /chat, /health
```

---

## 🔑 Key Concepts

### Agent State Machine (Strict)
```
STATE 1: Gather topic, department, level
STATE 2: Show summary + time estimate (HTML template)
STATE 3: Execute workflow on user confirmation
STATE 4: Return training URL
```
**Rule:** Never call tools before STATE 2 complete + explicit confirmation.

### Workflow Architecture
```
CREATE-MICROLEARNING:
  1. Analyze user prompt (language detection + intent)
  2. Generate 8-scene metadata structure
  3. [PARALLEL] Language content generation (8 scenes)
  3. [PARALLEL] Inbox structure (emails/texts)
  4. Save to KV (fire-and-forget, no wait)

ADD-LANGUAGE:
  1. Load existing microlearning from KV
  2. Translate all scenes (multi-level retry)
  3. Update department inboxes
  4. Save to KV
```

### Data Model
- **8 Scenes:** Intro → Goals → Video → Actions → Quiz → Survey → Nudge → Summary
- **KV Keys:** `ml:{id}:base` | `ml:{id}:lang:{lang}` | `ml:{id}:inbox:{dept}:{lang}`
- **PromptAnalysis Output:** language, topic, title, department, level, category, learningObjectives, duration, industries, roles, keyTopics, etc.

---

## 🚀 Critical Files

| File | Purpose |
|------|---------|
| `workflow-executor-tool.ts` | Main orchestrator - routes create vs add-language workflows |
| `analyze-user-prompt-tool.ts` | Parses user intent (3-level fallback: semantic → sampling → basic) |
| `create-microlearning-workflow.ts` | Orchestrates all generation steps |
| `add-language-workflow.ts` | Translation with 3-level retry + auto-correction |
| `microlearning-agent.ts` | Agent with state machine enforcement |
| `model-providers.ts` | LLM routing (gpt-4o-mini for agent, Workers AI for content) |

---

## 🛠️ Development

```bash
npm run dev              # Local dev with Mastra CLI
npm run build            # Build for production
npm run deploy           # Deploy to Cloudflare Workers
```

**Test locally:**
```bash
# POST http://localhost:8000/chat
# Body: { "prompt": "Create phishing training for IT" }
```

---

## 📊 Complete Data Example

```typescript
// Workflow input
{ prompt: "Create phishing training", department: "IT", level: "Intermediate" }

// PromptAnalysis (from analyze-user-prompt-tool)
{
  language: "en",
  topic: "Phishing Prevention",
  title: "Stop Phishing Attacks",
  department: "IT",
  level: "intermediate",
  learningObjectives: ["Spot phishing emails", "Report suspicious"],
  duration: 5,
  industries: ["General"],
  roles: ["All Roles"],
  keyTopics: ["Email security", "Red flags"]
}

// Final in KV: ml:phishing-101:base
{
  microlearning_id: "phishing-101",
  microlearning_metadata: { title, category, level, language_availability, ... },
  scientific_evidence: { theories, psychology, sources },
  theme: { fontFamily, colors, logo },
  scenes: [Scene1, Scene2, ..., Scene8]
}

// In KV: ml:phishing-101:lang:en
{ scenes with English content, app_texts in English }

// In KV: ml:phishing-101:inbox:it:en
{ simulated phishing emails for IT dept in English }
```

---

## 🔗 Integration Points

- **OpenAI API:** gpt-4o-mini for agent conversation
- **Cloudflare Workers AI:** gpt-oss-120b for content generation
- **Cloudflare KV:** Main storage (namespace: `c96ef0b5a2424edca1426f6e7a85b9dc`)
- **Cloudflare D1:** Agent memory + embedding cache (2 databases)
- **Remote API:** Fallback storage at `https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev`

---

## 🎓 Language Support

**All languages supported** (unlimited - auto-detect and generate in any language)

**Detection:** Character patterns → BCP-47 normalization
**Strategy:** Auto-detect user language → generate in target language → support translation via add-language workflow

---

## ⚙️ Environment Variables

```
# Required
CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_KV_TOKEN, CLOUDFLARE_API_KEY
CLOUDFLARE_AI_GATEWAY_ID, CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY
CLOUDFLARE_D1_DATABASE_ID
OPENAI_API_KEY

# Optional
GOOGLE_GENERATIVE_AI_API_KEY, MASTRA_MEMORY_URL, MASTRA_MEMORY_TOKEN
```

---

## 🔧 Workflow Executor Deep Dive

**File:** `src/mastra/tools/workflow-executor-tool.ts`

### Input Schema
```typescript
{
  workflowType: 'create-microlearning' | 'add-language',
  // CREATE-MICROLEARNING:
  prompt: string,
  additionalContext?: string,
  customRequirements?: string,
  department?: 'IT'|'HR'|'Sales'|'Finance'|'Operations'|'Management'|'All',
  level?: 'Beginner'|'Intermediate'|'Advanced',
  // ADD-LANGUAGE:
  existingMicrolearningId?: string,
  targetLanguage?: string,
  sourceLanguage?: string
}
```

### Execution Flow (CREATE-MICROLEARNING)
1. Validate prompt exists
2. Get workflow instance
3. Create async run
4. Start workflow with inputData
5. Extract trainingUrl from result
6. Send UI signal: `::ui:canvas_open::{trainingUrl}`
7. Return success response

### Execution Flow (ADD-LANGUAGE)
1. Validate existingMicrolearningId + targetLanguage
2. Get workflow instance
3. Start workflow
4. Extract trainingUrl with new language
5. Send UI signal
6. Return success

### UI Signal Pattern
```typescript
// Tool sends signal
delta: `::ui:canvas_open::${trainingUrl}\n`

// Example URL:
// https://agentic-ai-microlearning.keepnetlabs.com/?baseUrl=...&langUrl=lang/en&isEditMode=true

// Frontend listens for ::ui:canvas_open:: prefix and opens editor
```

---

## 🔧 Code Review Check Tool Deep Dive

**File:** `src/mastra/tools/code-review-check-tool.ts`

### Purpose
Validates if a developer correctly fixed a code issue (security vulnerability, logic error, performance problem, etc.). AI acts as pragmatic code reviewer - accepts ANY valid solution that solves the problem, not just "best-practice" approaches.

### Input Schema
```typescript
{
  issueType: string,                    // "SQL Injection", "XSS", "Logic Error", etc.
  originalCode: string,                 // Code with the vulnerability/issue
  fixedCode: string,                    // Developer's attempted fix
  language: string,                     // "javascript", "python", "java", etc.
  outputLanguage?: string,              // Default: "en" (all languages supported)
  modelProvider?: 'OPENAI' | 'WORKERS_AI' | 'GOOGLE',
  model?: string,                       // Model name override
}
```

### Output Schema
```typescript
{
  success: boolean,
  data: {
    isCorrect: boolean,                 // Does fix properly address the issue?
    severity: 'correct' | 'partial' | 'incorrect',
    feedback: string,                   // 1-2 sentence immediate feedback (in outputLanguage)
    explanation: string,                // 2-3 sentence detailed explanation (in outputLanguage)
    points: number,                     // 0-25 points earned
    hint?: string,                      // Solution-oriented hint if incorrect (in outputLanguage)
  },
  error?: string
}
```

### Scoring Logic
| Result | Points |
|--------|--------|
| Correct fix | 25 points |
| Partial fix | 10 points |
| Incorrect fix | 0 points |

### Multi-Language Support
- **Supported Languages:** All languages (unlimited - auto-detect and generate in any language)
- **Input Detection:** Parses `outputLanguage` parameter directly
- **Output:** All feedback, explanation, and hint are in requested language
- **System Prompt:** Includes language directive for AI

### Key Features
- **Pragmatic Review:** Accepts ANY valid solution (doesn't require best-practice)
- **Functional Focus:** Only checks if issue is solved + code works + no new issues
- **Multi-Language Feedback:** Returns guidance in learner's language
- **Hint-Oriented:** If incorrect, provides actionable hint toward solution (not just "wrong")
- **JSON Repair:** Uses `cleanResponse()` to fix malformed JSON from AI
- **Consistent:** Temperature 0.3 for consistency + low variance

### Validation Criteria (What "Correct" Means)
1. ✅ Issue is properly resolved (problem no longer exists)
2. ✅ Code is functional (doesn't break existing logic)
3. ✅ No new critical issues are introduced
4. ✅ Any valid solution approach is accepted

### What Doesn't Matter
- Code style or formatting
- Using "best-practice" patterns
- Code elegance or optimization
- Following specific conventions

### Error Handling
- **Success case:** Always returns hint (empty string if AI didn't provide one)
- **Error case:** Returns empty hint + error message
- **AI parsing:** Uses cleanResponse() to repair malformed JSON
- **Graceful degradation:** Returns error response rather than crashing

### Example Usage (Turkish Output)
```typescript
// Request
{
  issueType: "SQL Injection",
  originalCode: "SELECT * FROM users WHERE id = " + userInput,
  fixedCode: "SELECT * FROM users WHERE id = ?",  // Using parameterized query
  language: "javascript",
  outputLanguage: "tr"  // Turkish
}

// Response
{
  success: true,
  data: {
    isCorrect: true,
    severity: "correct",
    feedback: "Harika! Parametreli sorgu kullanarak SQL injection zafiyetini kapattınız.",
    explanation: "Orijinal kod doğrudan kullanıcı girdisini SQL sorgusuna katıyordu. Parametreli sorgular girdinin veriye karıştırılmasını engeller.",
    points: 25,
    hint: ""
  }
}
```

### Integration Points
- **Used in:** Scene 4 (Actionable Items) - developers submit code fixes
- **Called by:** Scene 4 actionable generator tool
- **AI Model:** Uses same provider as workflow (can override)
- **Language Detection:** From workflow context + explicit parameter

### Related Files
| File | Purpose |
|------|---------|
| `scene-generators/scene4-code-review-generator.ts` | Generates Scene 4 with code review scenarios |
| `scene-rewriters/scene4-actionable-rewriter.ts` | Translates code review scenarios |
| `model-providers.ts` | AI model routing |
| `content-processors/json-cleaner.ts` | JSON repair utility |

---

## 🎨 Landing Page Normalization Pipeline

**File:** `src/mastra/utils/content-processors/phishing-html-postprocessors.ts`

The landing page post-processor applies normalizations in strict order to ensure consistent rendering:

1. **Sanitization** - Removes dangerous HTML/JS elements
2. **Repair** - Fixes malformed HTML (unbalanced tags, broken nesting)
3. **Logo Centering** - Wraps circular icons in centered flex containers
4. **Form/Container Centering** - Enforces max-width and margin rules
5. **Document Structure** - Ensures valid HTML5 shell

### Key Normalizers

| Normalizer | Problem Solved | Example |
|-----------|----------------|---------|
| `normalizeLandingLogoCentering()` | Circular logo/icons generated without centering | Wraps `<div>icon</div>` in flex container with `justify-content: center` |
| `enforceMinimalLayoutMaxWidth()` | Forms missing `max-width` entirely (minimal layouts) | Injects `max-width: 400px; width: 100%; margin: 0 auto;` on `<form>` elements |
| `normalizeLandingMaxWidthCentering()` | Existing max-width but missing margin centering | Adds `margin: 0 auto;` to containers with max-width |
| `normalizeLandingFormCentering()` | Forms in card layouts need proper spacing | Adjusts padding and alignment within containers |

### Order Matters
Logo centering MUST run BEFORE form/container centering to avoid conflicts. All sanitization/repair runs BEFORE normalization (don't fix broken HTML).

---

## 🔧 Tool Output Format

**Convention:** All user-management and assignment tools return structured outputs with metadata.

### Standard Response Format
```typescript
{
  success: boolean,
  data: {
    // Tool-specific fields
    resourceId: string,           // Unique identifier
    campaignName?: string,        // Human-readable name
    assignmentType?: string,      // USER | GROUP | etc.
    languageId?: string,          // Optional language
    followUpTrainingId?: string   // Optional related ID
  },
  message: string,                // Generated via formatToolSummary()
  metadata?: {
    duration?: number,            // Operation duration in ms
    timestamp?: string            // ISO timestamp
  },
  error?: string                  // Error message if failed
}
```

### Message Generation Pattern
Use `formatToolSummary()` helper to generate consistent, structured messages:

```typescript
import { formatToolSummary } from '../../utils/core/tool-summary-formatter';

const result = formatToolSummary({
  prefix: '✅ Campaign assigned',
  title: campaignName,
  kv: [
    { key: 'resourceId', value: resourceId },
    { key: 'targetType', value: assignmentType },
    { key: 'email', value: targetUserEmail }
  ]
});
// Output: "✅ Campaign assigned - Phishing Campaign Simulation (resourceId=[...], targetType=USER, email=[...])"
```

### Input Validation Pattern
Use `isSafeId()` to validate all resource IDs:

```typescript
import { isSafeId } from '../../utils/core/safety-validators';

const schema = z.object({
  phishingResourceId: z.string().refine(isSafeId, 'Invalid resource ID format')
});
```

---

## 📧 Email Prompt Rules Updates

**File:** `src/mastra/utils/prompt-builders/shared-email-rules.ts`

### Footer Styling (CRITICAL)
All email footers MUST use consistent styling in the `<td>` element:
```
style='text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;'
```

This ensures footers are centered, properly spaced, and use subtle gray text for authenticity.

### PII Prevention
**Rule:** No fake personal identities (names/surnames) anywhere in outputs.

- ✅ Use `{FIRSTNAME}`, `{FULLNAME}` merge tags for personalization
- ✅ Use role/team labels only: "IT Support Team", "HR Department", "Your Manager"
- ❌ Never invent personal names: "Emily Clarke", "John Smith"

### Language-Specific Greetings
Greeting rules now include culture-specific examples:

**English Examples:**
- "Dear {FIRSTNAME},"
- "Hello {FIRSTNAME},"

**Turkish Examples:**
- "Merhaba {FIRSTNAME},"
- "Sayın {FIRSTNAME},"

---

## 💡 Common Tasks

### Add New Tool
1. Create `src/mastra/tools/{action}-{object}-tool.ts`
2. Define Zod input/output schemas
3. Implement execute() with 3-level fallbacks
4. For assignment tools: Use `isSafeId()` to validate all resource IDs
5. For user-facing output: Use `formatToolSummary()` to generate structured messages
6. Register in `index.ts` (formerly agentic-ally.ts) tools object
7. Return `{success, data, error, metadata}` following standard response format

### Add New Language
1. Add code to `language-utils.ts` with character detection
2. Add UI strings to `app-texts.ts`
3. Add transcripts to `transcript-database.json` if needed
4. Test `add-language-workflow` with new code

### Debug Workflow Issues
1. Check console logs (🔍, ❌ emojis)
2. Verify state machine completion (STATE 1→4)
3. Verify KV keys match convention: `ml:{id}:{type}:{lang}`
4. Verify JSON valid (check cleanResponse() repairs)
5. Check 3-level fallbacks were attempted
6. For landing page rendering issues: Check normalizations applied in order
   - Logo/icons not centered? → `normalizeLandingLogoCentering()` before form centering
   - Forms left-aligned? → Check `enforceMinimalLayoutMaxWidth()` injects max-width
   - Spacing off? → Verify margin rules in `normalizeLandingMaxWidthCentering()`

### Translate Existing Training
```
User: "Translate to Turkish"
  ↓
Call workflow-executor with:
  - workflowType: 'add-language'
  - targetLanguage: 'tr'
  - existingMicrolearningId: 'phishing-101'
  ↓
Returns new URL with langUrl=lang/tr
```

---

## 🎯 Error Handling Patterns

| Pattern | Where | Strategy |
|---------|-------|----------|
| **3-level fallback** | analyzeUserPromptTool | semantic → sampling → basic |
| **JSON repair** | All AI responses | Use jsonrepair library |
| **Multi-retry** | add-language-workflow | Retry + validation + auto-correct |
| **Fire-and-forget** | KV saves | Don't block response |
| **Corruption detect** | Inbox translation | Validate structure preservation |

---

## 📝 Modification Rules

1. **State machine (agent) must stay strict** - No tools before STATE 2 + confirmation
2. **Parallel processing is critical** - Generate 8 scenes in parallel, not sequential
3. **KV keys use `ml:` prefix** - Enables efficient listing and organization
4. **All LLM outputs validated** - Always use `cleanResponse()` on AI JSON
5. **Tools need 3-level fallbacks** - Primary → Fallback 1 → Guaranteed basic
6. **Don't use git commands** - No git add, git commit, git push, etc. (User handles version control)
7. **Don't suggest npm run build** - Just make code changes directly; don't ask to run build commands
8. **Error responses must be standardized** - Always use `createToolErrorResponse(errorInfo)` + `logErrorInfo()` before returning
9. **URL validation is enforced** - X-BASE-API-URL header validated against whitelist, defaults to test environment

---

## 🔐 Error Format Standardization

**File:** `src/mastra/services/error-service.ts` + `src/mastra/utils/core/error-utils.ts`

### Error Response Pattern

**All error responses must follow this format:**

```typescript
// Step 1: Create error info from service
const errorInfo = errorService.validation('Email is required');

// Step 2: Log the error (optional but recommended)
logErrorInfo(logger, 'warn', 'Validation failed', errorInfo);

// Step 3: Return standardized response
return createToolErrorResponse(errorInfo);

// Returns:
{
  success: false,
  error: JSON.stringify({
    code: "ERR_VAL_001",
    message: "Email is required",
    category: "VALIDATION",
    retryable: false,
    suggestion: "Please check your input and try again with valid data.",
    nextStep: "Ask user to provide missing or correct the invalid information.",
    details: { /* optional context */ },
    timestamp: 1704816000000
  })
}
```

### Error Categories & Codes

**File:** `src/mastra/constants.ts` (ERROR_CODES object)

All error codes are centralized and semantic:
- `ERR_AUTH_*` - Authentication/authorization failures
- `ERR_VAL_*` - Input validation errors
- `ERR_KV_*` - Cloudflare KV storage errors
- `ERR_API_*` - External API failures
- `ERR_AI_*` - AI model generation errors
- `ERR_NF_*` - Resource not found errors
- `ERR_RL_*` - Rate limiting errors
- `ERR_TO_*` - Timeout errors
- `ERR_INT_*` - Internal/unexpected errors

### Error Service Methods

```typescript
errorService.auth(message, details?, errorCode?)
errorService.validation(message, details?, errorCode?)
errorService.external(message, details?, errorCode?)
errorService.notFound(message, details?, errorCode?)
errorService.aiModel(message, details?, errorCode?)
errorService.timeout(message, details?, errorCode?)
errorService.rateLimit(message, details?, errorCode?)
errorService.internal(message, details?, errorCode?)

// Agent-decision helpers
errorService.isRetryable(error: ErrorInfo | string): boolean
errorService.parse(errorString: string): ErrorInfo | null
```

---

## 🛡️ Request Validation - Base API URL

**File:** `src/mastra/middleware/context-storage.ts` + `src/mastra/utils/core/url-validator.ts`

### URL Validation Pattern

All requests with `X-BASE-API-URL` header are validated against allowed list:

```typescript
// Allowed URLs (in constants.ts)
ALLOWED_BASE_API_URLS: [
  'https://dash.keepnetlabs.com',          // Production
  'https://test-api.devkeepnet.com',       // Test/Default
]

// Middleware validates automatically
const baseApiUrl = validateBaseApiUrl(c.req.header('X-BASE-API-URL'));
// Returns: Validated URL OR default if invalid/missing
```

### Validation Rules

1. ✅ **No header provided** → Use `DEFAULT_BASE_API_URL` (test environment)
2. ✅ **Invalid URL format** → Log warning + use default
3. ✅ **Not in whitelist** → Log warning + use default
4. ✅ **Valid & allowed** → Use provided URL
5. ✅ **Case-insensitive** → Both variants match

### Utility Functions

```typescript
// Validate and return safe URL (auto-used in middleware)
validateBaseApiUrl(headerUrl?: string): string

// Type guard for TypeScript
isAllowedBaseApiUrl(url: string): boolean

// Get allowed list (for debugging/docs)
getAllowedBaseApiUrls(): readonly string[]
```

---

## 🔮 Architecture Philosophy

> "Resilience through layered fallbacks. Every step must have an escape route."

- Semantic search fails? → Use sampling
- Sampling fails? → Use basic hints
- Translation fails? → Retry with guards
- Retry fails? → Auto-correct
- **Result:** System never crashes, quality degrades gracefully

---

**Last Updated:** January 9, 2026
**Compatibility:** Mastra 0.1.x, TypeScript 5.x, Cloudflare Workers
**See Also:** `.cursorrules` for code standards and best practices

---

### Recent Updates (Jan 9, 2026)
- **Error Format Standardization:** All error responses now use `createToolErrorResponse()` + `logErrorInfo()` pattern with centralized `ERROR_CODES` in constants.ts. Covers 8 error categories (AUTH, VALIDATION, KV, API, AI_MODEL, NOT_FOUND, RATE_LIMIT, TIMEOUT, INTERNAL)
- **URL Validation Middleware:** Added `validateBaseApiUrl()` utility to validate X-BASE-API-URL header against whitelist (production + test environments). Automatic fallback to test default on invalid/missing header
- **Request Context Integration:** baseApiUrl now extracted and validated in `context-storage.ts` middleware, available to all tools via `getRequestContext().baseApiUrl`
- **Log Redaction Enhancement:** All masking utilities in `security-utils.ts` updated to full redaction format `[REDACTED_FIELDNAME]` with support for deepRedact, maskEmail, maskPhone, maskUrlParams, maskHeaders

### Recent Updates (Jan 9, 2025)
- **Landing Page Normalizers:** Added `normalizeLandingLogoCentering()` for centering circular icon/logo divs, `enforceMinimalLayoutMaxWidth()` for injecting missing max-width on minimal layouts
- **Tool Output Format:** Standardized all assignment tools to use `formatToolSummary()` for consistent, structured user messages with metadata
- **Input Validation:** Added `isSafeId()` validation pattern for all resource ID parameters
- **Email Footer Rules:** Updated `FOOTER_RULES` to specify consistent footer styling (`text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;`)
- **PII Prevention:** Added `NO_FAKE_PERSONAL_IDENTITIES_RULES` to prevent LLM from inventing personal names anywhere in outputs
- **Language-Specific Greetings:** Enhanced `GREETING_RULES` with English and Turkish examples for culturally appropriate email greetings

### Recent Updates (Nov 7, 2025)
- **Code Review Check Tool:** Added full documentation with multi-language support, output schema includes `hint` field, `outputLanguage` parameter for non-English feedback
- **Rate Limiting:** Production-ready rate limiting middleware with sliding window algorithm, configurable limits, standard headers

---

## 🔒 Security & Rate Limiting

### Rate Limiting Middleware

**File:** `src/mastra/middleware/rate-limit.ts`

#### Features
- ✅ Sliding window counter algorithm
- ✅ IP-based identification (Cloudflare-aware)
- ✅ Configurable limits per endpoint
- ✅ Standard rate limit headers (X-RateLimit-*)
- ✅ Health check bypass
- ✅ Production-ready error handling

#### Configuration

**Environment Variables:**
```bash
RATE_LIMIT_MAX_REQUESTS=100     # Max requests per window
RATE_LIMIT_WINDOW_MS=60000      # Window size in milliseconds (default: 1 minute)
```

**Default Tiers:**
```typescript
RATE_LIMIT_TIERS = {
  CHAT: { maxRequests: 50, windowMs: 60000 },      // 50 req/min
  HEALTH: { maxRequests: 300, windowMs: 60000 },   // 300 req/min
  DEFAULT: { maxRequests: 100, windowMs: 60000 }   // 100 req/min
}
```

#### Response Headers

All responses include standard rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699999999999
Retry-After: 42  (only when rate limited)
```

#### Error Response

When rate limit exceeded (HTTP 429):
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests, please try again later.",
  "retryAfter": 42,
  "limit": 100,
  "current": 101
}
```

#### Usage Examples

**Apply globally:**
```typescript
server: {
  middleware: [
    rateLimitMiddleware({
      maxRequests: 100,
      windowMs: 60000,
      skip: (c) => c.req.path === '/health'
    })
  ]
}
```

**Endpoint-specific:**
```typescript
import { createEndpointRateLimiter } from './middleware/rate-limit';

const chatRateLimiter = createEndpointRateLimiter('CHAT');
// Apply to specific route
```

**Custom identifier (e.g., API key):**
```typescript
rateLimitMiddleware({
  identifier: (c) => c.req.header('Authorization') || getClientIdentifier(c)
})
```

#### Testing

Run tests:
```bash
npm test src/mastra/middleware/rate-limit.test.ts
```

#### Production Considerations

**Current Implementation:** In-memory store per Worker instance
- ✅ Fast (no external calls)
- ✅ Simple
- ⚠️ Not distributed (each Worker has separate counter)

**For Distributed Rate Limiting:**
Use Cloudflare KV or Durable Objects:
```typescript
// Future enhancement: KV-based rate limiting
const key = `ratelimit:${identifier}`;
const count = await env.KV.get(key);
// ... increment and check
```

#### Monitoring

Rate limit violations are logged:
```
⚠️ Rate limit exceeded: {
  identifier: "1.2.3.4",
  current: 101,
  limit: 100,
  path: "/chat",
  method: "POST"
}
```

Warnings when approaching limit:
```
📊 Rate limit warning: {
  identifier: "1.2.3.4",
  remaining: 8,
  path: "/chat"
}
```

---
