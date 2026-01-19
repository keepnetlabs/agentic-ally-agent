# Workflow Documentation

**Last Updated:** January 10, 2026

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

---

## 4. Policy Expert Workflow

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

## 5. User Risk Analysis Workflow

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

## 6. Localization Workflow (3-Level Fallback)

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
