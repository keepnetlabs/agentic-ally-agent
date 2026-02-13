# Data Model Documentation

**Last Updated:** February 13, 2026

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
| `phishing:{id}:base` | **Simulation Metadata.** vector type, difficulty, psychological tactics. | None |
| `phishing:{id}:email` | **Email Template.** Subject, body, headers, sender info. | None |
| `phishing:{id}:landing` | **Landing Page.** HTML content for the fake login/success page. | None |

### C. Autonomous State (`autonomous:*`)

| Key Pattern | Description | TTL |
|-------------|-------------|-----|
| *None* | No persistent KV state is currently used for autonomous logic. (In-memory only) | - |

---

## 2. Core TypeScript Interfaces

All types are strictly defined in `src/mastra/types/`.

### Autonomous Types (`autonomous-types.ts`)

### Autonomous Types (`autonomous-types.ts`)

```typescript
export interface AutonomousRequest {
  token: string;
  actions: ('training' | 'phishing')[];
  // Assignment (User OR Group)
  firstName?: string;
  targetUserResourceId?: string;
  targetGroupResourceId?: string;
}

export interface AutonomousResponse {
  success: boolean;
  message?: string;
  phishingResult?: { success: boolean };
  trainingResult?: { success: boolean };
  actions: ('training' | 'phishing')[];
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
*   **Storage:** `phishing:{id}:base`

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

## 4. D1 Database (Vector Storage)

Used for Semantic Search (e.g., finding the best video for a topic).

**Table: `embedding_cache`** (From `D1_MIGRATION.sql`)
| Column | Type | Description |
|--------|------|-------------|
| `path` | TEXT | Primary Key (File Path) |
| `content_hash` | TEXT | MD5 Hash for staleness check |
| `embedding_json` | TEXT | JSON-encoded vector |
| `metadata_json` | TEXT | JSON-encoded metadata |
| `usage_count` | INTEGER | Cache hit counter |

---

## 5. Storage Flow

1.  **Agent Generates JSON** ->
2.  **Zod Validates Structure** (throws if invalid) ->
3.  **Application Logic** processes/enhances ->
4.  **KV Service** saves to Cloudflare KV (Atomic Write).
