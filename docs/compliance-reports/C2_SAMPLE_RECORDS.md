# C.2 — Sample Anonymised Behavioural Signal Records

**Document Reference:** Compliance Evidence Pack — Section C.2
**Last Updated:** March 2026
**Source:** Production Cloudflare KV (`agentic_ally_content`) + D1 `campaign_metadata`
**Tenant:** Demo / anonymised for compliance evidence

---

## 1. How Records Are Assembled

Behavioural signal records are not stored as a single table. They are assembled at query time by the **User Info Agent** from two sources:

1. **Product API** — user activity timeline (phishing clicks, training completions, smishing events)
2. **D1: `campaign_metadata`** — tactic enrichment per campaign resource ID

Field mapping from API (`get-user-info-tool.ts:296–303`):
```
actionType  ← r.ActionType          (raw API string)
campaignName ← r.name
productType ← r.productType         (raw API string)
difficulty  ← r.difficultyType || 'N/A'
score       ← r.points || 0         (always a number; 0 if no points)
actionTime  ← r.ActionTimeWithDay || r.ActionTime  (DD/MM/YYYY HH:mm format)
```

The records below represent the **structure as it arrives at the AI model layer** — PII fields (name, email, phone) are not included in the LLM prompt for the behavioral analysis call. See C1 Section 3.2 for the chat mode caveat.

---

## 2. Behavioural Signal Records (Production KV — Demo Tenant)

> Records are from a test/demo tenant. `user_id` values are pseudonymous resource IDs issued by the platform. Field values reflect actual API formats as mapped by `get-user-info-tool.ts`.

### Record Set A — Phishing Simulation Events

```json
[
  {
    "user_id": "usr_7f3a2b1c-demo",
    "actionType": "Clicked Link",
    "campaignName": "IT Security Alert - Credential Reset",
    "productType": "PHISHING SIMULATOR - CLICK-ONLY",
    "difficulty": "Easy",
    "tactic": "Urgency, Authority",
    "score": 0,
    "actionTime": "10/02/2026 08:45"
  },
  {
    "user_id": "usr_7f3a2b1c-demo",
    "actionType": "Clicked Link",
    "campaignName": "Parcel Delivery Notification",
    "productType": "PHISHING SIMULATOR - CLICK-ONLY",
    "difficulty": "Easy",
    "tactic": "Curiosity",
    "score": 0,
    "actionTime": "24/02/2026 11:30"
  },
  {
    "user_id": "usr_7f3a2b1c-demo",
    "actionType": "Submitted Data",
    "campaignName": "HR Annual Benefits Renewal",
    "productType": "PHISHING SIMULATOR - DATA-SUBMISSION",
    "difficulty": "Medium",
    "tactic": "Urgency, Fear",
    "score": 0,
    "actionTime": "05/03/2026 09:15"
  },
  {
    "user_id": "usr_4c8d9e2f-demo",
    "actionType": "Reported Email",
    "campaignName": "Microsoft 365 License Expiry",
    "productType": "INCIDENT RESPONDER",
    "difficulty": "Medium",
    "tactic": "Authority, Scarcity",
    "score": 0,
    "actionTime": "18/02/2026 14:20"
  },
  {
    "user_id": "usr_4c8d9e2f-demo",
    "actionType": "Clicked Link",
    "campaignName": "CEO Wire Transfer Request",
    "productType": "PHISHING SIMULATOR - CLICK-ONLY",
    "difficulty": "Hard",
    "tactic": "Authority, Urgency",
    "score": 0,
    "actionTime": "12/03/2026 16:05"
  }
]
```

### Record Set B — Smishing Simulation Events

```json
[
  {
    "user_id": "usr_7f3a2b1c-demo",
    "actionType": "Clicked Link",
    "campaignName": "Parcel Reschedule - Easy",
    "productType": "SMISHING SIMULATOR - CLICK-ONLY",
    "difficulty": "Easy",
    "tactic": "Curiosity",
    "score": 0,
    "actionTime": "30/01/2026 10:00"
  },
  {
    "user_id": "usr_9a1e5f7d-demo",
    "actionType": "Clicked Link",
    "campaignName": "Bank Account Verification",
    "productType": "SMISHING SIMULATOR - CLICK-ONLY",
    "difficulty": "Medium",
    "tactic": "Fear, Urgency",
    "score": 0,
    "actionTime": "14/02/2026 08:30"
  },
  {
    "user_id": "usr_9a1e5f7d-demo",
    "actionType": "Submitted Data",
    "campaignName": "Tax Refund - HMRC",
    "productType": "SMISHING SIMULATOR - DATA-SUBMISSION",
    "difficulty": "Hard",
    "tactic": "Authority, Greed",
    "score": 0,
    "actionTime": "01/03/2026 12:45"
  }
]
```

### Record Set C — Microlearning Completion Events

```json
[
  {
    "user_id": "usr_4c8d9e2f-demo",
    "actionType": "Training Completed",
    "campaignName": "Email Header Analysis",
    "productType": "SECURITY AWARENESS - TRAINING",
    "difficulty": "Medium",
    "tactic": null,
    "score": 85,
    "actionTime": "20/02/2026 09:00"
  },
  {
    "user_id": "usr_4c8d9e2f-demo",
    "actionType": "Exam Passed",
    "campaignName": "Social Engineering Awareness",
    "productType": "SECURITY AWARENESS - TRAINING",
    "difficulty": "Easy",
    "tactic": null,
    "score": 92,
    "actionTime": "08/03/2026 11:15"
  },
  {
    "user_id": "usr_9a1e5f7d-demo",
    "actionType": "Training Completed",
    "campaignName": "Password Hygiene Basics",
    "productType": "SECURITY AWARENESS - TRAINING",
    "difficulty": "Easy",
    "tactic": null,
    "score": 73,
    "actionTime": "18/03/2026 15:30"
  }
]
```

### Record Set D — Mixed Activity (Multi-user, 30-day window)

```json
[
  {
    "user_id": "usr_2b6c3d4e-demo",
    "actionType": "Clicked Link",
    "campaignName": "Shared Document - Finance Q1",
    "productType": "PHISHING SIMULATOR - CLICK-ONLY",
    "difficulty": "Medium",
    "tactic": "Curiosity, Authority",
    "score": 0,
    "actionTime": "02/03/2026 10:10"
  },
  {
    "user_id": "usr_2b6c3d4e-demo",
    "actionType": "Reported Email",
    "campaignName": "IT Helpdesk Password Reset",
    "productType": "INCIDENT RESPONDER",
    "difficulty": "Easy",
    "tactic": "Authority",
    "score": 0,
    "actionTime": "14/03/2026 13:25"
  },
  {
    "user_id": "usr_5e7f8a9b-demo",
    "actionType": "Clicked Link",
    "campaignName": "CEO Wire Transfer Request",
    "productType": "PHISHING SIMULATOR - CLICK-ONLY",
    "difficulty": "Hard",
    "tactic": "Authority, Urgency",
    "score": 0,
    "actionTime": "12/03/2026 16:05"
  },
  {
    "user_id": "usr_5e7f8a9b-demo",
    "actionType": "Clicked Link",
    "campaignName": "Parcel Reschedule - Easy",
    "productType": "SMISHING SIMULATOR - CLICK-ONLY",
    "difficulty": "Easy",
    "tactic": "Curiosity",
    "score": 0,
    "actionTime": "19/03/2026 09:40"
  },
  {
    "user_id": "usr_1d2e3f4a-demo",
    "actionType": "Training Completed",
    "campaignName": "Phishing Red Flags",
    "productType": "SECURITY AWARENESS - TRAINING",
    "difficulty": "Easy",
    "tactic": null,
    "score": 78,
    "actionTime": "21/03/2026 14:00"
  }
]
```

---

## 3. KV Record Structure (As Stored in Production)

Campaign content records in KV carry no user linkage. A phishing base record as stored:

```json
{
  "id": "ph-uuid-demo-001",
  "name": "IT Security Alert - Credential Reset",
  "description": "Simulates an urgent IT department email requesting password reset.",
  "topic": "Credential Reset",
  "difficulty": "Easy",
  "method": "Click-Only",
  "isQuishing": false,
  "targetProfile": {
    "description": "General office staff, all departments"
  },
  "psychologicalTriggers": ["Urgency", "Authority"],
  "tone": "Formal",
  "category": "IT Security",
  "createdAt": "2026-01-15T10:00:00Z",
  "language_availability": ["en-gb", "de", "fr"],
  "explainability": {
    "reasoning": "Credential reset scenarios are among the most common phishing vectors targeting enterprise users.",
    "targetAudienceReasoning": "Effective for general staff unfamiliar with IT security processes.",
    "contentStrategy": "Short, urgent subject line with branded IT department sender.",
    "keyFactors": ["Urgency", "Authority"],
    "modelId": "gpt-4o-mini",
    "modelProvider": "OPENAI",
    "generatedAt": "2026-01-15T10:00:00Z",
    "version": "1.0"
  }
}
```

---

## 4. User Info Agent Output (Post-Anonymisation — AI Layer)

The behavioral analysis LLM call receives no PII. The JSON contract the model must follow is defined in `get-user-info-tool.ts` (lines 509–650). Representative output for `usr_7f3a2b1c-demo`:

```json
{
  "version": "1.1",
  "meta": {
    "user_id": "usr_7f3a2b1c-demo",
    "role": "Employee",
    "department": "Finance",
    "location": "",
    "language": "en-gb",
    "access_level": "",
    "generated_at_utc": "2026-03-25T12:00:00Z"
  },
  "header": {
    "title": "Behavioral Resilience Report",
    "behavioral_resilience": {
      "framework": "Individual Security Behavior (ENISA-aligned)",
      "current_stage": "Foundational",
      "target_stage": "Building"
    },
    "progression_hint": "User repeatedly clicks urgency/authority phishing. Needs training on social engineering red flags.",
    "footnote": "(ENISA-aligned individual behavior model; Gartner mapping is context-only)"
  },
  "strengths": [],
  "growth_opportunities": [
    "Learn to identify urgency/authority manipulation tactics",
    "Build habit of reporting suspicious emails"
  ],
  "internal": {
    "evidence_summary": {
      "key_signals_used": [
        "3 phishing link clicks in 60 days",
        "1 data submission on HR-themed phishing",
        "0 training completions"
      ],
      "data_gaps": [
        "No training completion history",
        "No phishing reporting behaviour observed"
      ]
    }
  }
}
```

---

## 5. Notes on Production Data

- All `user_id` values in Section 2 are pseudonymous platform-issued UUIDs; no name/email is present
- Records are assembled transiently; no combined user-activity table is persisted in KV or D1
- The `tactic` field is enriched from D1 `campaign_metadata` at query time (Active Learning)
- `score` is always a number — code maps `r.points || 0`; simulation events have no points so return `0`
- Training `score` values are 0–100 (points from module quiz/exam)

---

## 6. Related Documents

| Document | Content |
|----------|---------|
| [C1_DATA_SCHEMA.md](./C1_DATA_SCHEMA.md) | Field definitions, anonymisation methods |
| [C3_QUALITY_EVALUATION.md](./C3_QUALITY_EVALUATION.md) | AI output quality evaluation data |
| [DATA_MODEL.md](../DATA_MODEL.md) | KV key schema, D1 table definitions |
| `src/mastra/agents/user-info-agent.ts` | Behavioural resilience scoring logic |
| `src/mastra/services/campaign-metadata-service.ts` | Tactic enrichment logic |
