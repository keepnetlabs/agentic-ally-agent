# Workflow Documentation

**Last Updated:** February 16, 2026

This document visualizes the core logic flows of the Agentic Ally system.

---

## 1. Autonomous Workflow (The Loop)

This runs on a schedule (Cron) to proactively generate content.

```mermaid
graph TD
    Start[Cron Trigger / API Call] --> FetchUsers[Fetch all Users & Groups]
    FetchUsers --> Filter[Filter by Frequency Policy]
    Filter --> Decide{Action Needed?}
    
    Decide -->|No| End[Sleep]
    Decide -->|Yes| Analyze[Analyze User Risk Profile]
    
    Analyze --> IdentifyGap{Identify Knowledge Gap}
    
    IdentifyGap -->|Low Phishing Score| Phishing[Trigger Phishing Agent]
    IdentifyGap -->|Low Quiz Score| Training[Trigger Microlearning Agent]
    
    Phishing --> GenPhishing[Generate Simulation]
    Training --> GenTraining[Generate Training Module]
    
    GenPhishing --> SaveKV[Save to KV]
    GenTraining --> SaveKV
    
    SaveKV --> Notify[Notify Admin / Assign User]
    Notify --> End
```

---

## 2. Create Microlearning Workflow

The complex process of generating a 5-minute training module.

```mermaid
graph TD
    Start[User Request] --> State1[State 1: Gather Requirements]
    State1 --> Confirm{User Confirmed?}
    
    Confirm -->|No| State1
    Confirm -->|Yes| State3[State 3: Execute]
    
    State3 --> Parallel{Parallel Execution}
    
    Parallel --> Structure[Gen Structure (JSON)]
    Parallel --> Inboxes[Gen Inbox Variants]
    
    Structure --> Enhance[Enhance Content (Rich Text)]
    Enhance --> Video[Semantic Search Video]
    
    Video --> Merge[Merge All Components]
    Inboxes --> Merge
    
    Merge --> Validate[Zod Code Validation]
    
    Validate -->|Fail| repair[Auto-Repair JSON]
    repair --> Validate
    
    Validate -->|Pass| Save[Save to KV]
    Save --> State4[State 4: Complete]
```

---

## 3. Phishing Simulation Workflow

Generating a realistic attack scenario.

```mermaid
graph TD
    Start[Agent Request] --> Persona[Analyze User Persona]
    
    Persona --> Tactics{Select Tactics}
    Tactics -->|Urgency| T1[Template: Immediate Action]
    Tactics -->|Curiosity| T2[Template: "Look at this"]
    Tactics -->|Authority| T3[Template: CEO Request]
    
    T1 & T2 & T3 --> GenEmail[Generate Email Body]
    GenEmail --> GenLanding[Generate Landing Page]
    
    GenLanding --> Sanitize[Sanitize Output]
    Sanitize --> Save[Save to KV]
```

**Implementation:** `create-phishing-workflow` steps: `analyzeRequest` → `generateEmail` → `generateLandingPage` → `savePhishingContent`.

---

## 4. Smishing Simulation Workflow

Generating a realistic SMS-based attack scenario.

```mermaid
graph TD
    Start[Agent Request] --> Persona[Analyze User Persona]
    
    Persona --> Tactics{Select Tactics}
    Tactics -->|Urgency| T1[Template: Account Alert]
    Tactics -->|Curiosity| T2[Template: Delivery Update]
    Tactics -->|Authority| T3[Template: HR Policy Notice]
    
    T1 & T2 & T3 --> GenSMS[Generate SMS Messages]
    GenSMS --> GenLanding[Generate Landing Page]
    
    GenLanding --> Sanitize[Sanitize Output]
    Sanitize --> Save[Save to KV]
```

**Implementation:** `create-smishing-workflow` steps: `analyzeRequest` → `generateSms` → `generateLandingPage` → `saveSmishingContent`.

**Edit/Translate (Smishing Editor)**
- Uses existing SMS + landing page content from KV.
- "translate" mode preserves layout/CSS and only updates visible text.
- "edit" mode allows tone/wording changes while keeping placeholders intact.

---

## 5. Policy Expert Workflow

How the system answers policy questions (RAG).

```mermaid
graph TD
    Start[User Question] --> Intent[Orchestrator: Detect 'Policy']
    Intent --> Agent[Trigger Policy Agent]
    
    Agent --> Tool[Call summarizePolicyTool]
    Tool --> RAG[Search Vector DB]
    RAG --> Retrieve[Retrieve Policy Docs]
    
    Retrieve --> Summarize[LLM Summarization]
    Summarize --> Format[Format as HTML]
    Format --> Response[Return to User]
```

---

## 6. User Risk Analysis Workflow

How we determine if a user needs training.

```mermaid
graph TD
    Start[Request Analysis] --> Fetch[Fetch User Activity]
    
    Fetch --> Timeline[Analyze Last 30 Days]
    Timeline --> Calculate{Risk Calculation}
    
    Calculate -->|Clicks > 3| High[Risk: HIGH]
    Calculate -->|Clicks > 1| Med[Risk: MEDIUM]
    Calculate -->|Clicks = 0| Low[Risk: LOW]
    
    High & Med & Low --> Rec[Recommend Training Level]
    Rec --> JSON[Return JSON Report]
```

---

## 7. Email IR Analysis Workflow

How the system analyzes a suspicious email and produces an IR report.

```mermaid
graph TD
    Start[API Call: /email-ir/analyze] --> Fetch[Stage 1: Fetch Email]
    Fetch --> Parallel{Stage 2: Parallel Multi-Analysis}

    Parallel --> Header[2a: Header Analysis]
    Parallel --> Behavioral[2b: Body-Behavioral Analysis]
    Parallel --> Intent[2c: Body-Intent Analysis]

    Header & Behavioral & Intent --> Triage[Stage 3: Triage]
    Triage --> Features[Stage 4: Feature Extraction]
    Features --> Risk[Stage 5: Risk Assessment]
    Risk --> Report[Stage 6: Reporting]
    Report --> Response[Return JSON Report]
```

**Risk Scoring (Summary)**
- High (75-100): Phishing/CEO fraud/sextortion category or multiple convergent signals.
- Medium (40-74): Mixed signals (some suspicious, some mitigating).
- Low (0-39): Benign/internal/marketing category or clean technical + behavioral signals.

**Stage-to-Tool Mapping (Reference)**
- Stage 1: Fetch Email -> `fetch-email`
- Stage 2a: Header Analysis -> `header-analysis`
- Stage 2b: Body-Behavioral Analysis -> `body-behavioral-analysis`
- Stage 2c: Body-Intent Analysis -> `body-intent-analysis`
- Stage 3: Triage -> `triage`
- Stage 4: Feature Extraction -> `feature-extraction`
- Stage 5: Risk Assessment -> `risk-assessment`
- Stage 6: Reporting -> `reporting`

---

## 8. User Search & Phone Resolution

How user lookup enriches results when the search API omits phone numbers (used by getUserInfo, vishing target resolution).

```mermaid
graph TD
    Input[Input: email / ID / name] --> Search[Primary Search: get-all]
    Search --> Empty{Results?}
    Empty -->|Empty| Fallback[Fallback: target-users/search]
    Empty -->|Found| Exact[Exact Match]
    Fallback --> Exact
    
    Exact --> Phone{phoneNumber?}
    Phone -->|Present| Return[Return User]
    Phone -->|Missing| Direct[Direct Lookup: GET /target-users/:id]
    
    Direct --> Retry{Success?}
    Retry -->|Yes| Merge[Merge: base + phoneNumber]
    Retry -->|Transient| Direct
    Retry -->|404 / Persistent| Resilient[Return base without phone]
    
    Merge --> Return
    Resilient --> Return
```

**Flow:** Search → fallback if empty → if found but phone missing → direct lookup (with 1 retry on transient failure) → merge phone into base. On persistent failure (404, 500 after retry), return user without phone; log warning.

---

## 9. Vishing Call Workflow

How the system initiates outbound voice phishing simulations via ElevenLabs.

```mermaid
graph TD
    Start[/vishing/prompt] --> Config[Configure Scenario]
    Config --> Persona[Select Persona]
    Persona --> Pretext[Select Pretext]
    Pretext --> Target[Select Target]
    Target --> Caller[Select Caller Number]
    
    Caller --> Initiate[Initiate ElevenLabs Call]
    Initiate --> Call[Real-time Voice Conversation]
    Call --> Transcript[Transcript Captured]
    
    Transcript --> Summary[/vishing/conversations/summary]
    Summary --> LLM[LLM Debrief Summary]
    LLM --> Report[Return JSON Report]
```

**Endpoints**
- `POST /vishing/prompt` – Start vishing call with scenario config.
- `POST /vishing/conversations/summary` – Generate debrief summary from call transcript.

---

## 10. Localization Workflow (3-Level Fallback)

How we translate content without breaking it.

```mermaid
graph TD
    Start[Request Translation] --> Level1[Level 1: Direct Translation]
    
    Level1 --> Validate{Integrity Check?}
    
    Validate -->|Pass| Save[Save Language Key]
    Validate -->|Fail| Level2[Level 2: Retry with Guards]
    
    Level2 --> Validate2{Integrity Check?}
    
    Validate2 -->|Pass| Save
    Validate2 -->|Fail| Level3[Level 3: Auto-Repair / Basic]
    
    Level3 --> Save
```
