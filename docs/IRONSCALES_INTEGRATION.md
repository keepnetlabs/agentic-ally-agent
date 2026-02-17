# Agentic Ally x Ironscales — Integration Overview

> **Status:** Draft — Prepared after Ironscales meeting (Feb 16, 2026)
> **Audience:** Ironscales Engineering & Product Teams
> **Purpose:** High-level mapping of how Agentic Ally's AI agents consume and produce data via Ironscales APIs

---

## 1. What is Agentic Ally?

Agentic Ally is an **AI-powered security awareness orchestration platform** that autonomously generates, delivers, and analyzes security training content. It operates through **8 specialized AI agents**, each responsible for a distinct security awareness domain.

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENTIC ALLY PLATFORM                    │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐ │
│  │Orchestrator│  │Microlearn │  │ Phishing  │  │Smishing │ │
│  │   Agent    │  │   Agent   │  │   Agent   │  │  Agent  │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────┬────┘ │
│        │              │              │              │       │
│  ┌─────┴─────┐  ┌─────┴─────┐  ┌────┴──────┐  ┌───┴─────┐ │
│  │  Vishing  │  │ User Info │  │  Policy   │  │Email IR │ │
│  │   Agent   │  │   Agent   │  │   Agent   │  │ Analyst │ │
│  └───────────┘  └───────────┘  └───────────┘  └─────────┘ │
│                          │                                  │
│                    ┌─────┴─────┐                            │
│                    │ IRONSCALES│                            │
│                    │    API    │                            │
│                    └───────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Integration Points — Agent ↔ Ironscales API

### 2.1 User & Target Group Management

| Direction | Agentic Ally | Ironscales API | Purpose |
|-----------|-------------|----------------|---------|
| **READ** | User Info Agent | `GET /target-users` | Fetch employee profiles, email, department, risk score |
| **READ** | User Info Agent | `GET /target-groups` | Retrieve target groups (by department, role, risk level) |
| **READ** | User Info Agent | `GET /user-activity` | Pull user training history, simulation results, click rates |
| **WRITE** | Orchestrator Agent | `POST /target-groups` | Create smart target groups based on AI risk analysis |

**Why:** The User Info Agent builds behavioral risk profiles per employee. It needs Ironscales user data (departments, past simulation performance, training completion) to generate personalized recommendations and assign training to the right audience.

---

### 2.2 Phishing Simulation

| Direction | Agentic Ally | Ironscales API | Purpose |
|-----------|-------------|----------------|---------|
| **WRITE** | Phishing Agent | `POST /simulations/campaigns` | Create new phishing simulation campaigns |
| **WRITE** | Phishing Agent | `POST /simulations/templates` | Upload AI-generated email templates + landing pages |
| **WRITE** | Phishing Agent | `POST /simulations/campaigns/{id}/launch` | Launch simulation to target group |
| **READ** | Phishing Agent | `GET /simulations/campaigns/{id}/results` | Fetch campaign results (open, click, report rates) |
| **READ** | Orchestrator Agent | `GET /simulations/history` | Pull simulation history for trend analysis |

**What Agentic Ally generates:**
- Phishing email templates (HTML) with dynamic merge tags
- Landing pages (login, success, info page types)
- Difficulty levels: Easy / Medium / Hard
- Attack methods: Click-Only, Data-Submission, QR Code (Quishing)
- Multi-language support (30+ languages)

**AI-Powered Personalization:**
- Uses **Cialdini's 6 Principles of Persuasion** (Authority, Scarcity, Social Proof, Reciprocity, Commitment, Liking) to craft psychologically targeted simulations
- Adapts difficulty and attack vector based on each user's past performance
- Generates unique content per campaign (no template reuse)

**What we need from Ironscales:**
- Campaign creation API (template + target group + schedule)
- Campaign results API (per-user open/click/report metrics)
- Template upload API (HTML email + landing page)

---

### 2.3 Smishing (SMS Phishing) Simulation

| Direction | Agentic Ally | Ironscales API | Purpose |
|-----------|-------------|----------------|---------|
| **WRITE** | Smishing Agent | `POST /simulations/sms-campaigns` | Create SMS phishing campaigns |
| **WRITE** | Smishing Agent | `POST /simulations/sms-templates` | Upload AI-generated SMS templates + landing pages |
| **READ** | Smishing Agent | `GET /simulations/sms-campaigns/{id}/results` | Fetch SMS campaign results |

**What Agentic Ally generates:**
- SMS message templates with phishing URLs
- Mobile-optimized landing pages
- Difficulty-graded content

---

### 2.4 Vishing (Voice Phishing) Simulation

| Direction | Agentic Ally | Ironscales API | Purpose |
|-----------|-------------|----------------|---------|
| **WRITE** | Vishing Agent | `POST /simulations/voice-campaigns` | Create voice phishing campaigns |
| **READ** | Vishing Agent | `GET /target-users/{id}/phone` | Resolve employee phone numbers |
| **WRITE** | Vishing Agent | Report call results | Push call outcome (answered, duration, compliance) |

**How it works:**
1. Agentic Ally generates a dynamic voice prompt from training scenarios
2. ElevenLabs AI initiates the outbound call via Twilio
3. The conversation is recorded and summarized by AI
4. Results are pushed back to Ironscales for reporting

---

### 2.5 Security Awareness Training (Microlearning)

| Direction | Agentic Ally | Ironscales API | Purpose |
|-----------|-------------|----------------|---------|
| **WRITE** | Microlearning Agent | `POST /training/content` | Upload AI-generated training modules |
| **WRITE** | Orchestrator Agent | `POST /training/assignments` | Assign training to users/groups |
| **READ** | Orchestrator Agent | `GET /training/assignments/{id}/status` | Track completion rates |
| **READ** | User Info Agent | `GET /training/history` | Pull user training history for personalization |

**What Agentic Ally generates (8-scene interactive modules):**

```
Scene 1: Introduction       → Topic overview with custom branding
Scene 2: Learning Goals     → What the user will learn
Scene 3: Video              → Curated educational video
Scene 4: Actionable Drill   → Interactive vishing/smishing exercise
Scene 5: Quiz               → Knowledge assessment (multiple choice)
Scene 6: Survey             → Feedback collection
Scene 7: Nudge Messages     → Follow-up push notifications
Scene 8: Summary            → Key takeaways + policy links
```

- SCORM-compatible output
- Multi-language (30+ languages: EN, TR, DE, ES, FR, IT, PT, RU, ZH, JA, AR, KO, NL, PL, SV, DA, FI, EL, CS, HU, RO, BG, UK, HE, HI...)
- Department-specific inbox simulations embedded in training
- Auto-generated based on company policies and threat landscape

---

### 2.6 Email Incident Response (IR)

| Direction | Agentic Ally | Ironscales API | Purpose |
|-----------|-------------|----------------|---------|
| **READ** | Email IR Analyst | `GET /incidents/{id}` | Fetch reported email incident details |
| **READ** | Email IR Analyst | `GET /incidents/open` | List all open incidents for triage |
| **READ** | Email IR Analyst | `GET /incidents/active?period={p}` | List active incidents for a time period |
| **READ** | Email IR Analyst | `GET /incidents/impersonation` | List impersonation-specific incidents |
| **WRITE** | Email IR Analyst | `POST /incidents/{id}/classify` | Auto-classify incident (Attack / Spam / FP) |
| **READ** | Email IR Analyst | `GET /remediations?period={p}` | List remediation actions taken |
| **WRITE** | Email IR Analyst | `POST /incidents/{id}/remediate` | Trigger automated remediation |

**Agentic Ally's Email IR Pipeline:**

```
Fetch Email → Header Analysis (SPF/DKIM/DMARC)
           → Behavioral Analysis (urgency, social engineering)
           → Intent Analysis (phishing, fraud, impersonation)
           → Triage Classification
           → Feature Extraction
           → Risk Assessment (Low / Medium / High / Critical)
           → SOC Report Generation (Canvas JSON)
           → Auto-Classification → Push back to Ironscales
```

**Key value:** Agentic Ally acts as an **AI SOC analyst** — it can autonomously triage, analyze, and classify incidents reported by employees, dramatically reducing analyst workload.

---

### 2.7 Company Stats & Reporting

| Direction | Agentic Ally | Ironscales API | Purpose |
|-----------|-------------|----------------|---------|
| **READ** | Orchestrator Agent | `GET /company/stats` | Pull company-wide security posture metrics |
| **READ** | User Info Agent | `GET /company/stats` | Protected mailboxes, active attacks, incident counts |

**Available data from Ironscales:**
- `protected_mailboxes` — Total mailboxes under protection
- `active_mailboxes` — Currently synced mailboxes
- `open_incidents_count` — Unresolved incidents
- `active_attacks_count` — Ongoing confirmed attacks
- Priority breakdown (low / medium / high priority incident counts)
- License details and plan type

---

### 2.8 Autonomous Workflow (Cron-Based)

Agentic Ally can operate **fully autonomously** — no human in the loop required.

| Direction | Agentic Ally | Ironscales API | Purpose |
|-----------|-------------|----------------|---------|
| **READ** | Autonomous Service | `GET /target-users` | Fetch all employees for batch processing |
| **READ** | Autonomous Service | `GET /target-groups` | Fetch department/role groups |
| **WRITE** | Autonomous Service | `POST /simulations/campaigns` | Auto-create personalized simulations |
| **WRITE** | Autonomous Service | `POST /training/content` | Auto-generate targeted training |
| **WRITE** | Autonomous Service | `POST /training/assignments` | Auto-assign based on risk profile |

**How it works:**
1. A **Cloudflare Cron Trigger** fires on a schedule (e.g., daily/weekly)
2. The Autonomous Workflow fetches all users and groups
3. For each user/group, AI analyzes risk profile and simulation history
4. Automatically generates personalized phishing simulations + training content
5. Assigns and deploys without manual intervention

**Key value:** "Set it and forget it" — the entire awareness program runs on autopilot, continuously adapting content difficulty based on employee performance.

---

## 3. Authentication & Configuration

```
┌─────────────────────────────────────────┐
│         IRONSCALES API AUTH              │
│                                         │
│  Base URL:  appapi.ironscales.com       │
│  Auth:      API Key (Bearer Token)      │
│  Scope:     company.all                 │
│  Company:   {company_id}               │
│                                         │
│  Headers:                               │
│    Authorization: Bearer {api_key}      │
│    X-Company-Id: {company_id}           │
│    Content-Type: application/json       │
└─────────────────────────────────────────┘
```

**Required credentials per tenant:**
- `IRONSCALES_API_KEY` — API key with `company.all` scope
- `IRONSCALES_COMPANY_ID` — Company identifier

---

## 4. Data Flow — End-to-End Example

### Scenario: "Create and deploy a phishing simulation for the Finance department"

```
User (Chat) ──→ Orchestrator Agent
                     │
                     ├──→ User Info Agent
                     │       └──→ GET /target-groups?department=Finance
                     │       └──→ GET /target-users?group={finance_group_id}
                     │       └──→ GET /simulations/history?group={finance_group_id}
                     │              (returns: past click rates, weak topics)
                     │
                     ├──→ Phishing Agent
                     │       └──→ AI generates email template (HTML)
                     │       └──→ AI generates landing page
                     │       └──→ POST /simulations/templates (upload)
                     │       └──→ POST /simulations/campaigns (create)
                     │       └──→ POST /simulations/campaigns/{id}/launch
                     │
                     └──→ Microlearning Agent
                             └──→ AI generates follow-up training module
                             └──→ POST /training/content (upload)
                             └──→ POST /training/assignments
                                   (auto-assign to users who click)
```

---

### Scenario: "Analyze a suspicious email reported by an employee"

```
Ironscales Webhook ──→ POST /email-ir/analyze
                           │
                           ├──→ GET /incidents/{id} (fetch email data)
                           │
                           ├──→ Email IR Analyst Agent
                           │       ├── Header Analysis (SPF/DKIM/DMARC)
                           │       ├── Behavioral Analysis
                           │       ├── Intent Analysis
                           │       ├── Triage (Phishing? Spam? BEC?)
                           │       ├── Risk Assessment
                           │       └── Generate SOC Report
                           │
                           └──→ POST /incidents/{id}/classify
                                  (auto-classify as Attack/Spam/FP)
```

---

## 5. API Endpoints We Need from Ironscales

### Priority 1 — Must Have (MVP)

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 1 | `/incidents/{id}` | GET | Fetch incident details for IR analysis |
| 2 | `/incidents/open` | GET | List open incidents for bulk triage |
| 3 | `/incidents/active` | GET | List active incidents by period |
| 4 | `/incidents/{id}/classify` | POST | Push AI classification back |
| 5 | `/company/stats` | GET | Company security posture dashboard |
| 6 | `/target-users` | GET | List/search employees |
| 7 | `/target-groups` | GET | List/search target groups |

### Priority 2 — Simulation & Training

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 8 | `/simulations/campaigns` | POST | Create phishing simulation campaign |
| 9 | `/simulations/templates` | POST | Upload email template + landing page |
| 10 | `/simulations/campaigns/{id}/launch` | POST | Launch campaign to target group |
| 11 | `/simulations/campaigns/{id}/results` | GET | Get per-user simulation results |
| 12 | `/simulations/history` | GET | Historical simulation data |
| 13 | `/training/content` | POST | Upload training module (SCORM) |
| 14 | `/training/assignments` | POST | Assign training to users/groups |
| 15 | `/training/assignments/{id}/status` | GET | Track training completion |

### Priority 3 — Advanced

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 16 | `/incidents/impersonation` | GET | BEC/impersonation-specific incidents |
| 17 | `/remediations` | GET | Remediation history |
| 18 | `/incidents/{id}/remediate` | POST | Trigger automated remediation |
| 19 | `/simulations/sms-campaigns` | POST | Smishing campaign management |
| 20 | `/simulations/voice-campaigns` | POST | Vishing campaign management |
| 21 | Webhook: `on_incident_created` | — | Real-time incident trigger |
| 22 | Webhook: `on_simulation_completed` | — | Post-simulation trigger for auto-training |

---

## 6. Agent Capabilities Summary

| Agent | What It Does | Ironscales APIs Used |
|-------|-------------|---------------------|
| **Orchestrator** | Routes requests to specialist agents | Target Groups, Company Stats |
| **Microlearning** | Generates 8-scene interactive training (30+ languages) | Training Content, Training Assignments |
| **Phishing** | Creates email phishing simulations + landing pages | Simulation Campaigns, Templates, Results |
| **Smishing** | Creates SMS phishing simulations | SMS Campaigns, Templates |
| **Vishing** | Initiates AI voice phishing calls (ElevenLabs + Twilio) | Voice Campaigns, User Phone Data |
| **User Info** | Builds behavioral risk profiles per employee | Target Users, User Activity, Simulation History |
| **Policy Summary** | Answers company security policy questions | — (internal knowledge base) |
| **Email IR Analyst** | Analyzes & classifies suspicious emails (AI SOC) | Incidents, Classify, Remediations |

---

## 7. Technical Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        IRONSCALES                                │
│                                                                  │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │ Target   │  │Simulation│  │ Incident │  │    Training     │  │
│  │ Users &  │  │ Campaign │  │ Mgmt     │  │    Content &    │  │
│  │ Groups   │  │ Engine   │  │ & Triage │  │   Assignments   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬─────────┘  │
│       │              │             │                │            │
└───────┼──────────────┼─────────────┼────────────────┼────────────┘
        │              │             │                │
   REST API        REST API      REST API         REST API
        │              │             │                │
┌───────┼──────────────┼─────────────┼────────────────┼────────────┐
│       │              │             │                │            │
│  ┌────┴─────┐  ┌─────┴────┐  ┌────┴─────┐  ┌──────┴──────┐    │
│  │User Info │  │Phishing/ │  │Email IR  │  │Microlearning│    │
│  │  Agent   │  │Smishing  │  │ Analyst  │  │   Agent     │    │
│  └──────────┘  │ Agents   │  └──────────┘  └─────────────┘    │
│                └──────────┘                                     │
│                                                                 │
│  ┌───────────┐  ┌──────────┐  ┌──────────────────────────────┐ │
│  │ Vishing   │  │Orchestr. │  │  Cloudflare Workers Runtime  │ │
│  │   Agent   │  │  Agent   │  │  (KV Store, Workflows, Cron) │ │
│  └─────┬─────┘  └──────────┘  └──────────────────────────────┘ │
│        │                                                        │
│  ┌─────┴──────────────┐                                        │
│  │ ElevenLabs + Twilio│                                        │
│  │   (Voice Calls)    │                                        │
│  └────────────────────┘                                        │
│                                                                 │
│                    AGENTIC ALLY PLATFORM                        │
│               (Cloudflare Workers + Mastra AI)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Next Steps

| # | Action Item | Owner | Timeline |
|---|-------------|-------|----------|
| 1 | Ironscales shares full API documentation (Swagger/OpenAPI) | Ironscales | Week 1 |
| 2 | Confirm available API scopes for simulation & training mgmt | Ironscales | Week 1 |
| 3 | Agentic Ally builds API adapter layer for Ironscales | Agentic Ally | Week 2-3 |
| 4 | Email IR integration (P1 — incidents + classify) | Both | Week 2 |
| 5 | Simulation campaign creation integration (P2) | Both | Week 3-4 |
| 6 | Training content upload & assignment integration (P2) | Both | Week 3-4 |
| 7 | Webhook integration for real-time triggers | Both | Week 4-5 |
| 8 | End-to-end testing with sandbox environment | Both | Week 5-6 |

---

## 9. Open Questions for Ironscales

1. **Simulation API:** Is there a REST API for creating/launching phishing simulation campaigns programmatically? Or only via dashboard?
2. **Training API:** Can we upload SCORM packages via API? Or only custom training content?
3. **User Data:** Can we pull per-user simulation click/report rates via API?
4. **Webhooks:** Do you support webhooks for `incident_created`, `simulation_completed`, `training_completed` events?
5. **Sandbox:** Can we get a sandbox/test environment with API access for integration development?
6. **Rate Limits:** What are the API rate limits and pagination patterns?
7. **Multi-tenant:** How does the API handle multi-tenant (partner) access for MSPs?

---

*Document prepared by Agentic Ally team — For internal discussion with Ironscales*
