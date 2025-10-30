# System Architecture

Deep dive into how Agentic Ally works technically.

## High-Level Architecture

```
┌─────────────────────────────────────────┐
│           User Input (via /chat)        │
│  ┌─────────────────────────────────┐   │
│  │ prompt: string                  │   │
│  │ modelProvider?: OPENAI|...|GOOGLE  │
│  │ model?: model_name              │   │
│  └─────────────────────────────────┘   │
└──────────────┬────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────┐
    │   AI Agent (agentic-ally)        │
    ├──────────────────────────────────┤
    │ Model: Dynamic LLM Selection     │
    │   Default: gpt-4o                │
    │   Override: OPENAI/GOOGLE        │
    │ - State machine (4 states)       │
    │ - Dynamic language detection     │
    │ - Instruction parsing            │
    │ - Conversational interface       │
    └──────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────────────────┐
    │  Workflow Executor Tool          │
    ├──────────────────────────────────┤
    │ Route: create-microlearning      │
    │        or add-language           │
    │ Pass: modelProvider + model      │
    └──┬─────────────────────────────┬─┘
       │                             │
       ▼ CREATE WORKFLOW             ▼ ADD-LANGUAGE WORKFLOW
┌────────────────────────────┐  ┌──────────────────────┐
│ 1. Analyze Prompt          │  │ 1. Load Existing ML  │
│    (Extract: lang, topic,  │  │    (Fetch from KV)   │
│     dept, level)           │  │                      │
└────────┬───────────────────┘  └──────────┬───────────┘
         │                                 │
         ▼                                 ▼
┌────────────────────────────┐  ┌──────────────────────┐
│ 2. Generate Base Structure │  │ 2. Translate Scenes  │
│    (8 scenes + metadata)   │  │    (3-level retry)   │
└────────┬───────────────────┘  │    Preserve URLs/IDs │
         │                      │    HTML protection   │
    ┌────┴─────────────────┐    │    Corruption detect │
    │                      │    └──────────┬───────────┘
    ▼                      ▼               │
┌──────────────────┐  ┌─────────────────┐ │
│ 3a. Language     │  │ 3b. Inbox       │ │
│ Content Gen      │  │ Simulation      │ │
│ (8 scenes)       │  │ (Emails + SMS)  │ │
│                  │  │ Dept-specific   │ │
│ Model: Dynamic   │  │ Model: Dynamic  │ │
│   Def: Workers   │  │   Def: Workers  │ │
│   Override OK    │  │   Override OK   │ │
└────────┬─────────┘  └────────┬────────┘ │
         │                     │          │
         └──────────┬──────────┘          │
                    ▼                     │
         ┌──────────────────────┐         │
         │ 3. Update Inboxes    │◄────────┘
         │ (Translate to        │
         │  target language)    │
         │ (Corruption fix)     │
         └────────┬─────────────┘
                  │
         ┌────────┴───────────┐
         │                    │
         ▼                    ▼
    ┌─────────────┐    ┌──────────────┐
    │ Save to KV  │    │ Localization │
    │ - base      │    │ Store:       │
    │ - lang      │    │ - Per-lang   │
    │ - inbox     │    │ - Per-dept   │
    └──────┬──────┘    │ - BCP-47     │
           │           │   codes      │
           │           └──────────────┘
           ▼
    ┌──────────────────┐
    │ Return Training  │
    │ URL + Metadata   │
    │ Ready to Deploy  │
    └──────────────────┘
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
- Detects user language dynamically (any language via character patterns)
- Responds in user's language
- Memory persistence via threadId
- No tool calls until STATE 2 complete
- Streaming responses for real-time UI updates
- Supports model override via [Use this model: ...] prefix

**LLM Model:** OpenAI gpt-4o (can override to OPENAI_GPT_4O_MINI, GOOGLE_GEMINI_2_5_PRO, etc.)
**Memory:** Mastra Memory + ThreadID
**Model Override:** Frontend can send modelProvider + model to use alternative LLM

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
  targetLanguage?: string,                // For add-language (BCP-47: en-GB, tr-TR, etc.)
  sourceLanguage?: string,                // For add-language (auto-detected if omitted)
  modelProvider?: 'OPENAI' | 'WORKERS_AI' | 'GOOGLE',  // Optional LLM override
  model?: string,                         // Optional model name override
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
   - Extracts: language (dynamic detection), topic, title, department, level, learning objectives
   - Uses: ExampleRepo semantic search with 3-level fallback
   - Model: Uses provided modelProvider/model or defaults to gpt-oss-120b
   - Returns: PromptAnalysis object

2. **Generate Microlearning Structure** (5-8 seconds)
   - Creates 8-scene metadata
   - Generates: title, category, theme, scientific evidence
   - Model: Uses provided modelProvider/model or defaults to gpt-oss-120b
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
   - Model: Uses provided modelProvider/model or defaults to Workers AI (gpt-oss-120b)

4. **[PARALLEL] Inbox Structure Creation** (3-5 seconds)
   - Generates 4 email variants (ObviousPhishing, SophisticatedPhishing, CasualLegit, FormalLegit)
   - Department-aware context
   - Includes SMS text variants
   - Model: Uses provided modelProvider/model or defaults to Workers AI (gpt-oss-120b)

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
   - Translates all 8 scenes to target language (BCP-47 format)
   - Preserves structure (scene objects, arrays)
   - Protects: HTML tags, URLs, IDs, types
   - Context-aware translation (titles, descriptions, interactive elements)
   - Retry logic: 3 attempts with validation
   - Model: Uses provided modelProvider/model or defaults to Workers AI (gpt-oss-120b)

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
   - LLM routing and configuration with dynamic selection
   - Supports: OpenAI (gpt-4o, gpt-4o-mini, gpt-4.1, gpt-5-mini), Workers AI (gpt-oss-120b), Google Gemini (2.5-pro, 2.5-flash)
   - Default agent: gpt-4o (more reliable instruction following)
   - Default generation: Workers AI gpt-oss-120b (cost-effective)
   - Model override support with graceful fallback to defaults

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

## Multi-Language & Multi-Model Architecture

### Dynamic Language Detection

**Detection & Routing:**
```
User Input → Character pattern detection → BCP-47 normalization
  ├─ Turkish: ş, ğ, ı, ö, ç → tr-tr
  ├─ Arabic: ا, ب, ت → ar-sa
  ├─ Chinese: 中, 文 → zh-cn
  ├─ German: ä, ö, ü → de-de
  ├─ French: à, é, ù → fr-fr
  ├─ Japanese: ひらがな, カタカナ → ja-jp
  ├─ Korean: 한글 → ko-kr
  ├─ Russian: а, б, в → ru-ru
  ├─ Portuguese: ã, ç → pt-br
  ├─ Italian: à, è, ì → it-it
  ├─ Spanish: á, ñ, ü → es-es
  └─ English: Default → en-gb
```

**Translation Strategy:**
- User language auto-detected from any input
- Content generated in target language
- Translations via add-language workflow with BCP-47 codes
- Supports unlimited languages (not limited to predefined set)

### Dynamic Model Selection

**Model Provider Routing:**
```
Frontend Request → /chat endpoint → Workflow Executor
  ├─ No override: Use defaults
  │   ├─ Agent: gpt-4o (OpenAI)
  │   └─ Generation: Workers AI gpt-oss-120b
  └─ With override:
      ├─ modelProvider: OPENAI|WORKERS_AI|GOOGLE
      └─ model: specific model name
```

**Supported Models:**
- **OpenAI:** gpt-4o, gpt-4o-mini, gpt-4.1, gpt-5-nano, gpt-5-mini
- **Workers AI:** @cf/openai/gpt-oss-120b (Llama-based)
- **Google Gemini:** gemini-2.5-pro, gemini-2.5-flash

---

## Localization & Translation Architecture

### Multi-Step Translation Process

**Translation Flow:**
```
User: "Add Turkish translation"
  ↓
add-language-workflow triggered
  ├─ Load existing microlearning (en-gb base)
  ├─ Translate all 8 scenes (en-gb → tr-tr)
  │  ├─ Path-based extraction (follows scene structure)
  │  ├─ Protective key patterns (preserve IDs, URLs, types)
  │  ├─ HTML tag preservation (extract → translate → restore)
  │  └─ 3-level retry with validation
  ├─ Translate department inboxes (en-gb → tr-tr)
  │  ├─ Corruption detection
  │  ├─ Auto-correction of malformed JSON
  │  └─ Structure validation
  └─ Save to KV
     ├─ ml:{id}:lang:tr-tr (language content)
     └─ ml:{id}:inbox:{dept}:tr-tr (per-department emails)
```

### Translation Features

**Language Code Normalization (BCP-47):**
- Input: Any language identifier (en, English, en-US, EN_GB)
- Output: Normalized BCP-47 (e.g., en-gb, tr-tr, de-de)
- Storage: Always lowercase in KV for consistency
- Flexibility: Supports country-specific variants (en-us, en-gb, en-au, etc.)

**Protected Elements During Translation:**
```typescript
doNotTranslateKeys: [
  'iconName',      // Icon identifiers
  'id', 'ids',     // Unique identifiers
  'url', 'src',    // External URLs/resources
  'type',          // Data types
  'isPhishing',    // Boolean flags
  'difficulty',    // Level indicators
  'timestamp',     // Time data
  'headers',       // Email headers
  'attachments'    // File references
]
```

**Corruption Detection & Auto-Correction:**
- Detects malformed JSON in translations
- Validates structure matches source
- Auto-corrects common issues:
  - Missing quotes
  - Broken array/object nesting
  - Truncated strings
- Fallback: Uses source structure if correction fails

### Translation Quality Control

**3-Level Retry Strategy:**
```
Attempt 1: Full translation
  ├─ Success → Validate & Save
  └─ Fail → Retry with enhanced parameters

Attempt 2: Smart re-translation with protected keys
  ├─ Success → Validate & Save
  └─ Fail → Final attempt

Attempt 3: Maximum protection mode
  ├─ Additional protected keys added
  ├─ Success → Validate & Save
  └─ Fail → Structure correction + save
```

**Validation Checks:**
- Scene count matches (always 8)
- All required fields present
- Array lengths preserved
- Object structure integrity
- Language code consistency

### Localization of UI Strings

**App Texts (50+ strings per language):**
```typescript
app_texts: {
  loading: "Loading...",
  nextSection: "Next",
  previousSection: "Previous",
  startTraining: "Start Training",
  completeQuiz: "Complete Quiz",
  submitFeedback: "Submit Feedback",
  congratulations: "Congratulations!",
  // ... 50+ more strings
}
```

**Localized Per Language:**
- `ml:{id}:lang:en-gb` → English UI strings
- `ml:{id}:lang:tr-tr` → Turkish UI strings
- `ml:{id}:lang:de-de` → German UI strings
- etc.

### Department-Specific Localization

**Inbox Content Localization:**
```
Email types localized per department:
- ml:{id}:inbox:it:en-gb   → IT department, English
- ml:{id}:inbox:it:tr-tr   → IT department, Turkish
- ml:{id}:inbox:hr:de-de   → HR department, German
- ml:{id}:inbox:sales:fr-fr → Sales department, French
```

**Email Variants:**
1. **Obvious Phishing** - Clear red flags
2. **Sophisticated Phishing** - Subtle, professional-looking
3. **Casual Legitimate** - Friendly internal communication
4. **Formal Legitimate** - Official business email

Each variant translated to target language while preserving:
- Subject line authenticity
- Email header structure
- Phishing/legitimate classification
- Department-specific context

### Translation Fallback Strategy

**Handling Missing Translations:**
```
User requests language: de-de
KV lookup: ml:{id}:lang:de-de
  ├─ Found → Use it ✓
  ├─ Not found → Try fallback language
  │  ├─ en-gb (default base language)
  │  └─ Then return base structure
```

**Graceful Degradation:**
- If translation missing, use base language (en-gb)
- Partial translations handled (scene-by-scene validation)
- No data loss if translation fails

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
       ├─→ OpenAI API (gpt-4o default, override supported)
       ├─→ Cloudflare Workers AI (gpt-oss-120b default, override supported)
       └─→ Google Gemini API (optional)
```

---

**Last Updated:** October 28, 2025
**Key Updates:**
- gpt-4o agent (improved from gpt-4o-mini)
- Dynamic language detection (unlimited languages via BCP-47)
- Dynamic model selection (OPENAI/WORKERS_AI/GOOGLE with override support)
- Model override support throughout all workflows

See also:
- [WORKFLOWS.md](./WORKFLOWS.md) - Detailed workflow walkthrough
- [DATA_MODEL.md](./DATA_MODEL.md) - Complete data structures
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Infrastructure setup
