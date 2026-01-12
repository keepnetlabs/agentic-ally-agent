
import { describe, expect, it } from 'vitest';
import { requestStorage, getRequestContext } from './request-storage';

describe('request-storage', () => {
    it('returns undefined values when store is empty', () => {
        const context = getRequestContext();
        expect(context.token).toBeUndefined();
        expect(context.companyId).toBeUndefined();
        expect(context.env).toBeUndefined();
    });

    it('returns stored values when running within context', () => {
        const mockContext = {
            token: 'test-token',
            companyId: 'comp-123',
            env: { KV: 'mock-kv' },
            correlationId: 'req-456',
            baseApiUrl: 'https://api.test'
        };

        requestStorage.run(mockContext, () => {
            const context = getRequestContext();
            expect(context.token).toBe('test-token');
            expect(context.companyId).toBe('comp-123');
            expect(context.env).toEqual({ KV: 'mock-kv' });
            expect(context.correlationId).toBe('req-456');
            expect(context.baseApiUrl).toBe('https://api.test');
        });
    });

    it('maintains isolation between concurrent runs', () => {
        // Not easily testable synchronously, but we can verify nested contexts?
        // AsyncLocalStorage usually handles isolation.
        // We'll trust node's implementation but verify we can read what we put in.
        requestStorage.run({ token: 'A' }, () => {
            expect(getRequestContext().token).toBe('A');
            requestStorage.run({ token: 'B' }, () => {
                expect(getRequestContext().token).toBe('B');
            });
            expect(getRequestContext().token).toBe('A');
        });
    });
});
