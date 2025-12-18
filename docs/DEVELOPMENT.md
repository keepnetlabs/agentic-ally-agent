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
git clone https://github.com/your-org/agentic-ally.git
cd agentic-ally/agent
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Add credentials
# Edit .env.local with your API keys (see QUICKSTART.md)

# 4. Start dev server
npm run dev

# 5. Open in editor
code .
```

## IDE Configuration (VSCode)

### Recommended Extensions
- ESLint - Code quality
- Prettier - Code formatting
- Thunder Client - API testing
- Cloudflare Workers - Worker development

### .vscode/settings.json
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Code Structure Overview

### Key Directories

```
src/mastra/
├── agents/
│   └── microlearning-agent.ts          # Main conversational agent (formerly agentic-ally)
├── tools/
│   ├── analyze-user-prompt-tool.ts    # Intent parsing
│   ├── workflow-executor-tool.ts      # Main orchestrator
│   ├── scene-generators/              # 8 scene content generators
│   └── inbox-generators/              # Email/SMS generation
├── workflows/
│   ├── create-microlearning-workflow.ts
│   └── add-language-workflow.ts
├── services/
│   ├── kv-service.ts                  # KV API wrapper
│   ├── example-repo.ts                # Semantic search
│   ├── microlearning-service.ts       # In-memory cache
│   └── remote-storage-service.ts      # Fallback storage
├── types/
│   ├── microlearning.ts               # Data interfaces
│   └── prompt-analysis.ts
├── schemas/                           # Zod validation
├── utils/
│   ├── language-utils.ts
│   ├── video-selector.ts
│   ├── url-resolver.ts
│   └── content-processors/
├── data/
│   ├── video-database.json
│   └── transcript-database.json
└── index.ts                           # Server entry point
```

## Development Workflow

### 1. Making Changes

```bash
# Create feature branch
git checkout -b feature/new-language-support

# Make changes
# Test locally with: npm run dev

# Type check
npm run typecheck

# Format code
npm run format

# Commit
git add .
git commit -m "feat: add new language support"

# Push
git push origin feature/new-language-support
```

### 2. Testing Locally

**Via API:**
```bash
# Start server
npm run dev

# In another terminal, test endpoint
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create phishing training"}'
```

**Via Thunder Client (VSCode):**
1. Open Thunder Client extension
2. New Request → POST
3. URL: `http://localhost:8000/chat`
4. Body: `{"prompt": "Create phishing training"}`
5. Send

**Via Console Logs:**
```typescript
// In your tool/workflow
console.log('🔍 Debug info:', variable);
console.log('⚠️ Warning:', error);
console.log('❌ Error:', error.message);
console.log('✅ Success:', result);
```

## Using Constants & Timing

### Avoid Magic Numbers

All timing and limit values are centralized in `src/mastra/constants.ts`:

```typescript
// Good: Use constants
import { TIMING, LIMITS } from '../constants';

const delay = TIMING.KV_RETRY_DELAY_MS;  // 500ms
const maxRetries = TIMING.KV_MAX_RETRIES; // 10
const contextSize = LIMITS.CONTEXT_WINDOW_SIZE; // 10

// Avoid: Magic numbers scattered
setTimeout(() => { }, 500);  // Where does 500 come from?
await retry(functionName, 10); // Why 10 attempts?
```

### When Adding Timing Constants

1. Define in `constants.ts` under `TIMING`:
```typescript
export const TIMING = {
  MY_NEW_TIMEOUT_MS: 5000,  // Clear unit (MS)
};
```

2. Use throughout codebase:
```typescript
setTimeout(cleanup, TIMING.MY_NEW_TIMEOUT_MS);
```

3. Benefits:
- ✅ Single source of truth
- ✅ Easy A/B testing (change one value)
- ✅ Self-documenting (clear intent)
- ✅ Maintainability

---

## Common Tasks

### Adding a New Tool

1. **Create the file:**
```bash
touch src/mastra/tools/my-new-tool.ts
```

2. **Implement the tool:**
```typescript
import { Tool } from '@mastra/core/tools';
import { z } from 'zod';

const MyToolSchema = z.object({
  input: z.string().describe('What it does')
});

const OutputSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional()
});

export const myNewTool = new Tool({
  id: 'my_new_tool',
  description: 'What this tool does',
  inputSchema: MyToolSchema,
  outputSchema: OutputSchema,
  execute: async (context: any) => {
    try {
      const input = context?.inputData || context;
      // Implement logic here
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('❌ Tool failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});
```

3. **Register in agent:**
```typescript
// src/mastra/agents/microlearning-agent.ts
import { myNewTool } from '../tools/my-new-tool';

export const agenticAlly = new Agent({
  // ...
  tools: {
    workflowExecutor: workflowExecutorTool,
    knowledgeSearch: knowledgeSearchTool,
    myNewTool: myNewTool  // Add here
  }
  // ...
});
```

4. **Update agent instructions:**
```typescript
// In buildInstructions():
// Add description of when to use myNewTool
```

### Adding a New Language

1. **Add detection pattern** in `language-utils.ts`:
```typescript
// In detectLanguageFallback()
if (/[한글]/.test(text)) return 'ko';  // Korean example
```

2. **Add UI strings** in `app-texts.ts`:
```typescript
const appTexts: Record<string, Record<string, string>> = {
  ko: {
    loading: '로딩 중...',
    nextSection: '다음',
    // ... add all strings
  }
};
```

3. **Add transcripts** in `transcript-database.json`:
```json
{
  "video_id": {
    "ko": "Korean transcript..."
  }
}
```

4. **Test the workflow:**
```bash
npm run dev

# Then test with Korean input:
curl -X POST http://localhost:8000/chat \
  -d '{"prompt": "한국어로 보안 교육을 만들어주세요"}'
```

### Modifying Scene Generation

Scene generators are in `src/mastra/tools/scene-generators/`:

1. Find the scene: `scene{1-8}-generator.ts`
2. Edit the prompt function
3. Test locally: `npm run dev`
4. Example - modify Scene 5 (Quiz):

```typescript
// src/mastra/tools/scene-generators/scene5-quiz-generator.ts

export function generateScene5Prompt(analysis: PromptAnalysis, microlearning: MicrolearningContent): string {
  return `Create a quiz for ${analysis.topic}...
    // Your modifications here
  `;
}
```

## Debugging Techniques

### 1. Console Logging

Use emoji prefixes for clarity:
```typescript
console.log('🔍 Debug:', variable);      // Info
console.log('⚠️ Warning:', status);      // Warnings
console.log('❌ Error:', error);         // Errors
console.log('✅ Success:', result);      // Success
console.log('🤖 AI:', response);        // AI operations
console.log('📦 Data:', structure);     // Data operations
```

### 2. Check State Machine Flow

In agent responses, look for state progression:
```
STATE 1: "What topic would you like to teach?" → Topic collected
STATE 2: Shows summary → Awaits confirmation
STATE 3: "Executing workflow..." → Processing
STATE 4: "Training URL: https://..." → Complete
```

### 3. Verify KV Keys

When checking what's stored:
```typescript
// In any tool/workflow
const kvService = new KVService();
const baseKey = `ml:phishing-101:base`;
const langKey = `ml:phishing-101:lang:en`;
const inboxKey = `ml:phishing-101:inbox:it:en`;

// All should exist after successful generation
```

### 4. Check JSON Corruption

If JSON parsing fails, look at error:
```typescript
// The system auto-repairs with jsonrepair
try {
  const fixed = cleanResponse(malformedJson, 'section-name');
  console.log('✅ JSON repaired');
} catch (e) {
  console.log('❌ Could not repair:', e);
}
```

### 5. Monitor API Calls

Check in server logs:
```
🤖 Analyzing user prompt...
✨ Using semantic-enhanced schema hints
📦 Tool returning inbox content: object
✅ Generated inbox content validated
```

## Performance Tips

### 1. Parallel Processing

The system already does this, but when adding features:
```typescript
// Good: Parallel execution
const [result1, result2] = await Promise.all([
  operation1(),
  operation2()
]);

// Avoid: Sequential when parallelizable
const result1 = await operation1();
const result2 = await operation2();
```

### 2. Fire-and-Forget Saves

Don't await KV saves on critical paths:
```typescript
// Good: Fire-and-forget
kvService.put(key, data).catch(err => console.error('KV save failed:', err));

// Avoid: Blocking
await kvService.put(key, data);
```

### 3. Caching

Use singleton services for reusable data:
```typescript
const repo = ExampleRepo.getInstance();  // Returns same instance
const examples = await repo.searchTopK(query, 3);
```

## Testing Best Practices

### Unit Testing Pattern
```typescript
// src/mastra/tools/__tests__/my-tool.test.ts
import { myNewTool } from '../my-new-tool';

describe('myNewTool', () => {
  it('should handle valid input', async () => {
    const result = await myNewTool.execute({
      inputData: { input: 'test' }
    });
    expect(result.success).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const result = await myNewTool.execute({
      inputData: { input: null }
    });
    expect(result.success).toBe(false);
  });
});
```

### Integration Testing
```bash
# Test full workflow locally
npm run dev

# Then in another terminal:
curl -X POST http://localhost:8000/chat -d '{"prompt": "test"}'
```

## Common Issues & Solutions

### Issue: "Module not found"
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

### Issue: API key invalid
- Check `.env.local` for extra spaces
- Verify key hasn't expired in dashboard
- Test key directly with provider's CLI

### Issue: TypeScript errors
```bash
# Check all types
npm run typecheck

# Fix auto-fixable issues
npx eslint --fix src/
```

### Issue: Slow local development
- Check your internet connection (API calls are remote)
- Verify Cloudflare Workers AI is available
- Monitor OpenAI quota usage

### Issue: Changes not reflecting
```bash
# Full restart of dev server
npm run dev
# Stop with Ctrl+C and restart
```

## Code Quality Standards

### Type Safety
```typescript
// Good: Strict types
function processData(data: MicrolearningContent): void { }

// Avoid: Any types
function processData(data: any): void { }
```

### Error Handling
```typescript
// Good: 3-level fallback
try {
  return primary();
} catch {
  try {
    return fallback1();
  } catch {
    return fallback2();
  }
}

// Avoid: Unhandled errors
const result = primaryFunction(); // Throws if fails
```

### Naming
```typescript
// Good: Descriptive
const isLoading = true;
const handleSubmit = () => { };

// Avoid: Unclear
const loading = true;
const submit = () => { };
```

## Useful Commands

```bash
npm run dev              # Start local server
npm run build            # Build for production
npm run typecheck        # Check TypeScript
npm run deploy           # Deploy to Cloudflare
npm run format           # Format code with Prettier
npm run lint             # Check code quality
npm test                 # Run tests (if available)
```

## Next Steps

1. **Understand the flow:** Read [ARCHITECTURE.md](./ARCHITECTURE.md) (state machine, middleware layers, logging)
2. **Learn workflows:** Read [WORKFLOWS.md](./WORKFLOWS.md)
3. **Data structures:** Read [DATA_MODEL.md](./DATA_MODEL.md)
4. **Deploy:** Read [DEPLOYMENT.md](./DEPLOYMENT.md)
5. **System overview:** Read [OVERVIEW.md](./OVERVIEW.md) for big picture

---

**Last Updated:** December 18, 2025
**New Sections:** Using Constants & Timing, Rate Limiting

Need help? Check [FAQ.md](./FAQ.md) or look at existing tools for examples.

---

## Quick Reference: Constants Pattern

### Constants
```typescript
import { TIMING, LIMITS } from '../constants';
setTimeout(fn, TIMING.KV_RETRY_DELAY_MS);
const size = LIMITS.CONTEXT_WINDOW_SIZE;
```
