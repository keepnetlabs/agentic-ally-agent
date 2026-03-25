# C.1 — Behavioural Signal Records: Data Schema & Anonymisation Dictionary

**Document Reference:** Compliance Evidence Pack — Section C.1
**Last Updated:** March 2026
**Status:** Production

---

## 1. Architecture Note: No Persistent PII Storage

Agentic Ally does **not** store Personal Identifiable Information (PII). User identity data (name, email, phone number) originates exclusively from the **tenant's Product API** and is processed transiently in-memory during agent execution. It is never written to Cloudflare KV or D1.

| Storage Layer | Store | Contains PII? | Notes |
|--------------|-------|---------------|-------|
| **Content Store** | Cloudflare KV (`ml:*`, `phishing:*`, `smishing:*`) | No | Campaign content only; no user linkage |
| **Audit Trail** | D1: `data_access_audit` | Pseudonymous only | Active — `gdprAuditMiddleware` writes to this table for every `/chat`, `/autonomous`, `/batch-autonomous` request (SHA-256 hash-chain, EU AI Act Art. 12) |
| **Campaign Metadata** | D1: `campaign_metadata` | No | Tactic/difficulty metadata per campaign, no user data |
| **Scorer Results** | D1: `dev_mastra_scorers` | No | AI output quality scores only |
| **In-memory (runtime)** | Agent execution context | Yes (transient) | Fetched from Product API; discarded after agent run |

---

## 2. Behavioural Signal Fields

### 2.1 User Activity Record (Transient — from Product API)

Assembled by the User Info Agent from the tenant Product API. Not persisted anywhere in this system.

| Field | Type | Source | PII? | Note |
|-------|------|--------|------|------|
| `targetUserResourceId` | string (UUID) | Product API | Pseudonymous | Opaque platform-issued ID |
| `actionType` | string | Product API | No | Raw API value e.g. `Clicked Link`, `Submitted Data`, `Training Completed`, `Reported Email` |
| `campaignName` | string | Product API | No | — |
| `productType` | string | Product API | No | e.g. `PHISHING SIMULATOR - CLICK-ONLY`, `SECURITY AWARENESS - TRAINING` |
| `difficulty` | string | Product API | No | `Easy`, `Medium`, `Hard` |
| `score` | number | Product API | No | 0–100 for training completions; 0 for simulations (always a number — `r.points || 0`) |
| `actionTime` | string | Product API | No | DD/MM/YYYY HH:mm format from API |
| `tactic` | string | D1: `campaign_metadata` | No | Enriched at query time from `campaign_metadata` table |

### 2.2 User Identity Fields (Transient — fetched but not persisted)

These fields are fetched from the Product API during tool execution. They are used in-memory for user lookup and timeline fetching. What happens to them in logs and LLM context depends on the execution mode — see Section 3.2.

| Field | Type | PII? | Reaches LLM (behavioral analysis call)? | Log Behaviour |
|-------|------|------|----------------------------------------|---------------|
| `firstName`, `lastName` | string | Yes | No | Logged as `[REDACTED]` at INFO level during name-based search (`get-user-info-tool.ts:225`). |
| `email` | string | Yes | No | Not logged in normal flow; used only as search parameter |
| `phoneNumber` | string (E.164) | Yes | No | Not logged; passed directly to ElevenLabs API for vishing calls only |
| `targetUserResourceId` | string (UUID) | Pseudonymous | Yes — as `User id:` | Logged |
| `department` | string | No | Yes | Logged |
| `preferredLanguage` | string (BCP-47) | No | Yes — as `Language:` | Logged |
| `role` | string | No | Yes — as `Role:` | Logged |
| `location`, `accessLevel` | string | No | Yes — if present | Logged |

### 2.3 Campaign Content Fields (Cloudflare KV — no PII)

Campaign records in KV are not linked to individual users.

**Phishing base** (`phishing:{id}:base`) — representative fields:

| Field | Type | PII? |
|-------|------|------|
| `id` | string (UUID) | No |
| `name`, `description`, `topic` | string | No |
| `difficulty`, `tone`, `category`, `method` | string | No |
| `psychologicalTriggers` | string[] | No |
| `targetProfile` | object | No — audience category, not specific users |
| `language_availability` | string[] | No |
| `explainability` | object | No — AI decision rationale |
| `createdAt` | string | No |

Smishing (`smishing:{id}:base`) and Microlearning (`ml:{id}:base`) follow the same pattern.

---

## 3. Log and LLM Data Controls

### 3.1 Active Masking Functions

Only one masking function is actively called in production code (`src/mastra/utils/core/security-utils.ts`):

| Function | Status | What It Masks | Called In |
|----------|--------|---------------|-----------|
| `maskSensitiveField(obj, 'accessToken')` | **Active** | `accessToken` in outbound API payloads before logging | `assign-phishing`, `assign-smishing`, `assign-training`, `upload-phishing`, `upload-smishing`, `upload-training` |
| `maskEmail()` | Defined, not called in production | Email local-part | Tests only |
| `maskPhone()` | Defined, not called in production | Phone digits | Tests only |
| `maskHeaders()` | Defined, not called in production | Auth headers | Tests only |
| `deepRedact()` | Defined, not called in production | Nested fields | Tests only |
| `maskUrlParams()` | Defined, not called in production | Query strings | Tests only |

**Gap (remaining):** `email`, `phoneNumber` are not masked before logging (not logged in normal flow — low risk). `firstName`/`lastName` are now logged as `[REDACTED]`.

### 3.2 What Reaches the LLM — By Mode

#### Behavioral Analysis LLM Call (inside `getUserInfoTool`, lines 457–499)

This specific LLM call receives **no PII** in either mode:

- `targetUserResourceId` — pseudonymous ID
- `role`, `department`, `location`, `language`, `accessLevel` — non-identifying
- Activity records — `actionType`, `campaignName`, `productType`, `difficulty`, `score`, `actionTime`, `tactic`

System prompt instructs: *"Do NOT output real names, emails, phone numbers. Refer to 'the user'."*

#### Autonomous Mode (Cron / Direct API)

`getUserInfoTool.execute()` is called directly (no agent framework). The tool result is consumed by `autonomous-content-generators.ts`, which passes only `targetUserResourceId`, `department`, `preferredLanguage` to downstream phishing/training agents (`autonomous-prompts.ts` builders contain no name/email/phone). `phoneNumber` goes to ElevenLabs API for vishing — not to any LLM.

**PII does not reach the LLM in autonomous mode.** ✅

#### Chat Mode (via Orchestrator Agent)

The `getUserInfoTool` returns a tool result including `fullName`, `email`, `phoneNumber` (lines 705–718). In Mastra's agent framework, tool results are part of the conversation message history. The orchestrator LLM and downstream specialist agents can see these values in context.

**PII is present in the LLM conversation context in chat mode.** ⚠️

### 3.3 Anonymisation Techniques — Status

| Technique | Status | Reason |
|-----------|--------|--------|
| Tokenisation vault | Not applicable | PII is never stored in this system |
| k-Anonymity | Not applicable | No PII dataset held |
| Differential privacy | Not applicable | Out of scope for current risk classification |

---

## 4. Data Retention Policy

Configured in `src/mastra/constants.ts` → `GDPR.RETENTION_DAYS`:

| Constant Name | Value | Store | Data |
|--------------|-------|-------|------|
| `CAMPAIGN_DATA` | 365 days | KV | Phishing/smishing simulation content |
| `KV_CONTENT` | 365 days | KV | Microlearning content |
| `USER_ACTIVITY` | 180 days | KV | Interaction logs |
| `AUDIT_LOGS` | 730 days | D1 | 2-year regulatory minimum |
| `SESSION_DATA` | 90 days | KV | Chat/thread sessions |

Retention is enforced via `KVService.put(key, value, { ttlSeconds })` for KV entries. D1 audit records require manual purge.

---

## 5. Audit Trail Schema (D1: `data_access_audit`)

`gdprAuditMiddleware` is mounted in the Hono middleware chain and logs access events for paths matching `GDPR.PERSONAL_DATA_PATHS`: `/chat`, `/autonomous`, `/batch-autonomous`, `/api/user`, `/api/target-group`, `/api/assign`, `/api/upload`.

All active production routes that process personal data (`/chat`, `/autonomous`, `/batch-autonomous`) are covered. The middleware fires after the handler completes, writes to D1 as fire-and-forget (non-blocking), and swallows errors so audit failures never affect request flow.

**Activation date:** March 2026 (`constants.ts` `PERSONAL_DATA_PATHS` updated to include production routes).

> **Note:** In local development (`mastra dev`), Cloudflare D1 bindings are not available in `c.env` — audit records are not written locally. Records are written only in production (Cloudflare Workers with `wrangler deploy`). Failures at any point are swallowed silently and never affect request flow.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID |
| `company_id` | TEXT | Tenant identifier (from request context) |
| `user_id` | TEXT (nullable) | Not populated by middleware-level logs; null |
| `action` | TEXT | `READ` \| `CREATE` \| `UPDATE` \| `DELETE` \| `EXPORT` |
| `resource_type` | TEXT | `USER_PII` \| `CAMPAIGN_DATA` \| `TRAINING_DATA` \| `ANALYTICS` \| `AI_GENERATED` |
| `resource_id` | TEXT (nullable) | Specific resource key or ID |
| `details` | TEXT (JSON) | Endpoint path, HTTP method, HTTP status code |
| `initiated_by` | TEXT | `system` \| `user` \| `cron` |
| `created_at` | TEXT | ISO 8601 timestamp |
| `integrity_hash` | TEXT | `SHA-256(JSON.stringify([id, company_id, user_id, action, resource_type, resource_id, details, initiated_by, created_at, prev_hash]))` |
| `prev_hash` | TEXT (nullable) | Previous row's hash — verifiable chain (EU AI Act Art. 12) |

Chain verification: `verifyAuditChain(env, companyId)` in `src/mastra/services/gdpr-service.ts`.

---

## 6. Chat vs Autonomous Data Flow

| Aspect | Chat Mode | Autonomous Mode |
|--------|-----------|-----------------|
| **Trigger** | HTTP POST `/chat` | HTTP POST `/autonomous` (Cron or direct) |
| **Orchestration** | LLM (Orchestrator → Specialist Agent) | Direct tool calls — no LLM routing |
| **`companyId` in context** | Set by `X-COMPANY-ID` header via `context-storage` middleware | Preserved from outer `requestStorage` context — `getRequestContext()?.companyId` passed into `requestStorage.run()` in `autonomous-service.ts` |
| **GDPR audit triggered?** | Yes — `/chat` matches `PERSONAL_DATA_PATHS`; writes to `data_access_audit` (`initiatedBy: 'user'`) | Yes — `/autonomous` matches `PERSONAL_DATA_PATHS`; `companyId` from `X-COMPANY-ID` header if sent by caller, `'unknown'` if not (`initiatedBy: 'system'`) |
| **PII in LLM context** | Yes — tool result with `fullName`/`email`/`phone` in message history | No — downstream prompts use only pseudonymous ID + metadata |

---

## 7. Data Flow Summary

```
Product API (tenant-owned)
  └─ PII: firstName, lastName, email, phoneNumber  ← never stored in this system
  └─ Activity timeline: actionType, campaignName, score, ...  ← transient
       │
       ▼
  getUserInfoTool (in-memory)
       │
       ├─ Behavioral analysis LLM call:
       │    → pseudonymous ID + role/dept/activities only (no PII)
       │
       ├─ Autonomous mode output → content generators
       │    → targetUserResourceId + dept + language to phishing/training agents (no PII)
       │    → phoneNumber to ElevenLabs API only (not LLM)
       │
       └─ Chat mode output → Orchestrator message history
            → fullName + email + phoneNumber visible to orchestrator LLM ⚠️
```

---

## 8. Related Documents

| Document | Content |
|----------|---------|
| [DATA_MODEL.md](../DATA_MODEL.md) | Full KV/D1 schema |
| [AI_COMPLIANCE_INVENTORY.md](../AI_COMPLIANCE_INVENTORY.md) | Tool risk classification, data flow |
| [C2_SAMPLE_RECORDS.md](./C2_SAMPLE_RECORDS.md) | Sample anonymised behavioural signal records |
| [C3_QUALITY_EVALUATION.md](./C3_QUALITY_EVALUATION.md) | AI output quality evaluation data |
| `src/mastra/utils/core/security-utils.ts` | Masking function implementations |
| `src/mastra/services/gdpr-service.ts` | Audit logging, hash-chain, deletion |
| `src/mastra/middleware/gdpr-audit.ts` | Auto-audit middleware |
| `migrations/0003_gdpr_audit.sql` | `data_access_audit` + `data_deletion_requests` DDL |
| `migrations/0004_audit_integrity_hash.sql` | Hash-chain columns DDL |
