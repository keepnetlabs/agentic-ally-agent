import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listHeyGenAvatarsTool } from './list-heygen-avatars-tool';

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

const originalEnv = process.env;

describe('listHeyGenAvatarsTool', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  describe('tool configuration', () => {
    it('should have correct tool ID', () => {
      expect(listHeyGenAvatarsTool.id).toBe('list-heygen-avatars');
    });

    it('should have description', () => {
      expect(listHeyGenAvatarsTool.description).toContain('avatars');
      expect(listHeyGenAvatarsTool.description).toContain('HeyGen');
    });

    it('should have empty input schema', () => {
      expect(listHeyGenAvatarsTool.inputSchema).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return error when HEYGEN_API_KEY is not set', async () => {
      delete process.env.HEYGEN_API_KEY;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

      const result = await listHeyGenAvatarsTool.execute!({ context: {} } as any);

      expect(result).toEqual({
        success: false,
        error: 'HeyGen API key is not configured. Please set HEYGEN_API_KEY environment variable.',
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should return avatars when API succeeds', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      const mockAvatars = [
        { avatar_id: 'av-1', avatar_name: 'Alice', gender: 'female' },
        { avatar_id: 'av-2', avatar_name: 'Bob', gender: 'male' },
      ];
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            data: { avatars: mockAvatars },
          }),
          { status: 200 }
        )
      );

      const result = await listHeyGenAvatarsTool.execute!({ context: {} } as any);

      expect(result).toMatchObject({
        success: true,
        avatars: expect.any(Array),
        total: 2,
      });
      expect((result as any).avatars).toHaveLength(2);
      expect((result as any).avatars[0]).toMatchObject({
        avatar_id: 'av-1',
        avatar_name: 'Alice',
        gender: 'female',
      });
    });

    it('should return error when API returns non-200', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Unauthorized', { status: 401 })
      );

      const result = await listHeyGenAvatarsTool.execute!({ context: {} } as any);

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('401'),
      });
    });

    it('should filter out avatars with empty avatar_id', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      const mockAvatars = [
        { avatar_id: 'av-1', avatar_name: 'Alice' },
        { avatar_id: '', avatar_name: 'Invalid' },
      ];
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ data: { avatars: mockAvatars } }),
          { status: 200 }
        )
      );

      const result = await listHeyGenAvatarsTool.execute!({ context: {} } as any);

      expect((result as any).avatars).toHaveLength(1);
      expect((result as any).avatars[0].avatar_id).toBe('av-1');
    });

    it('should limit to MAX_AVATARS (10)', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      const manyAvatars = Array.from({ length: 15 }, (_, i) => ({
        avatar_id: `av-${i}`,
        avatar_name: `Avatar ${i}`,
      }));
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ data: { avatars: manyAvatars } }),
          { status: 200 }
        )
      );

      const result = await listHeyGenAvatarsTool.execute!({ context: {} } as any);

      expect((result as any).avatars).toHaveLength(10);
    });

    it('should handle empty data.avatars', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: {} }), { status: 200 })
      );

      const result = await listHeyGenAvatarsTool.execute!({ context: {} } as any);

      expect(result).toMatchObject({
        success: true,
        avatars: [],
        total: 0,
      });
    });

    it('should return error on fetch throw (generic error)', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'));

      const result = await listHeyGenAvatarsTool.execute!({ context: {} } as any);

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Failed to list avatars'),
      });
    });

    it('should return timeout error when fetch throws AbortError', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortErr);

      const result = await listHeyGenAvatarsTool.execute!({ context: {} } as any);

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('timed out'),
      });
    });
  });
});
