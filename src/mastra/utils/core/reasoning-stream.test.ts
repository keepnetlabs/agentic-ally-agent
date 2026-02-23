import { describe, it, expect, vi, beforeEach } from 'vitest';
import { streamDirectReasoning, streamReasoningUpdates, streamReasoning, StreamWriter } from './reasoning-stream';

// Mock getModelWithOverride
vi.mock('../../model-providers', () => ({
  getModelWithOverride: vi.fn(),
  Model: { WORKERS_AI_GPT_OSS_120B: 'test-model' },
}));

// Mock ai module for generateText
const mockGenerateText = vi.fn();
vi.mock('ai', () => ({
  generateText: (...args: any[]) => mockGenerateText(...args),
}));

// Mock id-utils
let uuidCounter = 0;
vi.mock('./id-utils', () => ({
  uuidv4: () => `test-uuid-${++uuidCounter}`,
}));

describe('Reasoning Stream Utils', () => {
  let mockWriter: StreamWriter;
  let writeSpy: any;

  beforeEach(() => {
    uuidCounter = 0;
    writeSpy = vi.fn().mockResolvedValue(undefined);
    mockWriter = {
      write: writeSpy,
    };
    mockGenerateText.mockReset();
  });

  describe('streamDirectReasoning', () => {
    it('should stream direct reasoning without modification', async () => {
      const reasoning = 'I am thinking directly';
      await streamDirectReasoning(reasoning, mockWriter);

      expect(writeSpy).toHaveBeenCalledTimes(3);
      expect(writeSpy).toHaveBeenNthCalledWith(1, { type: 'reasoning-start', id: 'test-uuid-1' });
      expect(writeSpy).toHaveBeenNthCalledWith(2, { type: 'reasoning-delta', id: 'test-uuid-1', delta: reasoning });
      expect(writeSpy).toHaveBeenNthCalledWith(3, { type: 'reasoning-end', id: 'test-uuid-1' });
    });

    it('should do nothing if reasoning is empty', async () => {
      await streamDirectReasoning('', mockWriter);
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('should handle writer errors gracefully', async () => {
      mockWriter.write = vi.fn().mockRejectedValue(new Error('Stream closed'));
      await expect(streamDirectReasoning('test', mockWriter)).resolves.not.toThrow();
    });

    it('should handle null reasoning', async () => {
      // @ts-ignore - Testing runtime behavior
      await streamDirectReasoning(null, mockWriter);
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('should handle undefined reasoning', async () => {
      // @ts-ignore - Testing runtime behavior
      await streamDirectReasoning(undefined, mockWriter);
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('should handle null writer', async () => {
      // @ts-ignore - Testing runtime behavior
      await expect(streamDirectReasoning('test', null)).resolves.not.toThrow();
    });

    it('should handle undefined writer', async () => {
      // @ts-ignore - Testing runtime behavior
      await expect(streamDirectReasoning('test', undefined)).resolves.not.toThrow();
    });

    it('should handle whitespace-only reasoning', async () => {
      await streamDirectReasoning('   \t\n   ', mockWriter);

      // Whitespace is truthy, so it should stream
      expect(writeSpy).toHaveBeenCalledTimes(3);
      expect(writeSpy).toHaveBeenNthCalledWith(2, {
        type: 'reasoning-delta',
        id: 'test-uuid-1',
        delta: '   \t\n   ',
      });
    });

    it('should handle very long reasoning text', async () => {
      const longReasoning = 'A'.repeat(10000);
      await streamDirectReasoning(longReasoning, mockWriter);

      expect(writeSpy).toHaveBeenCalledTimes(3);
      expect(writeSpy).toHaveBeenNthCalledWith(2, {
        type: 'reasoning-delta',
        id: 'test-uuid-1',
        delta: longReasoning,
      });
    });

    it('should handle reasoning with special characters', async () => {
      const reasoning = 'Thinking: "quoted" & <markup> $ symbols @#%';
      await streamDirectReasoning(reasoning, mockWriter);

      expect(writeSpy).toHaveBeenCalledTimes(3);
      expect(writeSpy).toHaveBeenNthCalledWith(2, {
        type: 'reasoning-delta',
        id: 'test-uuid-1',
        delta: reasoning,
      });
    });

    it('should handle reasoning with unicode characters', async () => {
      const reasoning = '思考中... 🤔 Размышление';
      await streamDirectReasoning(reasoning, mockWriter);

      expect(writeSpy).toHaveBeenCalledTimes(3);
      expect(writeSpy).toHaveBeenNthCalledWith(2, {
        type: 'reasoning-delta',
        id: 'test-uuid-1',
        delta: reasoning,
      });
    });

    it('should handle reasoning with newlines', async () => {
      const reasoning = 'Line 1\nLine 2\nLine 3';
      await streamDirectReasoning(reasoning, mockWriter);

      expect(writeSpy).toHaveBeenCalledTimes(3);
      expect(writeSpy).toHaveBeenNthCalledWith(2, {
        type: 'reasoning-delta',
        id: 'test-uuid-1',
        delta: reasoning,
      });
    });

    it('should handle JSON-like reasoning', async () => {
      const reasoning = '{"thought": "process", "action": "decide"}';
      await streamDirectReasoning(reasoning, mockWriter);

      expect(writeSpy).toHaveBeenCalledTimes(3);
      expect(writeSpy).toHaveBeenNthCalledWith(2, {
        type: 'reasoning-delta',
        id: 'test-uuid-1',
        delta: reasoning,
      });
    });

    it('should use unique message ID', async () => {
      await streamDirectReasoning('First', mockWriter);
      await streamDirectReasoning('Second', mockWriter);

      expect(writeSpy).toHaveBeenCalledTimes(6);
      expect(writeSpy).toHaveBeenNthCalledWith(1, { type: 'reasoning-start', id: 'test-uuid-1' });
      expect(writeSpy).toHaveBeenNthCalledWith(4, { type: 'reasoning-start', id: 'test-uuid-2' });
    });

    it('should not throw if writer.write throws on first call', async () => {
      let callCount = 0;
      mockWriter.write = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call failed');
        }
        return Promise.resolve();
      });

      await expect(streamDirectReasoning('test', mockWriter)).resolves.not.toThrow();
    });

    it('should not throw if writer.write throws on second call', async () => {
      let callCount = 0;
      mockWriter.write = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Second call failed');
        }
        return Promise.resolve();
      });

      await expect(streamDirectReasoning('test', mockWriter)).resolves.not.toThrow();
    });

    it('should not throw if writer.write throws on third call', async () => {
      let callCount = 0;
      mockWriter.write = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 3) {
          throw new Error('Third call failed');
        }
        return Promise.resolve();
      });

      await expect(streamDirectReasoning('test', mockWriter)).resolves.not.toThrow();
    });

    it('should handle promise rejection in first write', async () => {
      let callCount = 0;
      mockWriter.write = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Rejected'));
        }
        return Promise.resolve();
      });

      await expect(streamDirectReasoning('test', mockWriter)).resolves.not.toThrow();
    });

    it('should call write in correct order', async () => {
      const calls: string[] = [];
      mockWriter.write = vi.fn().mockImplementation((data: any) => {
        calls.push(data.type);
        return Promise.resolve();
      });

      await streamDirectReasoning('test', mockWriter);

      expect(calls).toEqual(['reasoning-start', 'reasoning-delta', 'reasoning-end']);
    });

    it('should pass same id to all write calls', async () => {
      const ids: string[] = [];
      mockWriter.write = vi.fn().mockImplementation((data: any) => {
        ids.push(data.id);
        return Promise.resolve();
      });

      await streamDirectReasoning('test', mockWriter);

      expect(ids).toEqual(['test-uuid-1', 'test-uuid-1', 'test-uuid-1']);
    });
  });

  describe('streamReasoning', () => {
    it('should return early when reasoningText is empty', async () => {
      await streamReasoning('', mockWriter);
      expect(writeSpy).not.toHaveBeenCalled();
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should return early when reasoningText is null/undefined', async () => {
      await streamReasoning(null as any, mockWriter);
      await streamReasoning(undefined as any, mockWriter);
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('should return early when writer is null/undefined', async () => {
      await streamReasoning('text', null as any);
      await streamReasoning('text', undefined as any);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should call writer.write with reasoning-start immediately', async () => {
      mockGenerateText.mockImplementation(() => new Promise(() => {})); // Never resolves
      await streamReasoning('reasoning text', mockWriter);
      expect(writeSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'reasoning-start' }));
    });

    it('should handle writer.write throwing on first call', async () => {
      const failingWriter = {
        write: vi.fn().mockRejectedValue(new Error('Stream closed')),
      };
      await expect(streamReasoning('reasoning text', failingWriter as any)).resolves.not.toThrow();
    });

    it('should handle generateText rejection (catch in .catch)', async () => {
      mockGenerateText.mockRejectedValue(new Error('Model error'));
      const writer = { write: vi.fn().mockResolvedValue(undefined) };
      await streamReasoning('reasoning text', writer as any);
      await new Promise(r => setTimeout(r, 50));
      expect(writer.write).toHaveBeenCalledWith(expect.objectContaining({ type: 'reasoning-end' }));
    });

    it('should stream delta and reasoning-end when generateText succeeds', async () => {
      mockGenerateText.mockResolvedValue({ text: 'User-friendly summary' });
      await streamReasoning('technical reasoning', mockWriter);
      await new Promise(r => setTimeout(r, 50));
      expect(writeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'reasoning-delta', delta: 'User-friendly summary' })
      );
      expect(writeSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'reasoning-end' }));
    });
  });

  describe('streamReasoningUpdates', () => {
    it('should call streamReasoning for each text (uses generateText)', async () => {
      mockGenerateText.mockResolvedValue({ text: 'User-friendly summary' });
      const texts = ['First', 'Second'];
      await streamReasoningUpdates(texts, mockWriter);

      expect(mockGenerateText).toHaveBeenCalledTimes(2);
      expect(writeSpy).toHaveBeenCalled();
    });

    it('should handle empty array', async () => {
      await streamReasoningUpdates([], mockWriter);
      expect(mockGenerateText).not.toHaveBeenCalled();
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('should handle single item array', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Single' });
      await streamReasoningUpdates(['Only one'], mockWriter);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });
  });
});
