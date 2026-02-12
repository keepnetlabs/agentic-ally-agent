# API Reference

**Last Updated:** February 6, 2026

This document details the REST API endpoints available in Agentic Ally.

**Base URL:** `https://<your-worker-subdomain>.workers.dev` (Production)
**Local URL:** `http://localhost:8000`

---

## 1. Chat Completion (`POST /chat`)

The primary endpoint for interacting with the Multi-Agent System.

### Headers
| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Content-Type` | `application/json` | Yes | - |
| `X-AGENTIC-ALLY-TOKEN` | `<your-token>` | Yes | Auth token (set in `.env`) |

### Request Body
```json
{
  "prompt": "Create phishing email for IT",
  "modelProvider": "openai", // Optional (default: openai)
  "model": "gpt-4o-mini",   // Optional
  "routingContext": {       // Optional: Context injection
    "userId": "123",
    "department": "IT"
  }
}
```

### Response (Streamed)
Returns a Server-Sent Events (SSE) stream or JSON stream depending on client.
**Standard JSON Response:**
```json
{
  "role": "assistant",
  "content": "Here is the phishing email simulation...",
  "agent": "phishingEmailAssistant"
}
```

---

## 2. Smishing Chat (`POST /smishing/chat`)

Chat endpoint for the smishing role-play scene used in microlearning.

### Headers
| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Content-Type` | `application/json` | Yes | - |
| `X-AGENTIC-ALLY-TOKEN` | `<your-token>` | No | Public unauthenticated endpoint (optional) |

### Request Body
```json
{
  "microlearningId": "ml-123",
  "language": "en-gb",
  "messages": [
    { "role": "user", "content": "Hello?" }
  ],
  "modelProvider": "openai",
  "model": "gpt-4o-mini"
}
```

### Response (Initial Prompt)
If `messages` is omitted or empty, returns the prompt and first message.
```json
{
  "success": true,
  "microlearningId": "ml-123",
  "language": "en-gb",
  "prompt": "You are the SMS simulation agent...",
  "firstMessage": "Hi, your delivery is pending verification.",
  "isFinished": false
}
```

### Response (Chat Reply)
```json
{
  "success": true,
  "microlearningId": "ml-123",
  "language": "en-gb",
  "reply": "Can you confirm your address?",
  "isFinished": false
}
```

### `isFinished` Behavior
- `isFinished: false` -> role-play continues.
- `isFinished: true` -> final debrief/security guidance message; frontend can close chat flow and move user to completion UI.

### Frontend State Machine
- `idle` -> no API call yet.
- `initializing` -> call `POST /smishing/chat` without `messages`.
- `chatting` -> append user/assistant messages and call `POST /smishing/chat` with `messages`.
- `completed` -> switch when response includes `isFinished: true`.
- `error` -> switch when API returns non-2xx or `success: false`.

### Frontend Example (TypeScript)
```ts
type SmishingMessage = { role: 'user' | 'assistant' | 'system'; content: string };

type SmishingChatResponse = {
  success: boolean;
  microlearningId: string;
  language: string;
  prompt?: string;
  firstMessage?: string;
  reply?: string;
  isFinished?: boolean;
  error?: string;
};

async function callSmishingChat(params: {
  apiBaseUrl: string;
  token: string;
  microlearningId: string;
  language: string;
  messages?: SmishingMessage[];
}) {
  const res = await fetch(`${params.apiBaseUrl}/smishing/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AGENTIC-ALLY-TOKEN': params.token,
    },
    body: JSON.stringify({
      microlearningId: params.microlearningId,
      language: params.language,
      messages: params.messages,
    }),
  });

  const data = (await res.json()) as SmishingChatResponse;
  if (!res.ok || !data.success) throw new Error(data.error || 'Smishing chat failed');
  return data;
}

// 1) Init call (no messages) -> prompt + firstMessage + isFinished:false
const init = await callSmishingChat({
  apiBaseUrl: 'http://localhost:8000',
  token: '<your-token>',
  microlearningId: 'ml-123',
  language: 'en-gb',
});

// 2) Continue chat
const next = await callSmishingChat({
  apiBaseUrl: 'http://localhost:8000',
  token: '<your-token>',
  microlearningId: 'ml-123',
  language: 'en-gb',
  messages: [{ role: 'user', content: 'Is this legit?' }],
});

if (next.isFinished) {
  // show completion/debrief state
} else {
  // append next.reply and continue
}
```

---

## 3. Autonomous Trigger (`POST /autonomous`)

Manually trigger the proactive generation loop. Useful for testing or on-demand batch runs.

### Headers
*   `Content-Type`: `application/json`
*   `X-AGENTIC-ALLY-TOKEN`: Not required (public unauthenticated endpoint)

### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Auth token (verification) |
| `actions` | array | Yes | Any combination of `["training"]`, `["phishing"]`, `["smishing"]` |
| `firstName` | string | No* | Target specific User by Name |
| `targetUserResourceId` | string | No* | Target specific User by ID (Preferred) |
| `targetGroupResourceId` | string | No* | Target a specific Group |
| `sendAfterPhishingSimulation` | boolean | No | Auto-send email (default: false) |

*\*Must specify either User (Name/ID) OR Group ID.*

**Example:**
```json
{
  "token": "secret-123",
  "actions": ["phishing", "smishing"],
  "targetGroupResourceId": "ALL_VULNERABLE_USERS",
  "sendAfterPhishingSimulation": false
}
```

### Response
```json
{
  "success": true,
  "status": "processing",
  "message": "Autonomous generation started in background."
}
```

### Response (Completed / Inline Fallback)
When workflow binding is unavailable (for example in local development), the endpoint may execute inline and return a completed payload.

```json
{
  "success": true,
  "status": "completed",
  "actions": ["training", "smishing"],
  "message": "User analysis and content generation completed",
  "userInfo": {
    "targetUserResourceId": "12345",
    "fullName": "Alex Morgan",
    "department": "IT",
    "email": "alex@example.com",
    "preferredLanguage": "en-gb"
  },
  "phishingResult": {
    "success": true,
    "message": "Phishing simulation generated"
  },
  "trainingResult": {
    "success": true,
    "message": "Training module generated"
  },
  "smishingResult": {
    "success": false,
    "error": "No recommended smishing content found in analysis report"
  }
}
```

### Result Object Semantics
- `phishingResult`, `trainingResult`, `smishingResult` appear only for requested actions.
- Each action result follows:
  - `success: true` with `message` when generation succeeded.
  - `success: false` with `error` when generation failed or no recommendation was available.
- If `status` is `processing`, action results are not returned yet (background execution).

---

## 4. System Health (`GET /health`)

Diagnostic endpoint for uptime checks and dependency validation.

### Headers
*   No Auth Required (Public Status Page compatible)

### Response
```json
{
  "success": true,
  "status": "healthy", // or "degraded", "unhealthy"
  "message": "Agentic Ally deployment successful",
  "details": {
    "openai": "connected",
    "kv": "connected",
    "vector_db": "connected"
  }
}
```

---

## 5. Code Review (`POST /code-review-validate`)

Internal tool endpoint used by agents to validate generated code snippets (e.g., HTML landing pages or JSON structures).

### Headers
| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Content-Type` | `application/json` | Yes | - |
| `X-AGENTIC-ALLY-TOKEN` | `<your-token>` | No | Public unauthenticated endpoint (optional) |

### Request
```json
{
  "code": "<html>...</html>",
  "language": "html",
  "requirements": ["no-external-scripts", "accessible"]
}
```

### Response
```json
{
  "success": true,
  "data": {
    "isCorrect": true,
    "feedback": "Code is valid.",
    "severity": "info"
  }
}
```

---

## 6. Email IR Analysis (`POST /email-ir/analyze`)

Analyze a suspicious email and generate an incident response report.

### Headers
| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Content-Type` | `application/json` | Yes | - |
| `X-AGENTIC-ALLY-TOKEN` | `<your-token>` | No | Public unauthenticated endpoint (optional) |

### Request Body
```json
{
  "id": "email-12345",
  "accessToken": "api-token-xyz",
  "apiBaseUrl": "https://api.example.com"
}
```

### Response
```json
{
  "success": true,
  "report": {
    "executive_summary": {
      "email_category": "Other Suspicious",
      "verdict": "Suspicious Activity Detected - Review Recommended",
      "risk_level": "Medium",
      "confidence": 0.62,
      "evidence_strength": "Moderate",
      "confidence_basis": "Based on behavioral and contextual indicators.",
      "status": "Analysis Complete"
    },
    "agent_determination": "The message shows suspicious social engineering signals and needs review.",
    "risk_indicators": {
      "observed": ["Urgency framing present"],
      "not_observed": ["No confirmed malware attachment"]
    },
    "evidence_flow": [
      {
        "step": 1,
        "title": "Email Triage",
        "description": "Classified as suspicious for analyst review.",
        "finding_label": "FLAG"
      },
      {
        "step": 2,
        "title": "Final Verdict",
        "description": "Final category assigned.",
        "finding_label": "Other Suspicious"
      }
    ],
    "actions_recommended": {
      "p1_immediate": [],
      "p2_follow_up": ["Validate sender and notify target user"],
      "p3_hardening": ["Tune detection rules for similar patterns"]
    },
    "confidence_limitations": "Moderate confidence. Human review recommended before taking action."
  },
  "runId": "run_abc123"
}
```

---

### Full Report Schema (Example)
```json
{
  "success": true,
  "report": {
    "executive_summary": {
      "email_category": "Phishing",
      "verdict": "Phishing Confirmed - Immediate Action Required",
      "risk_level": "High",
      "confidence": 0.95,
      "evidence_strength": "Strong",
      "confidence_basis": "Based on behavioral and contextual indicators.",
      "status": "Analysis Complete",
      "why_this_matters": "Potential credential compromise and lateral movement risk."
    },
    "agent_determination": "This email is a sophisticated phishing attempt impersonating a trusted vendor.",
    "risk_indicators": {
      "observed": [
        "Authority impersonation",
        "Domain typosquatting",
        "Credential request",
        "High urgency framing"
      ],
      "not_observed": [
        "Malware attachment"
      ]
    },
    "evidence_flow": [
      {
        "step": 1,
        "title": "Email Triage and Initial Receipt",
        "description": "Email received and triaged as suspicious.",
        "finding_label": "PASS"
      },
      {
        "step": 2,
        "title": "Header and Authentication Analysis",
        "description": "Authentication checks and sender trust evaluated.",
        "finding_label": "FLAG"
      },
      {
        "step": 3,
        "title": "Intent and Content Examination",
        "description": "Credential-harvest pattern detected.",
        "finding_label": "ALERT"
      },
      {
        "step": 4,
        "title": "Final Verdict and Reporting",
        "description": "Classified as phishing with high confidence.",
        "finding_label": "Phishing"
      }
    ],
    "actions_recommended": {
      "p1_immediate": ["Quarantine email", "Block sender domain"],
      "p2_follow_up": ["Alert recipients", "Reset credentials if clicked"],
      "p3_hardening": ["Tune anti-phishing rules"]
    },
    "confidence_limitations": "High confidence in determination. Multiple independent signals converge on this verdict."
  },
  "runId": "run_abc123"
}
```

### `finding_label` Canonical Values (Frontend)
- Non-final `evidence_flow` steps should use: `PASS`, `FLAG`, `ALERT`, `HIGH`.
- Final `evidence_flow` step must use the exact value of `report.executive_summary.email_category`.
- Final-step category labels:
  - `Spam`
  - `Marketing`
  - `Internal`
  - `CEO Fraud`
  - `Phishing`
  - `Sextortion`
  - `Malware`
  - `Security Awareness`
  - `Other Suspicious`
  - `Benign`

Example FE mapping:
```ts
const findingLabelToBadge: Record<string, 'neutral' | 'info' | 'warning' | 'danger' | 'success'> = {
  PASS: 'success',
  FLAG: 'warning',
  ALERT: 'danger',
  HIGH: 'danger',
  Spam: 'info',
  Marketing: 'info',
  Internal: 'info',
  'CEO Fraud': 'danger',
  Phishing: 'danger',
  Sextortion: 'danger',
  Malware: 'danger',
  'Security Awareness': 'neutral',
  'Other Suspicious': 'warning',
  Benign: 'success',
};
```

---

### Error Responses

**400 - Invalid input**
```json
{
  "success": false,
  "error": "Invalid input",
  "details": {
    "id": { "_errors": ["Required"] }
  }
}
```

**500 - Workflow failure**
```json
{
  "success": false,
  "error": "Workflow execution failed"
}
```

---

## Security Notes

1.  **Correlation Header:** every response includes `X-Correlation-ID`. If caller sends one, it is propagated; otherwise service generates one.
2.  **Auth Model:**
    *   Requires `X-AGENTIC-ALLY-TOKEN` by default.
    *   Public unauthenticated endpoints: `/autonomous`, `/code-review-validate`, `/vishing/prompt`, `/smishing/chat`, `/email-ir/analyze`.
    *   Internal auth-skip endpoints: `/health`, `/__refresh`, `/__hot-reload-status`, `/api/telemetry`.
3.  **Rate Limit Tiers (per IP):**
    *   Public unauthenticated endpoints: `180 req/min`
    *   General default: `100 req/min`
    *   Health endpoint: skipped from global limiter in `index.ts`
4.  **Sensitive Data Handling:**
    *   Avoid including personal identifiers in prompts.
    *   Agents should not expose personal identifiers in responses.

