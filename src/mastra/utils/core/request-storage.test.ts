import { describe, expect, it } from 'vitest';
import { getRequestContext, requestStorage } from './request-storage';

describe('request-storage', () => {
  it('returns empty context outside AsyncLocalStorage scope', () => {
    const ctx = getRequestContext();
    expect(ctx).toEqual({
      token: undefined,
      companyId: undefined,
      env: undefined,
      correlationId: undefined,
      baseApiUrl: undefined,
    });
  });

  it('returns values from active request context', async () => {
    await requestStorage.run(
      {
        token: 'token-1',
        companyId: 'company-1',
        env: { KV: 'binding' },
        correlationId: 'cid-1',
        baseApiUrl: 'https://api.example.com',
      },
      async () => {
        const ctx = getRequestContext();
        expect(ctx).toEqual({
          token: 'token-1',
          companyId: 'company-1',
          env: { KV: 'binding' },
          correlationId: 'cid-1',
          baseApiUrl: 'https://api.example.com',
        });
      }
    );
  });

  it('preserves context across async boundaries', async () => {
    await requestStorage.run(
      {
        token: 'token-async',
        correlationId: 'cid-async',
      },
      async () => {
        await Promise.resolve();
        const ctx = getRequestContext();
        expect(ctx.token).toBe('token-async');
        expect(ctx.correlationId).toBe('cid-async');
      }
    );
  });

  it('uses inner context in nested run blocks', async () => {
    await requestStorage.run(
      {
        token: 'outer-token',
        correlationId: 'outer-cid',
      },
      async () => {
        expect(getRequestContext().token).toBe('outer-token');

        await requestStorage.run(
          {
            token: 'inner-token',
            correlationId: 'inner-cid',
          },
          async () => {
            const innerCtx = getRequestContext();
            expect(innerCtx.token).toBe('inner-token');
            expect(innerCtx.correlationId).toBe('inner-cid');
          }
        );

        const outerCtxAgain = getRequestContext();
        expect(outerCtxAgain.token).toBe('outer-token');
        expect(outerCtxAgain.correlationId).toBe('outer-cid');
      }
    );
  });
});
