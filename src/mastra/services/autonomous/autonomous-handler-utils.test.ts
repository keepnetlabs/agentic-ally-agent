/**
 * Pure helpers + STOP message behaviour (withTimeout mocked).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/core/resilience-utils', () => ({
  withTimeout: <T>(promise: Promise<T>) => promise,
}));

import { buildThreadId, sendAgentStopMessage } from './autonomous-handler-utils';

describe('autonomous-handler-utils', () => {
  describe('buildThreadId', () => {
    it('formats user thread: {type}-{id}-{timestamp}', () => {
      const ts = 1_700_000_000_000;
      expect(buildThreadId('phishing', 'user-abc', ts, false)).toBe(`phishing-user-abc-${ts}`);
      expect(buildThreadId('training', 'usr42', ts, false)).toBe(`training-usr42-${ts}`);
    });

    it('formats group thread: {type}-group-{id}-{timestamp}', () => {
      const ts = 1_700_000_000_000;
      expect(buildThreadId('smishing', 'grp-1', ts, true)).toBe(`smishing-group-grp-1-${ts}`);
      expect(buildThreadId('vishing', 99, ts, true)).toBe(`vishing-group-99-${ts}`);
    });

    it('defaults isGroup to false', () => {
      const ts = 123;
      expect(buildThreadId('vishing', 'u1', ts)).toBe(`vishing-u1-${ts}`);
    });

    it('accepts numeric identifier for non-group', () => {
      expect(buildThreadId('training', 42, 999, false)).toBe('training-42-999');
    });
  });

  describe('sendAgentStopMessage', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('calls agent.generate with STOP body and memory, then logs success', async () => {
      const generate = vi.fn().mockResolvedValue({ text: '' });
      const logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      await sendAgentStopMessage(
        { generate },
        'phishing-user-1-999',
        'task_complete',
        logger as any,
        'unit-test'
      );

      expect(generate).toHaveBeenCalledTimes(1);
      const [prompt, opts] = generate.mock.calls[0];
      expect(prompt).toContain('TASK COMPLETE');
      expect(opts).toEqual({
        memory: { thread: 'phishing-user-1-999', resource: 'agentic-ally-autonomous' },
      });
      expect(logger.info).toHaveBeenCalledWith('Sending STOP message (unit-test)', {
        variant: 'task_complete',
        threadId: 'phishing-user-1-999',
      });
      expect(logger.info).toHaveBeenCalledWith('STOP message sent (unit-test)');
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('logs warn and does not throw when generate rejects', async () => {
      const generate = vi.fn().mockRejectedValue(new Error('network'));
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

      await expect(
        sendAgentStopMessage({ generate }, 't-1', 'generation_complete', logger as any)
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        'STOP message failed (non-critical)',
        expect.objectContaining({ error: 'network' })
      );
    });
  });
});
