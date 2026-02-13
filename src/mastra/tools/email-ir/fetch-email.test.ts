import { describe, it, expect } from 'vitest';
import { fetchEmailTool, fetchEmailInputSchema } from './fetch-email';

describe('fetchEmailTool', () => {
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
});
