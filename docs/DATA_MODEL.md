# Data Model Documentation

**Last Updated:** February 16, 2026

This document defines the core data structures, storage schemas, and type definitions used throughout Agentic Ally.

---

## 1. Cloudflare KV Schema

We use a hierarchical key structure to store all content.

### A. Microlearning Storage (`ml:*`)

| Key Pattern | Description | TTL |
|-------------|-------------|-----|
| `ml:{id}:base` | **Master Record.** Contains metadata, theme, and logical structure (8 scenes). | None |
| `ml:{id}:lang:{code}` | **Localized Content.** Contains the translated text for all 8 scenes. | None |
| `ml:{id}:inbox:{dept}:{code}` | **Simulation Inbox.** Department and language-specific email/SMS variants. | None |

### B. Phishing Storage (`phishing:*`)

| Key Pattern | Description | TTL |
|-------------|-------------|-----|
| `phishing:{id}:base` | **Simulation Metadata.** topic, difficulty, method, `isQuishing`, `psychologicalTriggers`, tone, category. | None |
| `phishing:{id}:email:{lang}` | **Email Template.** subject, template (HTML), fromAddress, fromName, redFlags. | None |
| `phishing:{id}:landing:{lang}` | **Landing Page.** name, description, method, difficulty, pages (HTML array). | None |

**Base fields** (`phishing:{id}:base`): `id`, `name`, `description`, `topic`, `difficulty`, `method`, `isQuishing`, `targetProfile`, `psychologicalTriggers` (array), `tone`, `category`, `createdAt`, `language_availability`.

### C. Smishing Storage (`smishing:*`)

| Key Pattern | Description | TTL |
|-------------|-------------|-----|
| `smishing:{id}:base` | **Simulation Metadata.** name, topic, difficulty, method, `psychologicalTriggers`, `language_availability`. | None |
| `smishing:{id}:sms:{lang}` | **SMS Content.** id, language, messages (array), redFlags. | None |
| `smishing:{id}:landing:{lang}` | **Landing Page.** id, language, name, description, method, difficulty, pages (optional; may be absent). | None |

**Base fields** (`smishing:{id}:base`):

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Smishing simulation ID (UUID) |
| `name` | string | Display name from analysis (e.g. "Parcel Reschedule - Easy") |
| `description` | string | Brief scenario description |
| `topic` | string | Main theme (e.g. "Delivery Update") |
| `difficulty` | string | `Easy` \| `Medium` \| `Hard` |
| `method` | string | `Click-Only` \| `Data-Submission` |
| `targetProfile` | object | Target audience analysis (from `targetAudienceAnalysis`) |
| `psychologicalTriggers` | string[] | Triggers used (e.g. `["Urgency", "Curiosity"]`) — used for Active Learning |
| `createdAt` | string | ISO timestamp |
| `language_availability` | string[] | Supported languages (e.g. `["en-gb"]`) |

**SMS fields** (`smishing:{id}:sms:{lang}`):

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Smishing ID |
| `language` | string | BCP-47 code (e.g. `en-gb`) |
| `messages` | string[] | SMS text templates; use `{PHISHINGURL}` placeholder for link |
| `redFlags` | string[] | Key red flags for user education |

**Landing fields** (`smishing:{id}:landing:{lang}`):

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Smishing ID |
| `language` | string | BCP-47 code |
| `name` | string | Landing page name |
| `description` | string | Brief description |
| `method` | string | Attack method |
| `difficulty` | string | Difficulty level |
| `pages` | array | `{ type: "login" \| "form" \| ..., template: "<html>..." }[]` |

**Flow:** `create-smishing-workflow` → `saveSmishingBase` + `saveSmishingSms` + `saveSmishingLandingPage`; `upload-smishing-tool` reads and uploads; Active Learning writes to D1 `campaign_metadata` after upload.

### D. Autonomous State (`autonomous:*`)

| Key Pattern | Description | TTL |
|-------------|-------------|-----|
| *None* | No persistent KV state is currently used for autonomous logic. (In-memory only) | - |

---

## 2. Core TypeScript Interfaces

All types are strictly defined in `src/mastra/types/`.

### Autonomous Types (`autonomous-types.ts`)

```typescript
export interface AutonomousRequest {
  token: string;
  baseApiUrl?: string;
  firstName?: string;
  lastName?: string;
  targetUserResourceId?: string;
  departmentName?: string;
  targetGroupResourceId?: string;
  actions: ('training' | 'phishing' | 'smishing')[];
  sendAfterPhishingSimulation?: boolean;
  preferredLanguage?: string;
  env?: CloudflareEnv;
  mastra?: Mastra;
}

export interface AutonomousResponse {
  success: boolean;
  userInfo?: { targetUserResourceId, fullName, department, email, preferredLanguage };
  recentActivities?: Array<{ actionType, campaignName, productType, difficulty, score, actionTime }>;
  analysisReport?: AnalysisReport;
  executiveReport?: string;
  phishingResult?: AutonomousActionResult;
  smishingResult?: AutonomousActionResult;
  trainingResult?: AutonomousActionResult;
  actions: ('training' | 'phishing' | 'smishing')[];
  message?: string;
  error?: string;
}
```

### Microlearning Types (`microlearning.ts`)

```typescript
export interface MicrolearningContent {
  id: string;
  title: string;
  scenes: Scene[];
  inbox: InboxItem[];
  metadata: Record<string, any>;
}
```

---

## 3. Agent Output Schemas (Zod)

We use Zod for runtime validation of Agent outputs.

### A. Microlearning Agent
*   **Output:** `MicrolearningSchema`
*   **Storage:** `ml:{id}:base`

### B. Phishing Agent
*   **Output:** `PhishingSimulationSchema` (Subject, Body, Landing HTML)
*   **Storage:** `phishing:{id}:base`, `phishing:{id}:email:{lang}`, `phishing:{id}:landing:{lang}`

### B.1 Smishing Agent
*   **Output:** SMS messages + optional landing page
*   **Storage:** `smishing:{id}:base`, `smishing:{id}:sms:{lang}`, `smishing:{id}:landing:{lang}`

### C. Policy Summary Agent (Stateless)
*   **Output:** STRICT HTML Block (Not stored in KV, returned to Chat)
```html
<strong>Policy Summary: {Topic}</strong><br>
{Verification_Line}<br>
<strong>Key Takeaways:</strong>
<ul><li>...</li></ul>
<strong>Action Required:</strong> ...
```

### D. User Info Agent (Stateless)
*   **Output:** JSON Analysis Report (Transient)
```typescript
{
  riskScore: "HIGH",
  recommendedLevel: "Advanced",
  reasoning: "User clicked 3 phishing links in 30 days."
}
```

---

## 3.1 User Search & Phone Resolution (`PlatformUser`)

User lookup (`getUserInfo`, vishing target resolution) uses `PlatformUser` from `user-management-types.ts`:

| Field | Type | Description |
|-------|------|-------------|
| `targetUserResourceId` | string | Unique user ID |
| `firstName`, `lastName`, `email` | string | Identity |
| `phoneNumber` | string? | E.164 format (required for vishing) |
| `department`, `preferredLanguage`, `role` | optional | Metadata |

**Phone resolution flow** (when search API omits `phoneNumber`):

1. **Search** (email / ID / name) → primary API, then fallback search.
2. **Enrich** → if `phoneNumber` missing, call direct lookup `GET /api/target-users/:id`.
3. **Merge** → `{ ...searchResult, phoneNumber: directLookup.phoneNumber }` (preserves search fields).
4. **Resilience** → if direct lookup fails (404, 500, network), return user without phone; log warning.

Used by: `getUserInfo` tool, vishing call agent (target resolution).

---

## 4. D1 Database

### A. Vector Storage (`agentic_ally_embeddings_cache`)

Used for Semantic Search (e.g., finding the best video for a topic).

**Table: `embedding_cache`** (From `D1_MIGRATION.sql`)
| Column | Type | Description |
|--------|------|-------------|
| `path` | TEXT | Primary Key (File Path) |
| `content_hash` | TEXT | MD5 Hash for staleness check |
| `embedding_json` | TEXT | JSON-encoded vector |
| `metadata_json` | TEXT | JSON-encoded metadata |
| `usage_count` | INTEGER | Cache hit counter |

### B. Campaign Metadata (`agentic_ally_memory`) — Active Learning

Used for User Info Agent tactic enrichment. See [AGENTIC_ROADMAP.md](./AGENTIC_ROADMAP.md).

**Table: `campaign_metadata`** (From `migrations/0002_campaign_metadata.sql`)
| Column | Type | Description |
|--------|------|-------------|
| `resource_id` | TEXT | Primary Key (scenario/template resource ID) |
| `tactic` | TEXT | Psychological trigger(s), e.g. "Authority, Fear" |
| `persuasion_tactic` | TEXT | Alternative tactic field |
| `scenario` | TEXT | Topic/scenario name |
| `difficulty` | TEXT | Difficulty level |
| `scenario_type` | TEXT | e.g. phishing, smishing |
| `created_at` | TEXT | Insert timestamp |

**Flow:** `upload-phishing-tool` and `upload-smishing-tool` write after upload; `get-user-info-tool` reads to enrich timeline with `[Tactic: X]`.

---

## 5. Storage Flow

1.  **Agent Generates JSON** ->
2.  **Zod Validates Structure** (throws if invalid) ->
3.  **Application Logic** processes/enhances ->
4.  **KV Service** saves to Cloudflare KV (Atomic Write).
