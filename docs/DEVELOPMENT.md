# Development Guide

Setup, debugging, and best practices for developers.

## Local Development Setup

### Prerequisites
- Node.js 18+ with npm/yarn
- Cloudflare account (for API keys)
- OpenAI API key
- Text editor (VSCode recommended)

### Full Setup

```bash
# 1. Clone and install
git clone https://github.com/keepnetlabs/agentic-ally.git
cd agentic-ally/agent
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Add credentials
# Edit .env.local with your API keys (see QUICKSTART.md)

# 4. Start dev server (API)
npm run dev
```

---

## 🛠️ Testing the 8 Specialist Agents

Use these payloads to verify each specialist is working correctly.

### 1. Test Microlearning Agent (The Educator)
**Scenario:** Create a course.
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create 5-min phishing training for Finance team"}'
```

### 2. Test Phishing Agent (The Simulator)
**Scenario:** Create a simulation.
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a fake invoice email for HR dept"}'
```

### 3. Test Smishing Agent (The SMS Simulator)
**Scenario:** Create an SMS simulation.
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a smishing SMS for delivery update"}'
```

### 4. Test User Info Agent (The Analyst)
**Scenario 1: Risk Report (Report Mode)**
*Returns a detailed markdown analysis.*
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Who is john.doe@example.com? Analyze his risk."}'
```

**Scenario 2: Assignment Check (Assignment Mode)**
*Verifies ID existence without full report.*
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Assign training to group developers"}'
```

### 5. Test Policy Agent (The Expert)
**Scenario:** Ask a policy questions (RAG).
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is our company policy on remote work passwords?"}'
```

### 6. Test Email IR Analyst (The Incident Responder)
**Scenario:** Analyze a suspicious email (IR report).
```bash
curl -X POST http://localhost:8000/email-ir/analyze \
  -H "Content-Type: application/json" \
  -d '{"id":"email-12345","accessToken":"api-token-xyz","apiBaseUrl":"https://api.example.com"}'
```

### 7. Test Vishing Call Agent (The Voice Simulator)
**Scenario:** Generate debrief summary from vishing call transcript.
```bash
curl -X POST http://localhost:8000/vishing/conversations/summary \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"your-product-api-token-min-32-chars","messages":[{"role":"agent","text":"Hello, IT support here."},{"role":"user","text":"I did not request support."}]}'
```
*Note: `/vishing/prompt` initiates the call via ElevenLabs; the summary endpoint analyzes completed transcripts.*

### 8. Debug Autonomous Service (Proactive Loop)
Don't wait for Cron. Run the manual trigger script:
```bash
npx tsx src/debug-workflow.ts
```
*Logs detailed Emojis (🤖, ✅, ❌) to show exactly what step failed.*

---

## 🔄 Pre-deploy

- **Pre-deploy:** `npm run deploy` runs `npm run validate` first (format, lint, tests). If any fails, deploy is aborted.

---

## 🧪 Automated Testing (Vitest)

We have achieved **100% logic coverage** across the agent codebase.

### Running Tests
```bash
# Run all tests
npm test
# or
npx vitest run

# Run specific test file
npx vitest run src/mastra/index.test.ts

# Run integration/E2E flow tests only
npx vitest run src/mastra/__tests__/integration/
npx vitest run src/mastra/tools/vishing-call/vishing-flow.integration.test.ts
```

### E2E / Integration Flow Tests

Flow tests verify the full chain: **Tool → Workflow → KV** with mocked AI and external APIs.

| Test | Flow | Mocks |
|------|------|-------|
| `phishing-flow.integration.test.ts` | phishingWorkflowExecutorTool → createPhishingWorkflow | generateText, KV, getPolicySummary, ProductService |
| `smishing-flow.integration.test.ts` | smishingWorkflowExecutorTool → createSmishingWorkflow | generateText, KV, getPolicySummary, ProductService |
| `autonomous-flow.integration.test.ts` | executeAutonomousGeneration: group smishing, group phishing, user smishing, user phishing, reject validation | selectGroupTrainingTopic, getUserInfoTool, generateText, KV, phishingWorkflowExecutorTool, upload/assign tools |
| `vishing-flow.integration.test.ts` | getUserInfo → listPhoneNumbers → initiateVishingCall | global.fetch (Platform API, ElevenLabs) |

### Test Structure
| Type | Location | Coverage |
|------|----------|----------|
| **Unit** | `src/mastra/utils/**` | Helpers, Transformers, Prompts |
| **Integration** | `src/mastra/index.test.ts` | `/chat`, `/health`, `/autonomous` |
| **E2E / Flow** | `src/mastra/__tests__/integration/*.integration.test.ts` | Phishing/Smishing tool → workflow → KV |
| **Integration** | `src/mastra/tools/vishing-call/vishing-flow.integration.test.ts` | UserInfo → Vishing call chain |
| **Validation** | `src/mastra/schemas/**` | Zod Schemas & Data Models |
| **Config** | `src/mastra/deployer.test.ts` | Cloudflare Bindings |

---

## Logging (Structured JSON)

Logs are JSON-formatted for Datadog/Sentry. Each entry includes:

| Field | Description |
|-------|-------------|
| `service` | `agentic-ally` (filter by service) |
| `env` | `NODE_ENV` (development, production, test) |
| `correlationId` | Request trace ID (when in request context) |

**Env:** `LOG_LEVEL=debug|info|warn|error` overrides the default (development=debug, else=info).

---

## Debugging

### IDE Configuration (VSCode)
Use the included `.vscode/settings.json` for auto-formatting.

### Using Constants & Timing (CRITICAL)

**Rule:** Never use magic numbers. Import from `constants.ts`.

| Constant | Value | Usage |
|----------|-------|-------|
| `AGENT_CALL_TIMEOUT_MS` | 90,000 | Quick chats, simple queries. |
| `LONG_RUNNING_AGENT_TIMEOUT_MS` | **600,000** | **Microlearning Generation.** Any task that generates structure + content + emails. |

**Example:**
```typescript
import { TIMING, LONG_RUNNING_AGENT_TIMEOUT_MS } from '../constants';

// Good
await withTimeout(myLongTask(), LONG_RUNNING_AGENT_TIMEOUT_MS);
```

---

## Code Structure

```
src/mastra/
├── agents/             # All specialist agents
├── services/           # Core Logic (Autonomous, KV, Health, Error)
├── workflows/          # Parallel Execution Flows
└── constants.ts        # CENTRAL CONFIGURATION
```
