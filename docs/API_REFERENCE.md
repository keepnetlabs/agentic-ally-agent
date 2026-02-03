# API Reference

**Last Updated:** February 3, 2026

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

## 2. Autonomous Trigger (`POST /autonomous`)

Manually trigger the proactive generation loop. Useful for testing or on-demand batch runs.

### Headers
*   `Content-Type`: `application/json`
*   `X-AGENTIC-ALLY-TOKEN`: Required

### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Auth token (verification) |
| `actions` | array | Yes | `["training"]` or `["phishing"]` or both |
| `firstName` | string | No* | Target specific User by Name |
| `targetUserResourceId` | string | No* | Target specific User by ID (Preferred) |
| `targetGroupResourceId` | string | No* | Target a specific Group |
| `sendAfterPhishingSimulation` | boolean | No | Auto-send email (default: false) |

*\*Must specify either User (Name/ID) OR Group ID.*

**Example:**
```json
{
  "token": "secret-123",
  "actions": ["phishing"],
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

---

## 3. System Health (`GET /health`)

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

## 4. Code Review (`POST /code-review-validate`)

Internal tool endpoint used by agents to validate generated code snippets (e.g., HTML landing pages or JSON structures).

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

## 5. Email IR Analysis (`POST /email-ir/analyze`)

Analyze a suspicious email and generate an incident response report.

### Headers
| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Content-Type` | `application/json` | Yes | - |
| `X-AGENTIC-ALLY-TOKEN` | `<your-token>` | Yes | Auth token (set in `.env`) |

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
      "verdict": "SUSPICIOUS",
      "risk_level": "MEDIUM",
      "confidence": 62,
      "recommended_action": "Review"
    }
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
      "verdict": "CRITICAL THREAT",
      "risk_level": "HIGH",
      "confidence": 95,
      "recommended_action": "Quarantine"
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
      { "step": 1, "action": "Header analysis", "finding": "SPF/DKIM/DMARC failures" },
      { "step": 2, "action": "Behavioral analysis", "finding": "High urgency and verification avoidance" },
      { "step": 3, "action": "Intent analysis", "finding": "Credential harvesting detected" },
      { "step": 4, "action": "Triage", "finding": "Classified as Phishing with high confidence" }
    ],
    "blast_radius": {
      "affected_users": 12,
      "exposure_scope": "Finance and HR mailboxes",
      "potential_impact": "Credential theft and unauthorized transfers"
    },
    "actions_taken": [
      "Flagged email as suspicious"
    ],
    "actions_recommended": [
      "Quarantine email",
      "Alert recipients",
      "Reset credentials if clicked"
    ],
    "technical_details": {
      "sender_ip": "203.0.113.45",
      "sender_domain": "amaozn-secure.com",
      "phishing_url": "http://malicious.example.com/login",
      "authentication_status": { "spf": "fail", "dkim": "fail", "dmarc": "fail" },
      "geolocation": "Unexpected region for claimed sender",
      "email_routing": "Suspicious relay pattern"
    },
    "confidence_limitations": "Limited visibility into sender infrastructure.",
    "transparency_notice": "This report is AI-generated and requires human review."
  },
  "runId": "run_abc123"
}
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

## 🔒 Security Notes

1.  **Rate Limit:** 100 requests per minute per IP.
    *   `/chat`: 100 req/min
    *   `/health`: 300 req/min
    *   Others: 100 req/min
2.  **Sensitive Data Handling:**
    *   Avoid including personal identifiers in prompts.
    *   Agents should not expose personal identifiers in responses.
