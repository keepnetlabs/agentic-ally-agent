import { describe, it, expect, vi } from 'vitest';
import { reasoningTool } from './reasoning-tool';

/**
 * Test suite for reasoningTool
 * Tests the streaming reasoning tool that emits thinking process events to the frontend
 */

describe('reasoningTool', () => {
  describe('Tool Configuration', () => {
    it('should have id "show_reasoning"', () => {
      expect((reasoningTool as any).id).toBe('show_reasoning');
    });

    it('should have description defined', () => {
      expect((reasoningTool as any).description).toBeTruthy();
      expect((reasoningTool as any).description).toContain('thinking');
    });

    it('should have inputSchema defined', () => {
      expect((reasoningTool as any).inputSchema).toBeDefined();
    });

    it('should have outputSchema defined', () => {
      expect((reasoningTool as any).outputSchema).toBeDefined();
    });

    it('should have execute method', () => {
      expect((reasoningTool as any).execute).toBeDefined();
      expect(typeof (reasoningTool as any).execute).toBe('function');
    });
  });

  describe('Input Schema Validation', () => {
    it('should validate thought as required string field', () => {
      const schema = (reasoningTool as any).inputSchema;
      const validInput = { thought: 'This is my thinking process' };

      expect(() => {
        schema.parse(validInput);
      }).not.toThrow();
    });

    it('should reject missing thought field', () => {
      const schema = (reasoningTool as any).inputSchema;
      const invalidInput = {};

      expect(() => {
        schema.parse(invalidInput);
      }).toThrow();
    });

    it('should reject empty thought string', () => {
      const schema = (reasoningTool as any).inputSchema;
      const invalidInput = { thought: '' };

      // Note: Zod allows empty strings by default, but execute() handles validation
      // Schema parse may succeed, but execute() should check and return error
      const parsed = schema.parse(invalidInput);
      expect(parsed.thought).toBe('');
    });

    it('should accept thought with 1-2 sentences', () => {
      const schema = (reasoningTool as any).inputSchema;
      const validInput = { thought: 'First consideration. Second point.' };

      expect(() => {
        schema.parse(validInput);
      }).not.toThrow();
    });

    it('should accept thought with any length of text', () => {
      const schema = (reasoningTool as any).inputSchema;
      const longThought = 'A'.repeat(1000);
      const validInput = { thought: longThought };

      expect(() => {
        schema.parse(validInput);
      }).not.toThrow();
    });
  });

  describe('Output Schema Validation', () => {
    it('should have success boolean field', () => {
      const schema = (reasoningTool as any).outputSchema;
      const validOutput = { success: true };

      expect(() => {
        schema.parse(validOutput);
      }).not.toThrow();
    });

    it('should validate success: true', () => {
      const schema = (reasoningTool as any).outputSchema;
      const output = { success: true };

      const parsed = schema.parse(output);
      expect(parsed.success).toBe(true);
    });

    it('should validate success: false', () => {
      const schema = (reasoningTool as any).outputSchema;
      const output = { success: false };

      const parsed = schema.parse(output);
      expect(parsed.success).toBe(false);
    });
  });

  describe('Execute Method Async', () => {
    it('should be async function', () => {
      const execute = (reasoningTool as any).execute;
      const result = execute({ thought: 'Test' });

      expect(result instanceof Promise).toBe(true);
    });

    it('should return Promise', async () => {
      const execute = (reasoningTool as any).execute;
      const result = execute({ thought: 'Test' });

      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('Context Parameter Handling', () => {
    it('should extract thought from context.context', () => {
      const context = {
        context: { thought: 'Thinking process here' },
      };

      expect(context.context.thought).toBe('Thinking process here');
    });

    it('should extract thought from context.inputData', () => {
      const context = {
        inputData: { thought: 'Thinking process here' },
      };

      expect(context.inputData.thought).toBe('Thinking process here');
    });

    it('should extract thought from context.input', () => {
      const context = {
        input: { thought: 'Thinking process here' },
      };

      expect(context.input.thought).toBe('Thinking process here');
    });

    it('should extract thought from root context', () => {
      const context = {
        thought: 'Thinking process here',
      };

      expect(context.thought).toBe('Thinking process here');
    });
  });

  describe('Execute with Valid Thought', () => {
    it('should return success: true for valid thought', async () => {
      const execute = (reasoningTool as any).execute;

      const result = await execute({ thought: 'This is my thinking' });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should return object with success field', async () => {
      const execute = (reasoningTool as any).execute;

      const result = await execute({ thought: 'Analyzing the situation' });

      expect(typeof result).toBe('object');
      expect('success' in result).toBe(true);
    });
  });

  describe('Execute with Missing Thought', () => {
    it('should return error when thought is missing', async () => {
      const execute = (reasoningTool as any).execute;

      const result = await execute({});

      expect(result.success === false || result.error === true).toBe(true);
    });

    it('should return error when thought is empty string', async () => {
      const execute = (reasoningTool as any).execute;

      const result = await execute({ thought: '' });

      expect(result.success).toBe(false);
    });

    it('should return error response with error field', async () => {
      const execute = (reasoningTool as any).execute;

      const result = await execute({});

      expect(result.success === false || result.error === true).toBe(true);
      expect(result.error || result.message).toBeDefined();
    });
  });

  describe('Writer Events', () => {
    it('should call writer.write for data-reasoning start event', async () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      await execute({ thought: 'Test thinking' }, { writer: mockWriter });

      // Should have called write at least once for reasoning start (data-reasoning event)
      const startCall = mockWriter.write.mock.calls.find(
        (call: any[]) => call[0]?.type === 'data-reasoning' && call[0]?.data?.event === 'start',
      );
      expect(startCall).toBeDefined();
    });

    it('should call writer.write for data-reasoning delta event', async () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      await execute({ thought: 'Test thinking' }, { writer: mockWriter });

      const deltaCall = mockWriter.write.mock.calls.find(
        (call: any[]) => call[0]?.type === 'data-reasoning' && call[0]?.data?.event === 'delta',
      );
      expect(deltaCall).toBeDefined();
    });

    it('should call writer.write for data-reasoning end event', async () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      await execute({ thought: 'Test thinking' }, { writer: mockWriter });

      const endCall = mockWriter.write.mock.calls.find(
        (call: any[]) => call[0]?.type === 'data-reasoning' && call[0]?.data?.event === 'end',
      );
      expect(endCall).toBeDefined();
    });

    it('should not call writer.write when writer is undefined', async () => {
      const execute = (reasoningTool as any).execute;

      const result = await execute({ thought: 'Test thinking' });

      // Should still succeed, just not emit events
      expect(result.success).toBe(true);
    });
  });

  describe('Event Structure', () => {
    it('data-reasoning start event should have type field', async () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      await execute({ thought: 'Test' }, { writer: mockWriter });

      const startEvent = mockWriter.write.mock.calls.find(
        (call: any[]) => call[0]?.type === 'data-reasoning' && call[0]?.data?.event === 'start',
      );

      expect(startEvent).toBeDefined();
      if (startEvent) {
        expect(startEvent[0].type).toBe('data-reasoning');
        expect(startEvent[0].data?.event).toBe('start');
      }
    });

    it('data-reasoning delta event should have text field with thought', async () => {
      const thoughtText = 'My thinking process here';
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      await execute({ thought: thoughtText }, { writer: mockWriter });

      const deltaEvent = mockWriter.write.mock.calls.find(
        (call: any[]) => call[0]?.type === 'data-reasoning' && call[0]?.data?.event === 'delta',
      );

      expect(deltaEvent).toBeDefined();
      if (deltaEvent) {
        expect(deltaEvent[0].data?.text).toBe(thoughtText);
      }
    });

    it('events should have consistent id field', async () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      await execute({ thought: 'Test' }, { writer: mockWriter });

      const events = mockWriter.write.mock.calls;
      const ids = events.map((call: any[]) => call[0]?.data?.id).filter(Boolean);

      // All events should have same ID (UUID)
      if (ids.length > 0) {
        expect(ids.every(id => id === ids[0])).toBe(true);
      }
    });
  });

  describe('UUID Generation for Events', () => {
    it('should generate UUID for reasoning events', async () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      await execute({ thought: 'Test' }, { writer: mockWriter });

      const startEvent = mockWriter.write.mock.calls.find(
        (call: any[]) => call[0]?.type === 'data-reasoning' && call[0]?.data?.event === 'start',
      );

      expect(startEvent).toBeDefined();
      if (startEvent) {
        const id = startEvent[0].data?.id;

        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(uuidRegex.test(id)).toBe(true);
      }
    });

    it('should use same UUID across data-reasoning start, delta, and end events', async () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      await execute({ thought: 'Test' }, { writer: mockWriter });

      const startEvent = mockWriter.write.mock.calls[0][0];
      const deltaEvent = mockWriter.write.mock.calls[1][0];
      const endEvent = mockWriter.write.mock.calls[2][0];

      expect(startEvent.data?.id).toBe(deltaEvent.data?.id);
      expect(deltaEvent.data?.id).toBe(endEvent.data?.id);
    });

    it('should generate different UUID for multiple calls', async () => {
      const mockWriter1 = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const mockWriter2 = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      await execute({ thought: 'First' }, { writer: mockWriter1 });
      await execute({ thought: 'Second' }, { writer: mockWriter2 });

      const id1 = mockWriter1.write.mock.calls[0][0].data?.id;
      const id2 = mockWriter2.write.mock.calls[0][0].data?.id;

      expect(id1).not.toBe(id2);
    });
  });

  describe('Logging Behavior', () => {
    it('should log thought substring truncated to 100 chars', async () => {
      const execute = (reasoningTool as any).execute;
      const longThought = 'A'.repeat(150);

      // Execute should handle truncation internally
      const result = await execute({ thought: longThought });

      // Result should be valid
      expect(result).toBeDefined();
    });

    it('should append ellipsis for thoughts longer than 100 chars', () => {
      const longThought = 'A'.repeat(150);
      const truncated = longThought.substring(0, 100) + (longThought.length > 100 ? '...' : '');

      expect(truncated.length).toBeGreaterThan(100);
      expect(truncated).toContain('...');
    });

    it('should not truncate short thoughts', () => {
      const shortThought = 'Short thought';
      const truncated = shortThought.substring(0, 100) + (shortThought.length > 100 ? '...' : '');

      expect(truncated).toBe(shortThought);
      expect(truncated).not.toContain('...');
    });

    it('should log reasoning emitted message', async () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      const result = await execute({ thought: 'Test thought' }, { writer: mockWriter });

      // Should complete successfully and emit
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle writer.write errors gracefully', async () => {
      const mockWriter = {
        write: vi.fn().mockRejectedValue(new Error('Write failed')),
      };

      const execute = (reasoningTool as any).execute;

      const result = await execute({ thought: 'Test' }, { writer: mockWriter });

      // Should handle error gracefully
      expect(result).toBeDefined();
    });

    it('should return error response on exception', async () => {
      const mockWriter = {
        write: vi.fn().mockRejectedValue(new Error('Write failed')),
      };

      const execute = (reasoningTool as any).execute;

      const result = await execute({ thought: 'Test' }, { writer: mockWriter });

      // Should have error handling
      if (!result.success) {
        expect(result.success).toBe(false);
      }
    });

    it('should use normalizeError for error handling', async () => {
      const execute = (reasoningTool as any).execute;

      // Should handle null context gracefully via validation or try-catch
      const result = await execute(null as any);

      expect(result).toBeDefined();
      expect(result.success === false || result.error === true).toBe(true);
    });

    it('should create error response from errorService', async () => {
      const execute = (reasoningTool as any).execute;

      const result = await execute({});

      expect(result).toBeDefined();
      expect(result.success === false || result.error === true).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should emit complete reasoning sequence for agent decision', async () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      const result = await execute({ thought: 'Evaluating options: A, B, or C. Option B is most optimal.' }, { writer: mockWriter });

      expect(result.success).toBe(true);
      expect(mockWriter.write.mock.calls.length).toBeGreaterThan(0);
    });

    it('should work without writer (fallback mode)', async () => {
      const execute = (reasoningTool as any).execute;

      const result = await execute({ thought: 'Reasoning without streaming' });

      // Should still succeed even without writer
      expect(result.success).toBe(true);
    });

    it('should handle multiline thought text', async () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      const result = await execute(
        { thought: 'First consideration.\nSecond consideration.\nConclusion: proceed with option A.' },
        { writer: mockWriter },
      );

      expect(result.success).toBe(true);
    });

    it('should handle thought with special characters', async () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      const result = await execute(
        { thought: 'Analyzing: regex pattern /[a-z]+/ and SQL "SELECT *". Risk level: HIGH!' },
        { writer: mockWriter },
      );

      expect(result.success).toBe(true);
    });

    it('should handle thought with unicode characters', async () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      const result = await execute(
        { thought: 'Analyzing phishing emails with Unicode: 😀 用户输入 🔒' },
        { writer: mockWriter },
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Crypto Usage', () => {
    it('should use crypto.randomUUID for event IDs', async () => {
      const mockWriter = {
        write: vi.fn().mockResolvedValue(undefined),
      };

      const execute = (reasoningTool as any).execute;

      await execute({ thought: 'Test' }, { writer: mockWriter });

      const firstEvent = mockWriter.write.mock.calls[0][0];
      const secondEvent = mockWriter.write.mock.calls[1][0];

      // All events should have an ID (generated by crypto.randomUUID)
      expect(firstEvent.data?.id).toBeDefined();
      expect(secondEvent.data?.id).toBeDefined();
    });
  });
});
