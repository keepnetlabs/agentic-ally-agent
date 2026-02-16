import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchEmailTool, fetchEmailInputSchema } from './fetch-email';

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

vi.mock('./logger-setup', () => ({
  createLogContext: vi.fn(() => ({})),
  loggerFetch: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logStepStart: vi.fn(),
  logStepComplete: vi.fn(),
  logStepError: vi.fn(),
}));

vi.mock('../../utils/core/error-utils', () => ({
  normalizeError: vi.fn((e: unknown) => ({ message: e instanceof Error ? e.message : 'Unknown' })),
  logErrorInfo: vi.fn(),
}));

vi.mock('../../services/error-service', () => ({
  errorService: {
    external: vi.fn(() => ({ code: 'ERR_EXT_001' })),
  },
}));

describe('fetchEmailTool', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });
  it('should be defined', () => {
    expect(fetchEmailTool).toBeDefined();
  });

  it('should have correct ID', () => {
    expect(fetchEmailTool.id).toBe('email-ir-fetch-email-tool');
  });

  it('should have correct description', () => {
    expect(fetchEmailTool.description).toContain('Keepnet');
    expect(fetchEmailTool.description).toContain('email data');
  });

  it('should have input schema with id field', () => {
    const fields = fetchEmailInputSchema.shape;
    expect(fields.id).toBeDefined();
  });

  it('should have input schema with accessToken field', () => {
    const fields = fetchEmailInputSchema.shape;
    expect(fields.accessToken).toBeDefined();
  });

  it('should have input schema with optional apiBaseUrl field', () => {
    const fields = fetchEmailInputSchema.shape;
    expect(fields.apiBaseUrl).toBeDefined();
  });

  it('should have default API base URL in schema', () => {
    const parsed = fetchEmailInputSchema.safeParse({
      id: 'test-id',
      accessToken: 'test-token',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.apiBaseUrl).toBe('https://test-api.devkeepnet.com');
    }
  });

  it('should allow custom API base URL', () => {
    const parsed = fetchEmailInputSchema.safeParse({
      id: 'test-id',
      accessToken: 'test-token',
      apiBaseUrl: 'https://custom-api.example.com',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.apiBaseUrl).toBe('https://custom-api.example.com');
    }
  });

  it('should validate required id field', () => {
    const parsed = fetchEmailInputSchema.safeParse({
      accessToken: 'token-only',
    });

    expect(parsed.success).toBe(false);
  });

  it('should validate required accessToken field', () => {
    const parsed = fetchEmailInputSchema.safeParse({
      id: 'id-only',
    });

    expect(parsed.success).toBe(false);
  });

  it('should have execute function', () => {
    expect(fetchEmailTool.execute).toBeDefined();
    expect(typeof fetchEmailTool.execute).toBe('function');
  });

  it('should have input and output schemas configured', () => {
    expect(fetchEmailTool.inputSchema).toBeDefined();
    expect(fetchEmailTool.outputSchema).toBeDefined();
  });

  it('should validate id is a string', () => {
    const parsed = fetchEmailInputSchema.safeParse({
      id: 123,
      accessToken: 'token',
    });

    expect(parsed.success).toBe(false);
  });

  it('should validate accessToken is a string', () => {
    const parsed = fetchEmailInputSchema.safeParse({
      id: 'test-id',
      accessToken: 456,
    });

    expect(parsed.success).toBe(false);
  });

  it('should handle valid full input', () => {
    const parsed = fetchEmailInputSchema.safeParse({
      id: 'email-123',
      accessToken: 'bearer-token-abc',
      apiBaseUrl: 'https://api.keepnet.com',
    });

    expect(parsed.success).toBe(true);
  });

  describe('execute', () => {
    it('should return email data when API returns success', async () => {
      const mockEmailData = {
        id: 'email-123',
        subject: 'Test',
        from: 'sender@example.com',
        htmlBody: '<p>Body</p>',
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockEmailData }),
      });

      const result = await (fetchEmailTool as any).execute({
        context: {
          id: 'email-123',
          accessToken: 'token',
          apiBaseUrl: 'https://api.example.com',
        },
      });

      expect(result).toEqual(mockEmailData);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/notified-emails/email-123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
          }),
        })
      );
    });

    it('should use data wrapper when API returns { data: ... }', async () => {
      const innerData = { id: 'x', subject: 'S' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: innerData }),
      });

      const result = await (fetchEmailTool as any).execute({
        context: { id: 'x', accessToken: 't', apiBaseUrl: 'https://a.com' },
      });

      expect(result).toEqual(innerData);
    });

    it('should use root object when API returns email directly (no data wrapper)', async () => {
      const directData = { id: 'x', subject: 'S', from: 'f@x.com' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(directData),
      });

      const result = await (fetchEmailTool as any).execute({
        context: { id: 'x', accessToken: 't', apiBaseUrl: 'https://a.com' },
      });

      expect(result).toEqual(directData);
    });

    it('should throw when API returns non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      });

      await expect(
        (fetchEmailTool as any).execute({
          context: { id: 'x', accessToken: 't', apiBaseUrl: 'https://a.com' },
        })
      ).rejects.toThrow(/404/);
    });
  });
});
