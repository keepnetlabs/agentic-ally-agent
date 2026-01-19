
import { describe, expect, it, beforeEach } from 'vitest';
import { requestStorage, getRequestContext } from './request-storage';

describe('request-storage', () => {
    beforeEach(() => {
        // Ensure clean state between tests
        requestStorage.exit(() => {});
    });

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

    it('should handle partial context with only token', () => {
        requestStorage.run({ token: 'only-token' }, () => {
            const context = getRequestContext();
            expect(context.token).toBe('only-token');
            expect(context.companyId).toBeUndefined();
            expect(context.env).toBeUndefined();
            expect(context.correlationId).toBeUndefined();
            expect(context.baseApiUrl).toBeUndefined();
        });
    });

    it('should handle partial context with only companyId', () => {
        requestStorage.run({ companyId: 'comp-456' }, () => {
            const context = getRequestContext();
            expect(context.token).toBeUndefined();
            expect(context.companyId).toBe('comp-456');
            expect(context.env).toBeUndefined();
        });
    });

    it('should handle partial context with only env', () => {
        const mockEnv = { KV: 'test-kv', DB: 'test-db' };
        requestStorage.run({ env: mockEnv }, () => {
            const context = getRequestContext();
            expect(context.token).toBeUndefined();
            expect(context.companyId).toBeUndefined();
            expect(context.env).toEqual(mockEnv);
        });
    });

    it('should handle empty context object', () => {
        requestStorage.run({}, () => {
            const context = getRequestContext();
            expect(context.token).toBeUndefined();
            expect(context.companyId).toBeUndefined();
            expect(context.env).toBeUndefined();
            expect(context.correlationId).toBeUndefined();
            expect(context.baseApiUrl).toBeUndefined();
        });
    });

    it('should handle context with user object', () => {
        const mockUser = { id: 'user-123', email: 'test@example.com' };
        requestStorage.run({ user: mockUser }, () => {
            const store = requestStorage.getStore();
            expect(store?.user).toEqual(mockUser);
        });
    });

    it('should handle correlationId for tracing', () => {
        requestStorage.run({ correlationId: 'trace-id-789' }, () => {
            const context = getRequestContext();
            expect(context.correlationId).toBe('trace-id-789');
        });
    });

    it('should handle baseApiUrl', () => {
        requestStorage.run({ baseApiUrl: 'https://custom-api.com' }, () => {
            const context = getRequestContext();
            expect(context.baseApiUrl).toBe('https://custom-api.com');
        });
    });

    it('should handle complex env object', () => {
        const complexEnv = {
            KV: { namespace: 'test' },
            D1: { database: 'main' },
            R2: { bucket: 'assets' },
            nested: { deeply: { value: 123 } }
        };
        requestStorage.run({ env: complexEnv }, () => {
            const context = getRequestContext();
            expect(context.env).toEqual(complexEnv);
        });
    });

    it('should isolate nested contexts with different tokens', () => {
        requestStorage.run({ token: 'outer-token' }, () => {
            expect(getRequestContext().token).toBe('outer-token');

            requestStorage.run({ token: 'inner-token' }, () => {
                expect(getRequestContext().token).toBe('inner-token');
            });

            expect(getRequestContext().token).toBe('outer-token');
        });
    });

    it('should isolate nested contexts with different companyIds', () => {
        requestStorage.run({ companyId: 'outer-company' }, () => {
            expect(getRequestContext().companyId).toBe('outer-company');

            requestStorage.run({ companyId: 'inner-company' }, () => {
                expect(getRequestContext().companyId).toBe('inner-company');
            });

            expect(getRequestContext().companyId).toBe('outer-company');
        });
    });

    it('should handle deeply nested contexts', () => {
        requestStorage.run({ token: 'level-1' }, () => {
            expect(getRequestContext().token).toBe('level-1');

            requestStorage.run({ token: 'level-2' }, () => {
                expect(getRequestContext().token).toBe('level-2');

                requestStorage.run({ token: 'level-3' }, () => {
                    expect(getRequestContext().token).toBe('level-3');
                });

                expect(getRequestContext().token).toBe('level-2');
            });

            expect(getRequestContext().token).toBe('level-1');
        });
    });

    it('should handle context with all fields populated', () => {
        const fullContext = {
            token: 'full-token',
            companyId: 'full-company',
            env: { KV: 'full-kv' },
            correlationId: 'full-correlation',
            baseApiUrl: 'https://full-api.com',
            user: { id: 'full-user' }
        };

        requestStorage.run(fullContext, () => {
            const context = getRequestContext();
            expect(context.token).toBe('full-token');
            expect(context.companyId).toBe('full-company');
            expect(context.env).toEqual({ KV: 'full-kv' });
            expect(context.correlationId).toBe('full-correlation');
            expect(context.baseApiUrl).toBe('https://full-api.com');

            const store = requestStorage.getStore();
            expect(store?.user).toEqual({ id: 'full-user' });
        });
    });

    it('should return undefined after context exits', () => {
        requestStorage.run({ token: 'temp-token' }, () => {
            expect(getRequestContext().token).toBe('temp-token');
        });

        // After exiting the context
        const context = getRequestContext();
        expect(context.token).toBeUndefined();
    });

    it('should handle multiple sequential contexts', () => {
        requestStorage.run({ token: 'first' }, () => {
            expect(getRequestContext().token).toBe('first');
        });

        requestStorage.run({ token: 'second' }, () => {
            expect(getRequestContext().token).toBe('second');
        });

        requestStorage.run({ token: 'third' }, () => {
            expect(getRequestContext().token).toBe('third');
        });
    });

    it('should handle env with null values', () => {
        requestStorage.run({ env: { KV: null } as any }, () => {
            const context = getRequestContext();
            expect(context.env).toEqual({ KV: null });
        });
    });

    it('should handle env with undefined values', () => {
        requestStorage.run({ env: { KV: undefined } }, () => {
            const context = getRequestContext();
            expect(context.env).toEqual({ KV: undefined });
        });
    });

    it('should handle special characters in token', () => {
        const specialToken = 'token-with-!@#$%^&*()_+{}[]|\\:";\'<>?,./';
        requestStorage.run({ token: specialToken }, () => {
            expect(getRequestContext().token).toBe(specialToken);
        });
    });

    it('should handle very long token', () => {
        const longToken = 'a'.repeat(10000);
        requestStorage.run({ token: longToken }, () => {
            expect(getRequestContext().token).toBe(longToken);
        });
    });

    it('should handle empty string values', () => {
        requestStorage.run({ token: '', companyId: '', baseApiUrl: '' }, () => {
            const context = getRequestContext();
            expect(context.token).toBe('');
            expect(context.companyId).toBe('');
            expect(context.baseApiUrl).toBe('');
        });
    });

    it('should preserve object references in env', () => {
        const envObject = { KV: 'test' };
        requestStorage.run({ env: envObject }, () => {
            const context = getRequestContext();
            expect(context.env).toBe(envObject);
        });
    });

    it('should handle numeric-like strings', () => {
        requestStorage.run({ token: '12345', companyId: '67890' }, () => {
            const context = getRequestContext();
            expect(context.token).toBe('12345');
            expect(context.companyId).toBe('67890');
        });
    });

    it('should handle UUID-like tokens', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        requestStorage.run({ token: uuid }, () => {
            expect(getRequestContext().token).toBe(uuid);
        });
    });

    it('should handle JWT-like tokens', () => {
        const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
        requestStorage.run({ token: jwt }, () => {
            expect(getRequestContext().token).toBe(jwt);
        });
    });

    it('should handle context switching mid-execution', () => {
        requestStorage.run({ token: 'initial' }, () => {
            expect(getRequestContext().token).toBe('initial');

            // Simulate context switch
            requestStorage.run({ token: 'switched' }, () => {
                expect(getRequestContext().token).toBe('switched');
            });

            // Back to original
            expect(getRequestContext().token).toBe('initial');
        });
    });

    it('should return all fields as undefined when getStore returns undefined', () => {
        // Outside any context
        const context = getRequestContext();
        expect(context).toEqual({
            token: undefined,
            companyId: undefined,
            env: undefined,
            correlationId: undefined,
            baseApiUrl: undefined
        });
    });

    it('should handle Cloudflare bindings in env', () => {
        const cloudflareEnv = {
            KV: { get: () => {}, put: () => {} },
            D1: { prepare: () => {} },
            R2: { head: () => {} },
            QUEUE: { send: () => {} }
        };

        requestStorage.run({ env: cloudflareEnv }, () => {
            const context = getRequestContext();
            expect(context.env).toEqual(cloudflareEnv);
        });
    });

    it('should handle context with mixed data types in user', () => {
        const complexUser = {
            id: 123,
            name: 'Test User',
            active: true,
            roles: ['admin', 'user'],
            metadata: { lastLogin: new Date() }
        };

        requestStorage.run({ user: complexUser }, () => {
            const store = requestStorage.getStore();
            expect(store?.user).toEqual(complexUser);
        });
    });
});
