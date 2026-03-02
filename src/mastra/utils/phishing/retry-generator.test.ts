import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryGenerationWithStrongerPrompt } from './retry-generator';

const mockGenerateText = vi.fn();
const mockCleanResponse = vi.fn();
const mockStreamDirectReasoning = vi.fn();
const mockExtractReasoning = vi.fn();

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

vi.mock('../content-processors/json-cleaner', () => ({
  cleanResponse: (text: string, _type: string) => mockCleanResponse(text, _type),
}));

vi.mock('../core/reasoning-stream', () => ({
  streamDirectReasoning: (...args: unknown[]) => mockStreamDirectReasoning(...args),
}));

vi.mock('../core/ai-utils', () => ({
  extractReasoning: (response: unknown) => mockExtractReasoning(response),
}));

vi.mock('../core/logger', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../config/llm-generation-params', () => ({
  PHISHING_CONTENT_PARAMS: { temperature: 0.7 },
}));

describe('retry-generator', () => {
  const mockModel = {} as never;
  const systemPrompt = 'Original system prompt';
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: 'System' },
    { role: 'user', content: 'Generate email JSON' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateText.mockResolvedValue({ text: '{"subject":"Test"}' });
    mockCleanResponse.mockImplementation((t: string) => t);
    mockExtractReasoning.mockReturnValue(null);
  });

  describe('retryGenerationWithStrongerPrompt', () => {
    it('should call generateText with stronger system prompt', async () => {
      await retryGenerationWithStrongerPrompt(mockModel, systemPrompt, messages, 'email');

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      const call = mockGenerateText.mock.calls[0][0];
      expect(call.messages[0].content).toContain('CRITICAL OVERRIDE');
      expect(call.messages[0].content).toContain('LEGITIMATE cybersecurity training');
      expect(call.messages[0].content).toContain(systemPrompt);
    });

    it('should append retry instruction to last user message', async () => {
      await retryGenerationWithStrongerPrompt(mockModel, systemPrompt, messages, 'email');

      const call = mockGenerateText.mock.calls[0][0];
      const lastUserMsg = call.messages.find((m: { role: string }) => m.role === 'user');
      expect(lastUserMsg?.content).toContain('IMPORTANT: Generate the JSON output as requested');
      expect(lastUserMsg?.content).toContain('authorized training simulation');
    });

    it('should use cleanResponse for response text', async () => {
      mockGenerateText.mockResolvedValue({ text: '  {"foo":"bar"}  ' });
      mockCleanResponse.mockReturnValue('{"foo":"bar"}');

      const result = await retryGenerationWithStrongerPrompt(mockModel, systemPrompt, messages, 'email');

      expect(mockCleanResponse).toHaveBeenCalledWith('  {"foo":"bar"}  ', 'email');
      expect(result.parsedResult).toEqual({ foo: 'bar' });
    });

    it('should stream reasoning when writer provided and reasoning exists', async () => {
      const mockWriter = vi.fn();
      mockExtractReasoning.mockReturnValue('Reasoning content');

      await retryGenerationWithStrongerPrompt(mockModel, systemPrompt, messages, 'email', mockWriter);

      expect(mockStreamDirectReasoning).toHaveBeenCalledWith('Reasoning content', mockWriter);
    });

    it('should not stream reasoning when writer not provided', async () => {
      mockExtractReasoning.mockReturnValue('Reasoning content');

      await retryGenerationWithStrongerPrompt(mockModel, systemPrompt, messages, 'email');

      expect(mockStreamDirectReasoning).not.toHaveBeenCalled();
    });

    it('should not stream reasoning when extractReasoning returns null', async () => {
      const mockWriter = vi.fn();
      mockExtractReasoning.mockReturnValue(null);

      await retryGenerationWithStrongerPrompt(mockModel, systemPrompt, messages, 'landing-page', mockWriter);

      expect(mockStreamDirectReasoning).not.toHaveBeenCalled();
    });

    it('should return response and parsedResult', async () => {
      const response = { text: '{"subject":"Phishing"}' };
      mockGenerateText.mockResolvedValue(response);
      mockCleanResponse.mockReturnValue('{"subject":"Phishing"}');

      const result = await retryGenerationWithStrongerPrompt(mockModel, systemPrompt, messages, 'email');

      expect(result.response).toBe(response);
      expect(result.parsedResult).toEqual({ subject: 'Phishing' });
    });

    it('should pass responseType for landing-page', async () => {
      await retryGenerationWithStrongerPrompt(mockModel, systemPrompt, messages, 'landing-page');

      expect(mockCleanResponse).toHaveBeenCalledWith(expect.any(String), 'landing-page');
    });

    it('should keep user messages from original (slice after first)', async () => {
      const multiMsg = [
        { role: 'system' as const, content: 'Original system' },
        { role: 'user' as const, content: 'First user' },
        { role: 'user' as const, content: 'Second user' },
      ];
      await retryGenerationWithStrongerPrompt(mockModel, systemPrompt, multiMsg, 'email');

      const call = mockGenerateText.mock.calls[0][0];
      expect(call.messages).toHaveLength(3);
      expect(call.messages[0].role).toBe('system');
      expect(call.messages[1].content).toBe('First user');
      expect(call.messages[2].content).toContain('Second user');
      expect(call.messages[2].content).toContain('IMPORTANT: Generate the JSON output');
    });
  });
});
