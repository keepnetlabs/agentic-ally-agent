# Testing Guide - Agentic Ally

This directory contains test utilities, factories, and setup for the Agentic Ally test suite.

## Structure

```
src/__tests__/
├── setup.ts              # Global test setup, utilities, mock helpers
├── factories/            # Test data factories for creating test objects
│   ├── error-factory.ts          # Create test error objects
│   ├── microlearning-factory.ts  # Create microlearning test data
│   └── context-factory.ts        # Create agent context objects
└── README.md             # This file
```

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm run test src/mastra/tools/code-review-check-tool.test.ts
```

## Test Configuration

- **Framework:** Vitest (configured in `vitest.config.ts`)
- **Coverage Targets:** 50% (lines, functions, branches, statements)
- **Reporter:** Default Vitest output

## Using Test Factories

Test factories help create consistent, realistic test data:

### Error Factory

```typescript
import { createTestError } from '../factories/error-factory';

const error = createTestError('API_ERROR', 'Connection failed', { retryable: true });
expect(error.name).toBe('API_ERROR');
```

### Microlearning Factory

```typescript
import { createTestMicrolearning } from '../factories/microlearning-factory';

const training = createTestMicrolearning({
  topic: 'Phishing Prevention',
  department: 'IT'
});
expect(training.scenes).toHaveLength(8);
```

### Context Factory

```typescript
import { createTestContext } from '../factories/context-factory';

const context = createTestContext({ userId: 'user-123' });
expect(context.userId).toBe('user-123');
```

## Test Organization

Tests are organized in two patterns:

### Pattern 1: Inline Tests
```
src/mastra/tools/some-tool.ts
src/mastra/tools/some-tool.test.ts  ← Same directory
```

### Pattern 2: Test Directory
```
src/mastra/services/some-service.ts
src/mastra/services/__tests__/some-service.test.ts  ← Subdirectory
```

Use Pattern 1 (inline) for unit tests of individual tools.
Use Pattern 2 (directory) for integration tests and service-level tests.

## Testing Patterns

### 1. Testing Tools

```typescript
import { describe, it, expect } from 'vitest';
import { myTool } from './my-tool';

describe('myTool', () => {
  it('should execute successfully', async () => {
    const result = await myTool.execute({
      input: 'test value'
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    const result = await myTool.execute({
      input: null
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### 2. Testing with Mocks

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('WorkflowExecutor', () => {
  it('should call KV service', async () => {
    const kvSpy = vi.spyOn(kvService, 'put');

    // Execute workflow
    await workflowExecutor.execute(input);

    expect(kvSpy).toHaveBeenCalled();
  });
});
```

### 3. Testing Async Operations

```typescript
import { describe, it, expect } from 'vitest';

describe('async operations', () => {
  it('should wait for completion', async () => {
    const result = await asyncOperation();
    expect(result).toBeDefined();
  });

  it('should timeout on failure', { timeout: 5000 }, async () => {
    // Test with custom timeout
  });
});
```

## Coverage Goals

| Component | Current | Target |
|-----------|---------|--------|
| Tools | ~70% | 80% |
| Workflows | ~65% | 75% |
| Services | ~60% | 70% |
| Utils | ~50% | 60% |
| Overall | ~67% | 70% |

## Common Test Utilities

### Error Handling

```typescript
import { normalizeError } from '../utils/core/error-utils';

try {
  // operation
} catch (error) {
  const normalized = normalizeError(error);
  expect(normalized.message).toBeDefined();
}
```

### Logging in Tests

Tests automatically capture logs. Access them:

```typescript
import { getLogger } from '../utils/core/logger';

const logger = getLogger('TestModule');
logger.info('Test message'); // Captured but not printed
```

## Best Practices

1. **Use Factories** - Don't create test data manually
2. **Isolate Tests** - Each test should be independent
3. **Mock External APIs** - Use Vitest mocks for external services
4. **Test Error Paths** - Include tests for failures, not just success
5. **Keep Tests Fast** - Use in-memory data, avoid I/O when possible
6. **Document Setup** - Add comments explaining non-obvious test logic

## Adding New Tests

1. Create test file in appropriate location
2. Use test factories for data creation
3. Follow existing patterns in codebase
4. Ensure test names describe behavior: `it('should return error when input is empty')`
5. Run `npm run test:coverage` to check impact on coverage

## Debugging Tests

```bash
# Run tests in debug mode
node --inspect-brk ./node_modules/vitest/vitest.mjs run src/mastra/tools/my-tool.test.ts

# Then open chrome://inspect in Chrome to debug
```

## Resources

- **Vitest Docs:** https://vitest.dev/
- **Testing Library:** https://testing-library.com/
- **Test Patterns:** See existing test files in `src/mastra/**/*.test.ts`
