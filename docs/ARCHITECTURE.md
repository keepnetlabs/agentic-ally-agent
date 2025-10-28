# System Architecture

Deep dive into how Agentic Ally works technically.

## High-Level Architecture

```
┌──────────────┐
│  User Input  │
│  (via /chat) │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         AI Agent (agentic-ally)         │
│  - Conversational interface             │
│  - State machine (4 states)             │
│  - Language detection (12 languages)    │
│  - gpt-4o-mini powered                  │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│     Workflow Executor Tool              │
│  - Routes: create-microlearning         │
│  - Routes: add-language                 │
│  - Manages parallel execution           │
└──────┬──────────────────────────────────┘
       │
       ├─────────────────────┬─────────────────────┐
       │                     │                     │
       ▼                     ▼                     ▼
   ┌────────────┐    ┌────────────────┐    ┌──────────────┐
   │ Analyze    │    │ Generate Base  │    │ (Sequential) │
   │ Prompt     │    │ Structure      │    │              │
   └────────────┘    └────────────────┘    └──────────────┘
                            │
       ┌────────────────────┴────────────────────┐
       │                                         │
       ▼                                         ▼
   ┌─────────────────────┐        ┌──────────────────────────┐
   │ Language Content    │        │ Inbox Simulation        │
   │ Generation          │        │ (Emails + SMS)          │
   │ (8 scenes parallel) │        │ (Department-specific)   │
   │ Workers AI          │        │ Workers AI              │
   └─────────────────────┘        └──────────────────────────┘
       │                                    │
       └────────────────┬───────────────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │  Save to KV          │
              │  (fire-and-forget)   │
              └──────────────────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │  Return Training URL │
              │  Ready to Deploy     │
              └──────────────────────┘
```

## Component Details

### 1. AI Agent (agentic-ally.ts)

**Purpose:** Conversational interface with state machine enforcement

**State Machine:**
```
STATE 1: Information Gathering
  - Ask for topic/training subject
  - Ask for target department (IT, HR, Sales, etc.)
  - Ask for difficulty level (Beginner, Intermediate, Advanced)

STATE 2: Summary & Confirmation
  - Display collected information
  - Show time estimate (3-5 minutes)
  - Ask for explicit confirmation

STATE 3: Workflow Execution
  - Execute selected workflow
  - No direct tool calls
  - Manages error handling

STATE 4: Result Delivery
  - Return training URL
  - Provide usage instructions
  - End conversation
```

**Key Features:**
- Detects user language automatically (12 languages)
- Responds in user's language
- Memory persistence via threadId
- No tool calls until STATE 2 complete
- Streaming responses for real-time UI updates

**LLM Model:** OpenAI gpt-4o-mini
**Memory:** Mastra Memory + ThreadID

---

### 2. Workflow Executor Tool

**Purpose:** Routes and executes workflows with streaming responses

**Input Parameters:**
```typescript
{
  workflowType: 'create-microlearning' | 'add-language',
  prompt?: string,
  department?: 'IT' | 'HR' | 'Sales' | 'Finance' | 'Operations' | 'Management' | 'All',
  level?: 'Beginner' | 'Intermediate' | 'Advanced',
  additionalContext?: string,
  customRequirements?: string,
  existingMicrolearningId?: string,      // For add-language
  targetLanguage?: string,                // For add-language
}
```

**Output:**
- `success: boolean`
- `data: { trainingUrl, title, microlearningId }`
- `error?: string`

**Streaming Signal:**
- Sends `::ui:canvas_open::{url}` for frontend integration

---

### 3. Workflows (2 Total)

#### A. Create-Microlearning Workflow

**Sequential Steps:**

1. **Analyze User Prompt** (3-5 seconds)
   - Extracts: language, topic, title, department, level, learning objectives
   - Uses: ExampleRepo semantic search with 3-level fallback
   - Returns: PromptAnalysis object

2. **Generate Microlearning Structure** (5-8 seconds)
   - Creates 8-scene metadata
   - Generates: title, category, theme, scientific evidence
   - Returns: MicrolearningContent with skeleton scenes

3. **[PARALLEL] Language Content Generation** (15-20 seconds)
   - Calls scene generators in parallel:
     - Scene 1: Introduction (3 highlights)
     - Scene 2: Learning Goals (3-4 objectives)
     - Scene 3: Video Scenario (video + transcript)
     - Scene 4: Action Items (4 steps)
     - Scene 5: Quiz (knowledge check)
     - Scene 6: Survey (feedback)
     - Scene 7: Nudge (behavior trigger)
     - Scene 8: Summary (takeaways + URLs)
   - Uses: Cloudflare Workers AI (gpt-oss-120b)

4. **[PARALLEL] Inbox Structure Creation** (3-5 seconds)
   - Generates 4 email variants (ObviousPhishing, SophisticatedPhishing, CasualLegit, FormalLegit)
   - Department-aware context
   - Includes SMS text variants
   - Uses: Workers AI

5. **Save to KV** (Fire-and-forget)
   - Saves base: `ml:{id}:base`
   - Saves language: `ml:{id}:lang:{lang}`
   - Saves inbox: `ml:{id}:inbox:{dept}:{lang}`
   - Doesn't block response

**Total Time:** 25-35 seconds

#### B. Add-Language Workflow

**Sequential Steps:**

1. **Load Existing Microlearning**
   - Fetches from KV: `ml:{id}:base`
   - Validates structure

2. **Translate Language Content** (Multi-level retry)
   - Translates all 8 scenes
   - Preserves structure (scene objects, arrays)
   - Protects: HTML tags, URLs, IDs, types
   - Context-aware translation (titles, descriptions, interactive elements)
   - Retry logic: 3 attempts with validation
   - Uses: Workers AI

3. **Update Department Inboxes**
   - Regenerates emails in target language
   - Validates corruption detection
   - Auto-corrects malformed JSON

4. **Save to KV**
   - Same structure as create workflow
   - Fire-and-forget

---

### 4. Tools (21 Total)

#### Main Tools (9)

1. **analyze-user-prompt-tool.ts**
   - Input: userPrompt, additionalContext, suggestedDepartment, level
   - Output: PromptAnalysis (15+ fields)
   - Fallbacks: semantic → sampling → basic

2. **generate-microlearning-json-tool.ts**
   - Generates base structure with metadata
   - Creates 8 scene skeletons
   - Static scientific evidence

3. **translate-language-json-tool.ts**
   - Translates structures while preserving format
   - Path-based extraction
   - Protected key patterns

4. **generate-language-json-tool.ts**
   - Orchestrates 8 scene generators
   - Parallel execution
   - Parallel inbox generation

5. **create-inbox-structure-tool.ts**
   - Generates simulated emails/texts
   - Department-specific content
   - Multiple difficulty levels

6. **knowledge-search-tool.ts** *(Currently unused)*
   - Semantic search in KV
   - Example repository search
   - Would enable "find similar training"

7. **workflow-executor-tool.ts** *(Main orchestrator)*
   - Routes workflows
   - Manages streaming
   - Error handling

8. **model-providers.ts** *(Not a tool, utility)*
   - LLM routing and configuration
   - gpt-4o-mini for agent
   - Workers AI for content

#### Scene Generators (8)

Each generates prompt for one scene:
- scene1-intro-generator.ts
- scene2-goal-generator.ts
- scene3-video-generator.ts (uses video-selector)
- scene4-actionable-generator.ts
- scene5-quiz-generator.ts
- scene6-survey-generator.ts
- scene7-nudge-generator.ts
- scene8-summary-generator.ts (uses url-resolver)

#### Inbox Generators (4)

- inbox-email-base.ts - System prompt template
- inbox-email-variants.ts - Email types
- inbox-emails-orchestrator.ts - Parallel generation
- inbox-texts-generator.ts - SMS variants

---

### 5. Services (4 Total)

#### KVService
- **Purpose:** Cloudflare KV REST API wrapper
- **Methods:** put, get, delete, list, search
- **Key Convention:** `ml:{id}:{type}:{lang}`
- **Features:** Regex + semantic search

#### MicrolearningService
- **Purpose:** In-memory cache for reads
- **Methods:** storeMicrolearning, storeLanguageContent, assignMicrolearningToDepartment
- **Pattern:** Singleton with Map-based cache
- **Fallback:** Remote API if not in memory

#### ExampleRepo
- **Purpose:** Semantic search with embeddings
- **Features:** D1 database caching, loading from disk
- **Methods:** searchTopK, getSmartSchemaHints, getSchemaHints
- **Caching:** Embeddings in D1, loaded once per instance

#### RemoteStorageService
- **Purpose:** Backup KV-backed API persistence
- **Methods:** saveMicrolearning, saveLanguageFile, saveInboxEmails
- **Pattern:** Fire-and-forget HTTP POST
- **Base URL:** `REMOTE_STORAGE_URL` env var

---

### 6. Data Model

#### MicrolearningContent (Top-Level)
```typescript
{
  microlearning_id: string;          // slug format: phishing-101
  microlearning_metadata: {
    title: string;
    category: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    language_availability: string[];
    department_relevance: Record<string, number>;
    duration: number;                 // minutes
    theme: { fontFamily, colors, logo };
    scientific_evidence: {
      learning_theories: string[];
      behavioral_psychology: string[];
      research_sources: string[];
    };
  };
  scenes: [Scene1, Scene2, ..., Scene8];
}
```

#### LanguageContent (Per Language)
```typescript
{
  microlearning_id: string;
  language: string;                   // BCP-47: en-GB, tr-TR
  scenes: [
    { language_content: string; },
    // ... 8 scenes
  ];
  app_texts: {                        // UI localization
    loading: string;
    nextSection: string;
    // ... 50+ strings
  };
}
```

#### KV Storage Convention
```
ml:phishing-101:base
  → MicrolearningContent

ml:phishing-101:lang:en
ml:phishing-101:lang:tr
ml:phishing-101:lang:de
  → LanguageContent per language

ml:phishing-101:inbox:it:en
ml:phishing-101:inbox:hr:tr
  → DepartmentInbox per dept/language
```

---

## Data Flow Example

```
User: "Create phishing training for IT department, Intermediate level"

1. Agent STATE 1: Topic ✓, Department ✓, Level ✓ → STATE 2
2. Agent STATE 2: Shows summary → Wait for confirmation
3. User: "Start"
4. Agent STATE 3: Call workflow-executor-tool
5. Workflow Executor routes to create-microlearning-workflow
6. Analyze Prompt:
   ├─ Language: en (detected from input)
   ├─ Topic: Phishing Prevention
   ├─ Department: IT
   ├─ Level: intermediate
   └─ Learning Objectives: [...4 items...]
7. Generate Structure:
   └─ Base MicrolearningContent with 8 scene skeletons
8. [PARALLEL EXECUTION]:
   ├─ Scene 1-8 generation (Workers AI) → LanguageContent
   └─ Email/SMS generation (Workers AI) → DepartmentInbox
9. Save to KV:
   ├─ ml:phishing-101:base
   ├─ ml:phishing-101:lang:en
   ├─ ml:phishing-101:inbox:it:en
10. Send UI signal:
   └─ ::ui:canvas_open::https://microlearning.pages.dev/?baseUrl=...
11. Agent STATE 4: Return result
```

---

## Error Handling & Resilience

### 3-Level Fallback Pattern

Applied to critical operations:

```typescript
// Example: Language Detection
try {
  // Level 1: Semantic search (smart, slow)
  language = await exampleRepo.getSmartSchemaHints();
} catch {
  try {
    // Level 2: Sampling (degraded, faster)
    language = await exampleRepo.getSmartSchemaHints(undefined);
  } catch {
    // Level 3: Character detection (basic, guaranteed)
    language = detectLanguageFallback(text);
  }
}
```

### Specific Patterns

| Operation | L1 | L2 | L3 |
|-----------|----|----|-----|
| Language Detection | Semantic search | Sampling | Char patterns |
| Prompt Analysis | AI extraction | Smart sampling | Basic defaults |
| Translation | Full AI translation | Smart retry | Structure fixup |
| JSON Parsing | Parse → validate | jsonrepair library | Fallback structure |

---

## Performance Characteristics

**Optimal Workflow Timing:**
- Analyze: 2-5 seconds
- Generate structure: 5-8 seconds
- Scene generation (parallel): 15-20 seconds
- Inbox generation (parallel): 3-5 seconds
- Save (async): <1 second
- **Total:** 25-35 seconds

**Bottlenecks:**
- Workers AI queue/availability
- OpenAI API latency
- KV eventual consistency (5-second wait intentional)

---

## Security & Compliance

- **Compute:** Cloudflare Workers (no data leaves edge)
- **Storage:** Cloudflare KV (encrypted at rest)
- **Database:** Cloudflare D1 (SQLite, isolated)
- **Credentials:** Environment variables only
- **API Keys:** Never logged or exposed
- **Compliance:** Tracks metadata for audit trails

---

## Multi-Language Architecture

**Detection & Routing:**
```
User Input → Character pattern detection → BCP-47 normalization
  ├─ Turkish: ş, ğ, ı, ö, ç → tr-TR
  ├─ Arabic: ا, ب, ت → ar-AR
  ├─ Chinese: 中, 文 → zh-CN
  └─ Default: en-GB
```

**Translation Strategy:**
- User language auto-detected
- Content generated in target language
- Translations via add-language workflow
- All 12 languages supported

---

## Infrastructure (Cloudflare Workers)

```
┌─────────────────────────────────────┐
│   Cloudflare Workers (Edge)         │
├─────────────────────────────────────┤
│ ├─ agentic-ally agent               │
│ ├─ Workflow orchestration           │
│ ├─ Tool execution                   │
│ └─ Response streaming               │
├─────────────────────────────────────┤
│ Bindings:                           │
│ ├─ KV: MICROLEARNING_KV             │
│ ├─ D1: agentic_ally_embeddings      │
│ ├─ D1: agentic_ally_memory          │
│ └─ AI: Workers AI Gateway           │
└─────────────────────────────────────┘
       │
       ├─→ OpenAI API (gpt-4o-mini)
       └─→ Cloudflare Workers AI (gpt-oss-120b)
```

---

**Last Updated:** October 27, 2025

See also:
- [WORKFLOWS.md](./WORKFLOWS.md) - Detailed workflow walkthrough
- [DATA_MODEL.md](./DATA_MODEL.md) - Complete data structures
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Infrastructure setup
