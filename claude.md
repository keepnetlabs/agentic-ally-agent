# Agentic Ally - Claude Code Guide

## 🎯 Project Overview
AI-powered microlearning content generation platform on Cloudflare Workers. Automatically creates 8-scene interactive training modules for cybersecurity/compliance.

**Stack:** Mastra (agent framework) → Cloudflare Workers → KV + D1

---

## 📂 Directory Structure

```
src/mastra/
├── agents/              # AgenticAlly agent (gpt-4o-mini)
├── tools/              # 21 tools (9 main + 8 scene + 4 inbox)
│   ├── Main Tools (9):
│   │   ├── analyze-user-prompt-tool.ts        (user intent analysis)
│   │   ├── generate-microlearning-json-tool   (content structure)
│   │   ├── translate-language-json-tool       (translation)
│   │   ├── generate-language-json-tool        (language content)
│   │   ├── create-inbox-structure-tool        (orchestrates inbox generation)
│   │   ├── knowledge-search-tool              (semantic search)
│   │   ├── universal-content-generator        (generic content)
│   │   ├── workflow-executor-tool             (main orchestrator)
│   │   └── workflow-tool.ts                   (utility)
│   │
│   ├── scene-generators/ (8):
│   │   ├── scene1-intro-generator.ts          (introduction)
│   │   ├── scene2-goal-generator.ts           (learning goals)
│   │   ├── scene3-video-generator.ts          (video scenario)
│   │   ├── scene4-actionable-generator.ts     (action items)
│   │   ├── scene5-quiz-generator.ts           (knowledge check)
│   │   ├── scene6-survey-generator.ts         (feedback)
│   │   ├── scene7-nudge-generator.ts          (behavior nudge)
│   │   └── scene8-summary-generator.ts        (recap)
│   │
│   └── inbox-generators/ (4):
│       ├── inbox-email-base.ts                (email template)
│       ├── inbox-email-variants.ts            (variations)
│       ├── inbox-emails-orchestrator.ts       (orchestration)
│       └── inbox-texts-generator.ts           (text generation)
├── workflows/          # 2 workflows
│   ├── create-microlearning-workflow     (analyze → generate → [lang||inbox] → save)
│   └── add-language-workflow             (load → translate → update inbox)
├── services/
│   ├── kv-service.ts                     (Cloudflare KV REST wrapper)
│   ├── microlearning-service.ts          (in-memory cache + remote fallback)
│   ├── example-repo.ts                   (semantic search)
│   └── remote-storage-service.ts
├── types/
│   ├── microlearning.ts                  (MicrolearningContent interface)
│   └── prompt-analysis.ts
├── schemas/            # Zod validation
├── utils/              # Helpers (language, JSON, video selection)
└── index.ts            # Main entry: /chat + /health endpoints
```

---

## 🔑 Core Concepts

### Agent Flow (State Machine)
```
STATE 1: Gather info (topic, dept, level)
STATE 2: Show summary with time estimate + confirm
STATE 3: Execute workflow on confirmation
STATE 4: Return training URL
```

### Workflow Architecture
```
CREATE WORKFLOW:
  Analyze Prompt → Generate Microlearning → [Parallel: Language + Inbox] → Save KV

ADD-LANGUAGE WORKFLOW:
  Load Existing → Translate (3-level retry) → Update Inbox (retry + correction) → Save
```

### Data Model
- **8-Scene Structure:** Intro → Goals → Video → Actions → Quiz → Survey → Nudge → Summary
- **KV Format:** `ml:{id}:{type}:{lang}`
  - `ml:phishing-101:base` = metadata
  - `ml:phishing-101:lang:en` = English content
  - `ml:phishing-101:inbox:it:tr` = IT dept Turkish emails
- **Metadata:** title, category, dept_relevance, role_relevance, compliance, ethical_policy, etc.

---

## 🚀 Key Files to Know

| File | Purpose | Key Pattern |
|------|---------|------------|
| `workflow-executor-tool.ts` | **MAIN TOOL** - Execute workflows | Detects workflow type, runs async, streams UI signals |
| `analyze-user-prompt-tool.ts` | Parse user intent | 3-level fallback (semantic → sampling → basic) |
| `create-microlearning-workflow.ts` | Main content generation | Parallel: language + inbox |
| `add-language-workflow.ts` | Add language to existing | Triple-retry with validation + auto-correction |
| `model-providers.ts` | LLM routing | gpt-4o-mini (agent) + Workers AI (generation) |
| `agentic-ally.ts` | Main agent | Strict state machine enforcement |

---

## 🛠️ Development Commands

```bash
npm run dev              # Local dev with Mastra CLI
npm run build            # Build for production
npm run deploy           # Deploy to Cloudflare Workers
```

**Local Testing:**
```bash
# POST http://localhost:8000/chat
# Body: { "prompt": "Create phishing training for IT" }
```

---

## ⚡ Quick Workflow Understanding

### How Microlearning is Created (25 seconds)

```
User: "Create phishing awareness training"
  ↓
Agent analyzes intent:
  - language: en
  - topic: Phishing Prevention
  - department: All
  - level: Intermediate
  ↓
Step 1 (2s): Analyze prompt
Step 2 (8s): Generate 8-scene structure + metadata
  ↓ [PARALLEL]
  Step 3a (5s): Generate English language content
  Step 3b (3s): Generate phishing email inbox
  ↓ [END PARALLEL]
Step 4: Save all to KV (fire-and-forget, no wait)
  ↓
Return: Training URL ready in editor
  https://microlearning.pages.dev/?baseUrl=...&langUrl=lang/en&isEditMode=true
```

---

## 📊 Data Model Quick Ref

```typescript
// Input to workflows
{
  prompt: "Create phishing training",
  department?: "IT" | "HR" | "Sales" | "Finance" | "Operations" | "Management" | "All",
  level?: "Beginner" | "Intermediate" | "Advanced",
  additionalContext?: string,
  customRequirements?: string
}

// AnalyzeUserPrompt output
{
  language: "en",
  topic: "Phishing Prevention",
  title: "Stop Phishing Attacks",
  department: "All",
  level: "intermediate",
  learningObjectives: ["Spot phishing emails", "Report suspicious emails"],
  duration: 5,
  industries: ["General"],
  roles: ["All Roles"],
  keyTopics: ["Email security", "Red flags"],
  // ... 10 more fields
}

// Final microlearning in KV
ml:{id}:base = {
  microlearning_id: "phishing-101",
  microlearning_metadata: { title, category, department_relevance, ... },
  scientific_evidence: { learning_theories, behavioral_psychology, ... },
  theme: { fontFamily, colors, logo },
  scenes: [ 8 scene objects ]
}

ml:{id}:lang:en = { scene content in English }
ml:{id}:inbox:it:en = [ array of phishing emails ]
```

---

## 🔗 Integration Points

- **OpenAI API:** gpt-4o-mini for agent/conversation
- **Cloudflare Workers AI:** gpt-oss-120b for content generation (local)
- **Cloudflare KV:** Microlearning storage (namespace: `c96ef0b5a2424edca1426f6e7a85b9dc`)
- **Cloudflare D1:** Agent memory + embedding cache (2 databases)
- **Remote API:** `https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev` (fallback)

---

## 🎓 Language Support

**12 languages supported** - auto-detected from user message:
```
Turkish (tr):      ş, ğ, ı, ö, ç chars
German (de):       ä, ö, ü, ß chars
French (fr):       àáâäèéêë chars
Spanish (es):      áéíóúñü chars
Portuguese (pt):   àáâãäåæçèéê chars
Italian (it):      àáäèéëì chars
Russian (ru):      а-я Cyrillic
Chinese (zh):      CJK Unicode range
Japanese (ja):     Hiragana/Katakana
Arabic (ar):       Arabic script
Korean (ko):       Hangul
English (en):      Default fallback
```

---

## ⚙️ Environment Variables

```
# Required for core functionality
CLOUDFLARE_ACCOUNT_ID              # Cloudflare account ID
CLOUDFLARE_KV_TOKEN                # KV API token for REST access
CLOUDFLARE_API_KEY                 # General Cloudflare API key
CLOUDFLARE_AI_GATEWAY_ID           # AI Gateway instance name
CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY  # Gateway auth bearer token
CLOUDFLARE_D1_DATABASE_ID          # D1 database ID for memory/embeddings

# LLM Provider Keys
OPENAI_API_KEY                     # OpenAI API key (required for gpt-4o-mini)
GOOGLE_GENERATIVE_AI_API_KEY       # Optional, for Gemini fallback
CLOUDFLARE_WORKERS_API_TOKEN       # Optional, defaults to CLOUDFLARE_API_KEY

# Optional - for remote memory storage
MASTRA_MEMORY_URL                  # LibSQL/Turso database URL (optional)
MASTRA_MEMORY_TOKEN                # LibSQL/Turso auth token (optional)
```

---

## 🔧 Workflow Executor Tool - DEEP DIVE

**File:** `src/mastra/tools/workflow-executor-tool.ts`

This is the **main orchestration tool** called by the agent. It routes to either workflow and manages streaming responses to frontend.

### Input Schema
```typescript
{
  workflowType: 'create-microlearning' | 'add-language',

  // For create-microlearning:
  prompt: string,                    // User request (required)
  additionalContext?: string,        // Extra context
  customRequirements?: string,       // Special requests
  department?: string,               // IT|HR|Sales|Finance|Operations|Management|All (default: 'All')
  level?: 'Beginner'|'Intermediate'|'Advanced',  // Default: 'Intermediate'
  priority?: 'low'|'medium'|'high',  // Default: 'medium'

  // For add-language:
  existingMicrolearningId?: string,  // ID to translate
  targetLanguage?: string,           // Target language code
  sourceLanguage?: string            // Source language (default: 'en')
}
```

### Execution Flow

#### CREATE-MICROLEARNING Path (Lines 34-220)

```
1. Validate prompt exists
2. Get workflow instance: createMicrolearningWorkflow
3. Create run: workflow.createRunAsync()
4. Start workflow with inputData
   ├─ Analyze prompt
   ├─ Generate microlearning
   ├─ [Parallel] Language + Inbox
   └─ Save to KV
5. Extract data from result
   ├─ trainingUrl (the important part!)
   ├─ title
   ├─ department
   ├─ microlearningId
6. Send UI signal to frontend
   └─ ::ui:canvas_open::{trainingUrl}
7. Return success response
```

**Key Code:**
```typescript
const workflowResult = await run.start({
  inputData: {
    prompt: params.prompt!,
    additionalContext: params.additionalContext,
    customRequirements: params.customRequirements,
    department: params.department || 'All',
    level: params.level || 'Intermediate',
    priority: params.priority || 'medium'
  }
});

// Extract training URL (lines 189-194)
if (workflowResult.status === 'success' && workflowResult.result?.metadata) {
  trainingUrl = workflowResult.result.metadata.trainingUrl;
  title = workflowResult.result.metadata.title;
  department = workflowResult.result.metadata.department;
  microlearningId = workflowResult.result.metadata.microlearningId;
}

// Send to frontend via streaming writer (lines 202-210)
await writer?.write({
  type: 'text-delta',
  delta: `::ui:canvas_open::${trainingUrl}\n`
});
```

#### ADD-LANGUAGE Path (Lines 222-264)

```
1. Validate existingMicrolearningId + targetLanguage required
2. Get workflow instance: addLanguageWorkflow
3. Create run
4. Start workflow with inputData
   ├─ Load existing microlearning
   ├─ Translate language content (triple-retry)
   └─ Update inbox (retry + correction)
5. Extract data from result
   ├─ trainingUrl (with new lang)
   ├─ title
   ├─ targetLanguage
6. Send UI signal with new URL
7. Return success
```

### The UI Signal Pattern

**How frontend gets the URL:**

```typescript
// Tool sends signal (line 208)
delta: `::ui:canvas_open::${trainingUrl}\n`

// Example URL:
// ::ui:canvas_open::https://microlearning.pages.dev/?baseUrl=https%3A%2F%2Fapi.workers.dev%2Fmicrolearning%2Fphishing-101&langUrl=lang%2Fen&inboxUrl=inbox%2Fit&isEditMode=true

// Frontend listens for this pattern and opens editor
```

**Note:** Lines 41-162 contain commented-out **streaming progress updates** (an incomplete feature):
- Was trying to add real-time step-by-step progress
- Would emit emoji + reason for each step as it completes
- Currently disabled (commented out)
- Could be re-enabled for better UX

### Error Handling (Lines 270-289)

```typescript
catch (error) {
  // Send error to frontend
  await writer?.write({
    type: 'text-delta',
    delta: `❌ ${error.message}\n`
  });

  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  };
}
```

### Key Observations

✅ **What's Good:**
- Clean separation of create vs add-language logic
- Streaming responses with `writer.write()`
- UI signal pattern is elegant (prefix-based detection)
- Error messages sent to frontend
- UUID for message IDs (prevents conflicts)

⚠️ **What Could Be Better:**
- No timeout on `run.start()` (could hang indefinitely)
- Lines 41-162: Incomplete streaming progress feature (dead code)
- No validation that workflow result has expected structure
- Error message at line 278 hardcoded "Translation failed" (wrong for create-microlearning)

### How Agent Calls This

From **agentic-ally.ts** instructions:
```
When user confirms "Start":
  → Call workflowExecutorTool with:
    - workflowType: 'create-microlearning'
    - prompt: [user's full request]
    - department: [collected value]
    - level: [collected value]
    - additionalContext: [if provided]
    - customRequirements: [if provided]
```

---

## 💡 Common Tasks

### Add a new language to training
```
User: "Translate to Turkish"
  ↓
Workflow: add-language-workflow
  - Input: microlearning_id, targetLanguage: 'tr'
  - Loads existing training
  - Translates all scenes
  - Updates department inboxes
  - Returns new training URL with ?langUrl=lang/tr
```

### Change scene generation
Look in `src/mastra/tools/scene{N}-generator-tool.ts`
- Each scene has own tool
- All use Workers AI for content
- Scene-specific prompts in tool

### Modify agent behavior
Edit `src/mastra/agents/agentic-ally.ts`
- Instructions: lines 9-146
- State machine enforcement: lines 54-86
- Tool calls in workflow-executor

---

## 🎯 Quick Reference: Error Handling Patterns

| Pattern | Where | Benefit |
|---------|-------|---------|
| **3-level fallback** | `analyzeUserPromptTool` | Semantic → Sampling → Basic |
| **JSON repair** | All LLM responses | Handles malformed AI output |
| **Multi-level retry** | `add-language-workflow` | Graceful translation recovery |
| **Fire-and-forget KV** | Final step | Doesn't block response |
| **Corruption detection** | Inbox translation | Catches bad data early |

---

## 📝 When Modifying Code

**Rule 1:** State machine (agent) must stay strict
- No tool calls before: topic + dept + level + confirmation

**Rule 2:** Workflows are sequential + parallel mix
- Can add parallel steps, don't remove parallelization

**Rule 3:** KV keys follow `ml:` prefix convention
- Enables efficient listing and organization

**Rule 4:** All LLM outputs need validation + repair
- Always use `cleanResponse()` on AI JSON

**Rule 5:** Tools must have 3-level error recovery
- Primary method → Fallback → Guaranteed basic

---

## 🔮 Architecture Philosophy

> "Resilience through layered fallbacks. Every step must have an escape route."

- Semantic search fails? → Use sampling
- Sampling fails? → Use basic hints
- Translation fails? → Retry with guards
- Retry fails? → Auto-correct
- Result: System never crashes, quality degrades gracefully

---

**Last Updated:** October 24, 2025
**Maintainer Notes:** Cloudflare KV 5-second consistency wait is intentional. Semantic search fallbacks are critical for reliability.
