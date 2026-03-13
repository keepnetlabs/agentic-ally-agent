import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listHeyGenVoicesTool } from './list-heygen-voices-tool';

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

describe('listHeyGenVoicesTool', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  describe('tool configuration', () => {
    it('should have correct tool ID', () => {
      expect(listHeyGenVoicesTool.id).toBe('list-heygen-voices');
    });

    it('should have description', () => {
      expect(listHeyGenVoicesTool.description).toContain('voices');
      expect(listHeyGenVoicesTool.description).toContain('HeyGen');
    });

    it('should have input schema with optional language', () => {
      expect(listHeyGenVoicesTool.inputSchema).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return error when HEYGEN_API_KEY is not set', async () => {
      delete process.env.HEYGEN_API_KEY;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await listHeyGenVoicesTool.execute!({} as any, {}) as any;

      expect(result).toEqual({
        success: false,
        error: 'HeyGen API key is not configured. Please set HEYGEN_API_KEY environment variable.',
      });
    });

    it('should return voices when API succeeds', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      const mockVoices = [
        { voice_id: 'v-1', name: 'Alice', language: 'English' },
        { voice_id: 'v-2', name: 'Bob', language: 'Turkish' },
      ];
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ data: { voices: mockVoices } }),
          { status: 200 }
        )
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await listHeyGenVoicesTool.execute!({} as any, {}) as any;

      expect(result).toMatchObject({
        success: true,
        voices: expect.any(Array),
        total: expect.any(Number),
      });
      expect((result as any).voices.length).toBeGreaterThan(0);
    });

    it('should filter by language when context.language provided', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      const mockVoices = [
        { voice_id: 'v-1', name: 'Turkish Voice', language: 'Turkish' },
        { voice_id: 'v-2', name: 'English Voice', language: 'English' },
        { voice_id: 'v-3', name: 'Multilingual', language: 'Multilingual' },
      ];
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ data: { voices: mockVoices } }),
          { status: 200 }
        )
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await listHeyGenVoicesTool.execute!({
        language: 'Turkish',
      } as any, {}) as any;

      expect(result).toMatchObject({
        success: true,
        requestedLanguage: 'Turkish',
      });
    });

    it('should return error when API returns non-200', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Forbidden', { status: 403 })
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await listHeyGenVoicesTool.execute!({} as any, {}) as any;

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('403'),
      });
    });

    it('should handle empty data.voices', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: {} }), { status: 200 })
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await listHeyGenVoicesTool.execute!({} as any, {}) as any;

      expect(result).toMatchObject({
        success: true,
        voices: [],
        total: 0,
      });
    });

    it('should include warning when target language has no voices', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      const mockVoices = [
        { voice_id: 'v-1', name: 'English Voice', language: 'English' },
        { voice_id: 'v-2', name: 'Multilingual', language: 'Multilingual' },
      ];
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ data: { voices: mockVoices } }),
          { status: 200 }
        )
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await listHeyGenVoicesTool.execute!({
        language: 'Arabic',
      } as any, {}) as any;

      expect(result).toMatchObject({
        success: true,
        requestedLanguage: 'Arabic',
        targetLanguageCount: 0,
      });
      expect((result as any).warning).toContain('No dedicated Arabic voices');
    });

    it('should emit voice selection signal when writer is provided', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      const mockVoices = [
        { voice_id: 'v-1', name: 'Emma', language: 'English', gender: 'female', emotion_support: true, preview_audio: 'https://example.com/emma.mp3' },
        { voice_id: 'v-2', name: 'James', language: 'English', gender: 'male', emotion_support: false },
      ];
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ data: { voices: mockVoices } }),
          { status: 200 }
        )
      );
      const mockWriter = { write: vi.fn().mockResolvedValue(undefined) };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await listHeyGenVoicesTool.execute!(
        { language: 'English' } as any,
        { writer: mockWriter } as any,
      ) as any;

      expect(result).toMatchObject({ success: true });
      expect(mockWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data-ui-signal',
          data: expect.objectContaining({
            signal: 'voice_selection',
            message: expect.stringContaining('::ui:voice_selection::'),
          }),
        })
      );
    });

    it('should return error on fetch throw', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused'));

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await listHeyGenVoicesTool.execute!({} as any, {}) as any;

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Failed to list voices'),
      });
    });

    it('should return timeout error when fetch throws AbortError', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortErr);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await listHeyGenVoicesTool.execute!({} as any, {}) as any;

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('timed out'),
      });
    });
  });
});
