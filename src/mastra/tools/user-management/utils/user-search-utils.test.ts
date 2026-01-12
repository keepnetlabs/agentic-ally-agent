import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchUsersWithFilters, findUserByEmail, findUserByNameWithFallbacks } from './user-search-utils';

const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
};

const mockDeps = {
    token: 'fake-token',
    logger: mockLogger,
    baseApiUrl: 'https://api.test'
};

const mockTemplate = {
    filter: {
        FilterGroups: [{ FilterItems: [] }]
    }
};

describe('user-search-utils', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    describe('fetchUsersWithFilters', () => {
        it('should fetch users successfully', async () => {
            const mockUsers = [{ id: 1, email: 'test@example.com' }];
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => ({ items: mockUsers })
            });

            const result = await fetchUsersWithFilters(mockDeps, mockTemplate, []);
            expect(result).toEqual(mockUsers);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/leaderboard/get-all'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer fake-token'
                    })
                })
            );
        });

        it('should throw error on failed fetch', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error'
            });

            await expect(fetchUsersWithFilters(mockDeps, mockTemplate, []))
                .rejects.toThrow('User search API error: 500');
        });
    });

    describe('findUserByEmail', () => {
        it('should return user when found exactly', async () => {
            const mockUser = { email: 'found@example.com' };

            // Mock first call to return empty (exact match attempted via filter?) 
            // Actually implementation: tries exact filter first.
            // Let's mock implementation of fetchUsersWithFilters via fetch mocks

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => ({ items: [mockUser] })
            });

            const result = await findUserByEmail(mockDeps, mockTemplate, 'found@example.com');
            expect(result).toEqual(mockUser);
        });

        it('should return null if not found', async () => {
            // Mock empty results for both calls (exact and contains)
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => ({ items: [] })
            });

            const result = await findUserByEmail(mockDeps, mockTemplate, 'missing@example.com');
            expect(result).toBeNull();
        });
    });

    describe('findUserByNameWithFallbacks', () => {
        it('should find user by full name', async () => {
            const mockUser = { firstName: 'John', lastName: 'Doe' };
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => ({ items: [mockUser] })
            });

            const result = await findUserByNameWithFallbacks(mockDeps, mockTemplate, 'John', 'Doe');
            expect(result).toEqual(mockUser);
        });

        it('should fallback to first name only if full name fails', async () => {
            const mockUser = { firstName: 'John', lastName: 'Doe' };

            // Expected calls:
            // 1. fetchByName('John', 'Doe') -> returns []
            // 2. fetchByName('John') -> returns [mockUser]

            (global.fetch as any)
                .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
                .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [mockUser] }) });

            const result = await findUserByNameWithFallbacks(mockDeps, mockTemplate, 'John', 'Doe');
            expect(result).toEqual(mockUser);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('retrying with firstName only'), expect.any(Object));
        });
    });
});
