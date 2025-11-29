# Architecture Documentation

## System Overview

Agentic Ally uses a **Context-Aware Multi-Agent Architecture** orchestrated by a semantic router. It is built on the **Mastra** framework and deployed on **Cloudflare Workers**.

The system is designed to handle specialized tasks through dedicated agents, utilizing a **"Pass-the-Baton"** strategy where the Orchestrator not only routes the request but also passes the **Task Context** derived from previous conversations.

## Core Components

### 1. Routing Layer (The Brain)

The entry point for all user interactions is the **Agent Router Service**.

- **Router Service (`agent-router.ts`)**: 
  - Receives user prompt + conversation history.
  - Consults the `orchestratorAgent` for a decision.
  - **Intelligent Parsing:** Parses complex Vercel AI SDK message structures (Tool Calls, Multi-modal).
  - **Routing Logic:** Prioritizes Semantic Decision but includes strictly defined Semantic Rules.

- **Orchestrator Agent (`orchestrator-agent.ts`)**:
  - **Role:** Decision Maker & Project Manager.
  - **Logic:** Analyzes intent + context.
  - **Context Injection:** Does not just output the agent name. It extracts the **Task Context** (e.g., "User wants to create the recommended Phishing training for John") and passes it to the next agent.
  - **Output:** JSON `{ "agent": "agentName", "taskContext": "..." }`.

### 2. Specialist Agents (The Workers)

We have 3 specialized agents, each with a distinct role and capabilities:

| Agent Name | Role | Capabilities | Responsibility |
|------------|------|--------------|----------------|
| **microlearningAgent** | Corporate Trainer | **Smart Defaults**, History Awareness | Creates courses. Uses **"Assumption Mode"** to auto-fill Topic/Dept/Level if available in history or context. |
| **phishingEmailAssistant** | Social Engineer | Phishing Templates | Generates phishing email templates. |
| **userInfoAssistant** | Security Analyst | **Risk Analysis**, **Level Inference** | Searches user details AND analyzes their timeline to recommend a **Risk Level** and **Training Level**. |

### 3. Context & Security Layer

- **Middleware (`context-storage.ts`)**:
  - Extracts `X-AGENTIC-ALLY-TOKEN` header.
  - Initializes `AsyncLocalStorage`.

- **Request Storage (`request-storage.ts`)**:
  - Stores the user token in an isolated, request-scoped store.
  - Allows tools (`getUserInfo`) to access the token safely without passing it through the LLM prompt.

- **Memory**:
  - All agents share the same `threadId` and `resource` (`agentic-ally-user`).
  - **Context Continuity:** This allows Microlearning Agent to "remember" what UserInfo Agent discovered about a user.

## Data Flow & "Pass-the-Baton" Pattern

```mermaid
graph TD
    User[User Request] -->|HTTP POST| API[/api/chat]
    API --> Middleware[Context Storage Middleware]
    Middleware --> Router[Agent Router Service]
    Router -->|Prompt + History| Orchestrator[Orchestrator Agent]
    Orchestrator -->|{ agent, taskContext }| Router
    
    Router -->|Inject Context into Prompt| AgentA[Microlearning Agent]
    Router -->|Route| AgentB[Phishing Agent]
    Router -->|Route| AgentC[User Info Agent]
    
    AgentC -->|Call Tool| Tool[Get User Info]
    Tool -->|Derived Data (Level/Risk)| AgentC
    
    AgentC -->|Output Recommendation| Memory[Shared Memory]
    Memory -->|Read History| AgentA
```

## Key Workflows (The Happy Paths)

### 1. The "Create It Then" Flow (Context Handover)
1. **User:** "Create training for Dogukan"
2. **Orchestrator:** Routes to `userInfoAssistant`.
3. **UserInfoAgent:** Finds Dogukan, analyzes timeline. Returns: **"Risk: High. Recommended Level: Beginner."**
4. **User:** "Create it then" (Ambiguous command).
5. **Orchestrator:**
   - Detects "Action Trigger".
   - Extracts context: *"User wants to create recommended Beginner training for Dogukan."*
   - Routes to `microlearningAgent` with this **Task Context**.
6. **MicrolearningAgent:**
   - Sees the context.
   - Applies **Smart Defaults** (Topic: From context, Level: Beginner).
   - Skips questions and jumps to Summary.

### 2. The "Fill Auto" Flow (Explicit Assumption)
1. **User:** "Create training. Fill auto."
2. **MicrolearningAgent:**
   - Detects "Fill auto" keyword.
   - Applies generic defaults (Topic: General Security, Dept: All, Level: Intermediate).
   - Jumps to Summary immediately.

## Tech Stack

- **Framework:** Mastra 0.1.x
- **Runtime:** Cloudflare Workers
- **Storage:** Cloudflare D1 (Vector/Relational) + KV
- **LLM:** OpenAI (GPT-4o) / Workers AI
- **Language:** TypeScript

---
*Last Updated: Enhanced Context-Aware Multi-Agent Architecture*
