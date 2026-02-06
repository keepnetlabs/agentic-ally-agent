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

## 🛠️ Testing the 7 Specialist Agents

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

### 7. Debug Autonomous Service (Proactive Loop)
Don't wait for Cron. Run the manual trigger script:
```bash
npx tsx src/debug-workflow.ts
```
*Logs detailed Emojis (🤖, ✅, ❌) to show exactly what step failed.*

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
```

### Test Structure
| Type | Location | Coverage |
|------|----------|----------|
| **Unit** | `src/mastra/utils/**` | Helpers, Transformers, Prompts |
| **Integration** | `src/mastra/index.test.ts` | `/chat`, `/health`, `/autonomous` |
| **Validation** | `src/mastra/schemas/**` | Zod Schemas & Data Models |
| **Config** | `src/mastra/deployer.test.ts` | Cloudflare Bindings |

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
