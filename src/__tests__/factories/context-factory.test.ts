/**
 * Unit tests for context factory
 */
import { describe, it, expect, vi } from 'vitest';
import { createMockContext, createRequestContext } from './context-factory';

describe('context-factory', () => {
  describe('createMockContext', () => {
    it('should create a mock context with default values', () => {
      const ctx = createMockContext();
      expect(ctx.req).toBeDefined();
      expect(ctx.req.header).toBeDefined();
      expect(ctx.env).toEqual({ KV: {}, D1: {} });
    });

    it('should allow overrides', () => {
      const customEnv = { KV: {}, D1: {}, CUSTOM: 'value' };
      const ctx = createMockContext({ env: customEnv as any });
      expect(ctx.env).toEqual(customEnv);
    });

    it('should merge overrides.req with default header', () => {
      const customHeader = vi.fn(() => 'custom-value');
      const ctx = createMockContext({ req: { header: customHeader } as any });
      expect(ctx.req.header).toBe(customHeader);
      expect(ctx.req.header()).toBe('custom-value');
    });

    it('should spread overrides.req properties onto mockReq', () => {
      const customMethod = 'PUT';
      const ctx = createMockContext({
        req: { header: () => 'x', method: customMethod } as any,
      });
      expect(ctx.req.method).toBe(customMethod);
    });
  });

  describe('createRequestContext', () => {
    it('should create request context with defaults', () => {
      const ctx = createRequestContext();
      expect(ctx.correlationId).toBe('test-correlation-id');
      expect(ctx.token).toBe('test-token');
      expect(ctx.env).toEqual({});
    });

    it('should allow overrides', () => {
      const ctx = createRequestContext({
        correlationId: 'custom-id',
        token: 'custom-token',
      });
      expect(ctx.correlationId).toBe('custom-id');
      expect(ctx.token).toBe('custom-token');
    });
  });
});
