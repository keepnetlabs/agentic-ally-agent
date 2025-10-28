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
├── agents/agentic-ally.ts              # State machine agent (state 1→4)
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
| `agentic-ally.ts` | Agent with state machine enforcement |
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

## 🎓 Language Support (12)

English (en), Turkish (tr), German (de), French (fr), Spanish (es), Portuguese (pt), Italian (it), Russian (ru), Chinese (zh), Japanese (ja), Arabic (ar), Korean (ko)

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
// https://microlearning.pages.dev/?baseUrl=...&langUrl=lang/en&isEditMode=true

// Frontend listens for ::ui:canvas_open:: prefix and opens editor
```

---

## 💡 Common Tasks

### Add New Tool
1. Create `src/mastra/tools/{action}-{object}-tool.ts`
2. Define Zod input/output schemas
3. Implement execute() with 3-level fallbacks
4. Register in `agentic-ally.ts` tools object
5. Return `{success, data, error, metadata}`

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

---

## 🔮 Architecture Philosophy

> "Resilience through layered fallbacks. Every step must have an escape route."

- Semantic search fails? → Use sampling
- Sampling fails? → Use basic hints
- Translation fails? → Retry with guards
- Retry fails? → Auto-correct
- **Result:** System never crashes, quality degrades gracefully

---

**Last Updated:** October 27, 2025
**Compatibility:** Mastra 0.1.x, TypeScript 5.x, Cloudflare Workers
**See Also:** `.cursorrules` for code standards and best practices
