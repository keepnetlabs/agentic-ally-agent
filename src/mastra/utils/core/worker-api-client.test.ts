
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { callWorkerAPI } from './worker-api-client';

// Mock global fetch
global.fetch = vi.fn();

// Mock dependencies
vi.mock('./logger', () => ({
    getLogger: () => ({
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
    })
}));

vi.mock('../../services/error-service', () => ({
    errorService: {
        external: vi.fn((msg) => ({ message: msg }))
    }
}));

describe('worker-api-client', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('callWorkerAPI', () => {
        it('uses service binding if available', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true })
            });
            const serviceBinding = { fetch: mockFetch };

            const payload = { data: 123 };
            const options = {
                env: {},
                serviceBinding,
                publicUrl: 'http://localhost/fallback',
                endpoint: 'https://worker/endpoint',
                payload,
                token: 'auth-token',
                errorPrefix: 'Error'
            };

            const result = await callWorkerAPI(options as any);

            expect(mockFetch).toHaveBeenCalledWith('https://worker/endpoint', expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer auth-token'
                }),
                body: JSON.stringify(payload)
            }));
            expect(global.fetch).not.toHaveBeenCalled();
            expect(result).toEqual({ success: true });
        });

        it('uses fallback public URL if service binding is missing', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true })
            });
            vi.mocked(global.fetch).mockImplementation(mockFetch);

            const payload = { data: 456 };
            const options = {
                env: {},
                serviceBinding: undefined, // Missing binding
                publicUrl: 'http://localhost/fallback',
                endpoint: 'https://worker/endpoint', // Ignored/Logged but fetch uses publicUrl
                payload,
                errorPrefix: 'Error'
            };

            await callWorkerAPI(options as any);

            expect(global.fetch).toHaveBeenCalledWith('http://localhost/fallback', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(payload)
            }));
        });

        it('throws error if response is not ok', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error'
            });
            const serviceBinding = { fetch: mockFetch };

            const options = {
                env: {},
                serviceBinding,
                publicUrl: '',
                endpoint: 'https://worker/fail',
                payload: {},
                errorPrefix: 'Worker Error'
            };

            await expect(callWorkerAPI(options as any)).rejects.toThrow('Worker Error: 500 - Internal Server Error');
        });
    });
});
