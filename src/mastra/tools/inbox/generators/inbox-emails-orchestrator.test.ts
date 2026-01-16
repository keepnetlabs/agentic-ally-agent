
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateInboxEmailsParallel } from './inbox-emails-orchestrator';
import { generateText } from 'ai';
import { getLogger } from '../../../utils/core/logger';
import { withRetry } from '../../../utils/core/resilience-utils';

// Mock dependencies
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('../../../utils/core/logger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock('../../../utils/core/resilience-utils', () => ({
  withRetry: vi.fn((fn) => fn()),
}));

vi.mock('../../../services/error-service', () => ({
  errorService: {
    aiModel: vi.fn((msg) => ({ message: msg })),
  },
}));

vi.mock('../../../utils/core/error-utils', () => ({
  logErrorInfo: vi.fn(),
}));

describe('Inbox Emails Orchestrator', () => {
  const mockModel = { modelId: 'test-model' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockEmailResponse = (id: string, subject: string) => ({
    text: JSON.stringify({
      id,
      sender: { name: 'Test Sender', email: 'test@example.com' },
      subject,
      preview: 'Preview text',
      content: '<p>Content</p>',
      timestamp: '1 hour ago',
      isPhishing: false,
      headers: { 'X-Test': 'true' },
      difficulty: 'EASY',
    }),
  });

  it('should successfully generate emails in parallel', async () => {
    // Mock successful 4 email generations (one for each variant)
    (generateText as any)
      .mockResolvedValueOnce(createMockEmailResponse('1', 'Obvious Phishing'))
      .mockResolvedValueOnce(createMockEmailResponse('2', 'Sophisticated Phishing'))
      .mockResolvedValueOnce(createMockEmailResponse('3', 'Casual Legit'))
      .mockResolvedValueOnce(createMockEmailResponse('4', 'Formal Legit'));

    const result = await generateInboxEmailsParallel({
      topic: 'Test Topic',
      languageCode: 'en-US',
      category: 'Security',
      riskArea: 'Phishing',
      level: 'Beginner',
      department: 'IT',
      model: mockModel,
    });

    expect(result).toHaveLength(4);
    expect(result[0].subject).toBe('Obvious Phishing');
    expect(result[1].subject).toBe('Sophisticated Phishing');
    expect(generateText).toHaveBeenCalledTimes(4);
  });

  it('should handle partial failures gracefully', async () => {
    // Mock 2 successes and 2 failures
    (generateText as any)
      .mockResolvedValueOnce(createMockEmailResponse('1', 'Email 1'))
      .mockRejectedValueOnce(new Error('Generation failed')) // Will trigger retry logic
      .mockResolvedValueOnce(createMockEmailResponse('3', 'Email 3'))
      .mockRejectedValueOnce(new Error('Generation failed')); // Will trigger retry logic

    // Retry logic also fails for the failures
    (withRetry as any).mockImplementation(async (fn: any, opName: string) => {
      if (opName.includes('retry')) {
        throw new Error('Retry failed');
      }
      try {
        return await fn();
      } catch (e) {
        throw e;
      }
    });

    const result = await generateInboxEmailsParallel({
      topic: 'Test Topic',
      languageCode: 'en-US',
      category: 'Security',
      riskArea: 'Phishing',
      level: 'Beginner',
      department: 'IT',
      model: mockModel,
    });

    // Should return the successful ones
    expect(result).toHaveLength(2);
    expect(result[0].subject).toBe('Email 1');
    expect(result[1].subject).toBe('Email 3');
  });

  it('should retry failed generations with fixed prompt', async () => {
    // robust mock implementation that checks if it's a retry attempt
    let callCount = 0;
    (generateText as any).mockImplementation(async (args: any) => {
      callCount++;
      const messages = args.messages;
      const lastMessage = messages[messages.length - 1].content;

      // Check if this is a retry attempt (retry logic adds specific instruction)
      if (lastMessage.includes('If previous output was not valid JSON')) {
        return createMockEmailResponse('retry-id', 'Retry Success');
      }

      // Simulate failure for the first call only (Obvious Phishing variant)
      // We need to be careful with parallel execution order, but typically first call is first variant
      // Let's force fail based on internal state or just fail the first call that ISN'T a retry
      if (callCount === 1) {
        throw new Error('Simulated Generation Failure');
      }

      return createMockEmailResponse(`id-${callCount}`, `Subject ${callCount}`);
    });

    // Reset withRetry to default pass-through
    (withRetry as any).mockImplementation((fn: any) => fn());

    const result = await generateInboxEmailsParallel({
      topic: 'Test Topic',
      languageCode: 'en-US',
      category: 'Security',
      riskArea: 'Phishing',
      level: 'Beginner',
      department: 'IT',
      model: mockModel,
    });

    expect(result).toHaveLength(4);

    // Verify that one of the emails has the retry subject
    const retryEmail = result.find(e => e.subject === 'Retry Success');
    expect(retryEmail).toBeDefined();
    expect(retryEmail?.subject).toBe('Retry Success');

    // generateText called 5 times: 4 variants + 1 retry
    expect(generateText).toHaveBeenCalledTimes(5);
  });

  it('should inject additional context for phishing variants', async () => {
    (generateText as any).mockResolvedValue(createMockEmailResponse('1', 'Test'));

    await generateInboxEmailsParallel({
      topic: 'Test Topic',
      languageCode: 'en-US',
      category: 'Security',
      riskArea: 'Phishing',
      level: 'Beginner',
      department: 'IT',
      additionalContext: 'User is vulnerable to CEO fraud',
      model: mockModel,
    });

    // Check arguments of the first call (Obvious Phishing variant)
    const callArgs = (generateText as any).mock.calls[0][0];
    const userMessages = callArgs.messages.filter((m: any) => m.role === 'user');

    // Should find the context injection message
    const contextMessage = userMessages.find((m: any) => m.content.includes('CRITICAL USER VULNERABILITY'));
    expect(contextMessage).toBeDefined();
    expect(contextMessage.content).toContain('CEO fraud');
  });

  it('should NOT inject additional context for legit variants', async () => {
    (generateText as any).mockResolvedValue(createMockEmailResponse('1', 'Test'));

    await generateInboxEmailsParallel({
      topic: 'Test Topic',
      languageCode: 'en-US',
      category: 'Security',
      riskArea: 'Phishing',
      level: 'Beginner',
      department: 'IT',
      additionalContext: 'User is vulnerable to CEO fraud',
      model: mockModel,
    });

    // Check arguments of the third call (Casual Legit variant - index 2)
    const callArgs = (generateText as any).mock.calls[2][0];
    const userMessages = callArgs.messages.filter((m: any) => m.role === 'user');

    // Should NOT find the context injection message
    const contextMessage = userMessages.find((m: any) => m.content.includes('CRITICAL USER VULNERABILITY'));
    expect(contextMessage).toBeUndefined();
  });

  it('should throw error if ALL generations fail', async () => {
    // Mock all failures even after retries
    (generateText as any).mockRejectedValue(new Error('Everything failed'));

    await expect(generateInboxEmailsParallel({
      topic: 'Test Topic',
      languageCode: 'en-US',
      category: 'Security',
      riskArea: 'Phishing',
      level: 'Beginner',
      department: 'IT',
      model: mockModel,
    })).rejects.toThrow();
  });
});
