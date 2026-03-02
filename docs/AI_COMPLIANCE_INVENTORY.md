# AI Compliance Inventory

**Purpose:** AI system inventory for EU AI Act, GDPR, and global standards compliance.  
**Reference:** AI Compliance Audit Methodology (5-phase analysis)  
**Last Updated:** March 2026

---

## 1. AI System Inventory

### 1.1 Agent List (8 Agents)

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

| EU AI Act Article | Requirement | Status |
|-------------------|-------------|--------|
| **Art. 9** | Tool call risk classification | ✅ Documented in this inventory |
| **Art. 10** | PII tokenization, data governance | ⚠️ maskSensitiveField, log-redaction exist; pre-LLM PII check missing |
| **Art. 11** | Technical documentation | ✅ ARCHITECTURE.md, WORKFLOWS.md, DATA_MODEL.md |
| **Art. 12** | Tamper-evident records | ❌ Standard logging; no hash-chain |
| **Art. 13** | Explainability | ⚠️ PBI 44872 in design phase |
| **Art. 14** | Human oversight | ✅ ApprovalGated, Microlearning state machine |
| **Art. 15** | Prompt injection, security | ⚠️ Input validation (isSafeId); guardrails to be evaluated |

---

## 4. Next Steps

### Phase 1 (Completed)
- [x] AI system inventory
- [x] Tool risk classification

### Phase 2 (Recommended)
- [ ] Clausi scan: `clausi scan . -r EU-AIA`
- [ ] Pre-LLM PII check (Critic Agent / pre-LLM guard)
- [ ] Explainability (PBI 44872) completion
- [ ] Tamper-evident log evaluation

### Phase 3 (Ongoing)
- [ ] CI/CD: Clausi or Rigour PR integration
- [ ] Quarterly gap analysis
- [ ] Evidence pack updates

---

## 5. Related Documents

| Document | Content |
|----------|---------|
| [HANDOVER.md](./HANDOVER.md) | Critical config, timeout, thread ID |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 8-agent system, state machine |
| [DATA_MODEL.md](./DATA_MODEL.md) | KV schema, D1 tables |
| [AGENTIC_ROADMAP.md](./AGENTIC_ROADMAP.md) | Critic Agent, PII control plan |
