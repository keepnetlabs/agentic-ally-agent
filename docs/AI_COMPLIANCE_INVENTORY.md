# AI Compliance Inventory

**Purpose:** AI system inventory for EU AI Act, GDPR, and global standards compliance.  
**Reference:** AI Compliance Audit Methodology (5-phase analysis)  
**Last Updated:** March 2026

---

## 1. AI System Inventory

### 1.1 Agent List (9 Agents)

| Agent | Role | Data Flow | Risk Pre-Assessment |
|-------|------|-----------|---------------------|
| **Orchestrator** | Intent analysis, routing | Prompt → LLM → Route | Minimal |
| **Microlearning** | 5-min training module generation | KV, D1, Product API | Limited |
| **Phishing Email** | Phishing simulation (email + landing) | KV, Product API | Limited |
| **Smishing SMS** | SMS phishing simulation | KV, Product API | Limited |
| **User Info** | Risk score, timeline analysis | Product API (timeline) | Limited |
| **Policy** | RAG-based policy summary | Policy docs, Product API | Minimal |
| **Vishing Call** | Voice phishing (ElevenLabs) | Product API, ElevenLabs | Limited |
| **Email IR Analyst** | Suspicious email analysis, IR report | Product API (email fetch) | Limited |
| **Out-of-Scope** | Scope boundary, polite refusal | Prompt → LLM → Static-like response | Minimal |

### 1.2 Tool List and Risk Classification (EU AI Act Art. 9)

**High-Impact Tools (Limited Risk — user assignment/impact):**

| Tool ID | Description | Risk Level | Rationale | Human Oversight |
|---------|-------------|------------|------------|-----------------|
| `assign-phishing` | Assigns phishing simulation to user/group | **Limited** | Training assignment affects users; target selection | ApprovalGated, Chat confirmation |
| `assign-training` | Assigns training to user/group | **Limited** | Training assignment affects users | ApprovalGated, Chat confirmation |
| `assign-smishing` | Assigns smishing simulation to user/group | **Limited** | Training assignment affects users | ApprovalGated, Chat confirmation |
| `initiate-vishing-call` | Initiates voice phishing call | **Limited** | Real call; target selection | Chat confirmation |

**Content Generation Tools:**

| Tool ID | Description | Risk Level | Rationale |
|---------|-------------|------------|------------|
| `phishing-workflow-executor` | Generates phishing email + landing | Limited | Simulation content |
| `smishing-workflow-executor` | Generates smishing SMS + landing | Limited | Simulation content |
| `workflow-executor` | Generates microlearning module | Limited | Training content |
| `phishing-editor` | Edits existing phishing template | Limited | Content modification |
| `smishing-editor` | Edits existing smishing template | Limited | Content modification |
| `generate-deepfake-video` | Generates deepfake video (HeyGen) | Limited | Visual content |

**Upload Tools (Platform upload):**

| Tool ID | Description | Risk Level |
|---------|-------------|------------|
| `upload-phishing` | Uploads phishing content to platform | Limited |
| `upload-smishing` | Uploads smishing content to platform | Limited |
| `upload-training` | Uploads training content to platform | Limited |

**Analysis / Information Tools:**

| Tool ID | Description | Risk Level |
|---------|-------------|------------|
| `get-user-info` | User timeline, risk score | Limited |
| `get-target-group-info` | Group information | Minimal |
| `summarize-policy` | Policy summary (RAG) | Minimal |
| `email-ir-*` (fetch, header, body, triage, risk, reporting) | Email IR analysis | Limited |

**Utility Tools:**

| Tool ID | Description | Risk Level |
|---------|-------------|------------|
| `list-heygen-voices`, `list-heygen-avatars` | HeyGen API list | Minimal |
| `list-phone-numbers` | Phone number list | Minimal |

---

## 2. Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        User / Cron                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Orchestrator → Specialist Agent (Microlearning, Phishing, ...)  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ Cloudflare KV │       │ D1 (SQLite)   │       │ Product API   │
│ ml:*, phish:* │       │ campaign_     │       │ /target-users │
│ smishing:*    │       │ metadata      │       │ /scenarios     │
└───────────────┘       └───────────────┘       └───────────────┘
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │ LLM (OpenAI, Workers) │
                    │ PII: maskSensitiveField│
                    └───────────────────────┘
```

### 2.1 Personal Data Processing

| Data Type | Where | Protection |
|-----------|-------|------------|
| Email, name, phone | get-user-info, assign tools | maskEmail, maskPhone, log redaction |
| Token / API key | All requests | maskSensitiveField |
| Timeline (activity) | User Info Agent | summarizeForLog, redaction |

---

## 3. Current Compliance Status

### EU AI Act

| EU AI Act Article | Requirement | Status |
|-------------------|-------------|--------|
| **Art. 9** | Tool call risk classification | ✅ Documented in this inventory |
| **Art. 10** | PII tokenization, data governance | ⚠️ maskSensitiveField, log-redaction exist; pre-LLM PII check missing |
| **Art. 11** | Technical documentation | ✅ ARCHITECTURE.md, WORKFLOWS.md, DATA_MODEL.md |
| **Art. 12** | Tamper-evident records | ✅ SHA-256 hash-chain on `data_access_audit` + `verifyAuditChain()` integrity check |
| **Art. 13** | Explainability | ⚠️ PBI 44872 in design phase |
| **Art. 14** | Human oversight | ✅ ApprovalGated, Microlearning state machine |
| **Art. 15** | Prompt injection, security | ⚠️ Input validation (isSafeId); guardrails to be evaluated |

### GDPR

| GDPR Article | Requirement | Status | Implementation |
|--------------|-------------|--------|----------------|
| **Art. 13-14** | Privacy policy / transparency | ❌ | Requires legal/DPO |
| **Art. 15** | Right of access (data export) | ✅ Technical | `gdpr-service.ts: buildResourceKeyPrefixes()` + KVService |
| **Art. 17** | Right to erasure (deletion) | ✅ Technical | `gdpr-service.ts: createDeletionRequest()`, `completeDeletionRequest()` |
| **Art. 28** | Data Processing Agreements | ❌ | Requires legal — OpenAI, HeyGen, ElevenLabs |
| **Art. 30** | Records of processing | ✅ Technical | `data_access_audit` D1 table + `gdprAuditMiddleware` |
| **Art. 33-34** | Breach notification | ⚠️ Infra ready | Audit log infrastructure enables detection; procedure doc needed |
| **Art. 35** | DPIA | ❌ | Requires DPO — deepfake, phishing, vishing assessment |

### GDPR Technical Infrastructure

| Component | File | Purpose |
|-----------|------|---------|
| D1 Migration | `migrations/0003_gdpr_audit.sql` | `data_access_audit` + `data_deletion_requests` tables |
| GDPR Service | `src/mastra/services/gdpr-service.ts` | Audit log, deletion tracking, data export, retention |
| Audit Middleware | `src/mastra/middleware/gdpr-audit.ts` | Auto audit for personal data endpoints (mounted in middleware chain) |
| GDPR Constants | `src/mastra/constants.ts` → `GDPR` | Retention days, data categories, personal data paths |
| Error Codes | `src/mastra/constants.ts` → `ERR_GDPR_*` | 5 GDPR-specific error codes |
| Error Category | `src/mastra/services/error-service.ts` | `DATA_PROCESSING` category + `dataProcessing()` factory |
| KV TTL | `src/mastra/services/kv-service.ts` | `put(key, value, { ttlSeconds })` for data retention |
| Hash-Chain Migration | `migrations/0004_audit_integrity_hash.sql` | `integrity_hash` + `prev_hash` columns on `data_access_audit` |
| Hash-Chain Functions | `src/mastra/services/gdpr-service.ts` | `computeHash()`, `buildHashPayload()`, `verifyAuditChain()` |

---

## 4. Next Steps

See [AI_COMPLIANCE_PROGRESS.md](./AI_COMPLIANCE_PROGRESS.md) for full progress tracker.

### Pending

| Task | Effort | Blocker |
|------|--------|---------|
| ~~Deploy migrations 0003 + 0004 to prod~~ | Low | ✅ Done |
| Explainability (PBI 44872) | Medium | — |
| Privacy Policy (Art. 13-14) | Medium | Legal/DPO |
| DPIA (Art. 35) | High | DPO |
| DPA with processors (Art. 28) | Medium | Legal |

### Ongoing

- CI/CD: eu-ai-act-scanner or Rigour PR integration
- Quarterly gap analysis
- Evidence pack updates

---

## 5. Related Documents

| Document | Content |
|----------|---------|
| [AI_COMPLIANCE_PROGRESS.md](./AI_COMPLIANCE_PROGRESS.md) | Done vs planned — progress tracker |
| [EU_AI_ACT_WORKFLOW.md](./EU_AI_ACT_WORKFLOW.md) | Süreç, raporlama, araçlar |
| [HANDOVER.md](./HANDOVER.md) | Critical config, timeout, thread ID |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 8-agent system, state machine |
| [DATA_MODEL.md](./DATA_MODEL.md) | KV schema, D1 tables |
| [AGENTIC_ROADMAP.md](./AGENTIC_ROADMAP.md) | Critic Agent, PII control plan |
