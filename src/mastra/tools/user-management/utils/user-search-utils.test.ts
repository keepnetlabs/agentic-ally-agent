import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchUsersWithFilters, findUserByEmail, findUserById, findUserByNameWithFallbacks } from './user-search-utils';

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const mockDeps = {
  token: 'fake-token',
  logger: mockLogger,
  baseApiUrl: 'https://api.test',
};

const mockTemplate = {
  filter: {
    FilterGroups: [{ FilterItems: [] }],
  },
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
        json: async () => ({ items: mockUsers }),
      });

      const result = await fetchUsersWithFilters(mockDeps, mockTemplate, []);
      expect(result).toEqual(mockUsers);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/leaderboard/get-all'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer fake-token',
          }),
        })
      );
    });

    it('should fallback to target-users search when primary is empty', async () => {
      const fallbackUsers = [{ id: 2, email: 'fallback@example.com' }];
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: fallbackUsers }) });

      const result = await fetchUsersWithFilters(mockDeps, mockTemplate, []);
      expect(result).toEqual(fallbackUsers);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/api/leaderboard/get-all'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/api/target-users/search'),
        expect.any(Object)
      );
    });

    it('should throw error on failed fetch', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: async () => 'Server Error',
        json: async () => ({ error: 'Server Error' }),
      });

      await expect(fetchUsersWithFilters(mockDeps, mockTemplate, [])).rejects.toThrow('User search API error 500');
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
        json: async () => ({ items: [mockUser] }),
      });

      const result = await findUserByEmail(mockDeps, mockTemplate, 'found@example.com');
      expect(result).toEqual(mockUser);
    });

    it('should fallback to target-users search when exact match not found', async () => {
      const fallbackUser = { email: 'fallback@example.com' };
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ email: 'other@example.com' }] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [fallbackUser] }) });

      const result = await findUserByEmail(mockDeps, mockTemplate, 'fallback@example.com');
      expect(result).toEqual(fallbackUser);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/api/leaderboard/get-all'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/api/target-users/search'),
        expect.any(Object)
      );
    });

    it('should return null if not found', async () => {
      // Mock empty results for both calls (exact and contains)
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      });

      const result = await findUserByEmail(mockDeps, mockTemplate, 'missing@example.com');
      expect(result).toBeNull();
    });

    it('should merge phone from direct lookup when search result has no phoneNumber', async () => {
      const searchUser = {
        email: 'enrich@example.com',
        targetUserResourceId: 'uid-123',
        firstName: 'Jane',
        department: 'Sales',
      };
      const directUserData = {
        resourceId: 'uid-123',
        phoneNumber: '+905551234567',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'enrich@example.com',
      };

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [searchUser] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: directUserData }) });

      const result = await findUserByEmail(mockDeps, mockTemplate, 'enrich@example.com');

      expect(result).toEqual({ ...searchUser, phoneNumber: '+905551234567' });
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/api/target-users/uid-123'),
        expect.any(Object)
      );
    });

    it('should return base user without phone when direct lookup returns 404', async () => {
      const searchUser = {
        email: 'no-phone@example.com',
        targetUserResourceId: 'uid-404',
        firstName: 'Bob',
      };

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [searchUser] }) })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      const result = await findUserByEmail(mockDeps, mockTemplate, 'no-phone@example.com');

      expect(result).toEqual(searchUser);
      expect(result?.phoneNumber).toBeUndefined();
    });

    it('should return base user without phone when direct lookup throws (e.g. 500) after retry', async () => {
      const searchUser = {
        email: 'resilient@example.com',
        targetUserResourceId: 'uid-500',
        firstName: 'Resilient',
      };

      const error500 = { ok: false, status: 500, text: async () => 'Server Error' };
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [searchUser] }) })
        .mockResolvedValueOnce(error500)
        .mockResolvedValueOnce(error500);

      const result = await findUserByEmail(mockDeps, mockTemplate, 'resilient@example.com');

      expect(result).toEqual(searchUser);
      expect(result?.phoneNumber).toBeUndefined();
      const warnCalls = mockLogger.warn.mock.calls.filter((c: any) => c[0]?.includes('Phone enrichment failed'));
      expect(warnCalls.length).toBeGreaterThan(0);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('findUserById', () => {
    it('should return user when found with phone', async () => {
      const mockUser = {
        targetUserResourceId: 'uid-1',
        email: 'has-phone@example.com',
        phoneNumber: '+15551111111',
        firstName: 'Complete',
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ items: [mockUser] }),
      });

      const result = await findUserById(mockDeps, mockTemplate, 'uid-1');
      expect(result).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return null when not found', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });

      const result = await findUserById(mockDeps, mockTemplate, 'uid-nonexistent');
      expect(result).toBeNull();
    });

    it('should fallback to target-users search when primary returns no match', async () => {
      const fallbackUser = {
        targetUserResourceId: 'uid-fallback',
        email: 'fallback-id@example.com',
        firstName: 'Fallback',
        phoneNumber: '+15550000000',
      };
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ targetUserResourceId: 'other' }] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [fallbackUser] }) });

      const result = await findUserById(mockDeps, mockTemplate, 'uid-fallback');
      expect(result).toEqual(fallbackUser);
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/api/target-users/search'),
        expect.any(Object)
      );
    });

    it('should merge phone from direct lookup when search result has no phoneNumber', async () => {
      const searchUser = {
        targetUserResourceId: 'uid-456',
        email: 'id@example.com',
        firstName: 'John',
        preferredLanguage: 'en',
      };
      const directUserData = {
        resourceId: 'uid-456',
        phoneNumber: '+15551234567',
        firstName: 'John',
        lastName: 'Smith',
        email: 'id@example.com',
      };

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [searchUser] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: directUserData }) });

      const result = await findUserById(mockDeps, mockTemplate, 'uid-456');

      expect(result).toEqual({ ...searchUser, phoneNumber: '+15551234567' });
      expect(result?.preferredLanguage).toBe('en');
    });

    it('should return base user without phone when direct lookup returns no phone', async () => {
      const searchUser = {
        targetUserResourceId: 'uid-789',
        email: 'nophone@example.com',
        firstName: 'Alice',
      };

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [searchUser] }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { resourceId: 'uid-789', email: 'nophone@example.com' } }),
        });

      const result = await findUserById(mockDeps, mockTemplate, 'uid-789');

      expect(result).toEqual(searchUser);
      expect(result?.phoneNumber).toBeUndefined();
    });
  });

  describe('findUserByNameWithFallbacks', () => {
    it('should find user by full name', async () => {
      const mockUser = { firstName: 'John', lastName: 'Doe' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ items: [mockUser] }),
      });

      const result = await findUserByNameWithFallbacks(mockDeps, mockTemplate, 'John', 'Doe');
      expect(result).toEqual(mockUser);
    });

    it('should fallback to first name only if full name fails', async () => {
      const mockUser = { firstName: 'John', lastName: 'Doe' };

      // Expected calls:
      // 1. fetchByName('John', 'Doe') -> primary fetch returns []
      // 2. fetchByName('John', 'Doe') -> fallback fetch returns []
      // 3. fetchByName('John') -> primary fetch returns [mockUser]

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) }) // Primary for ('John', 'Doe')
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) }) // Fallback for ('John', 'Doe')
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [mockUser] }) }); // Primary for ('John')

      const result = await findUserByNameWithFallbacks(mockDeps, mockTemplate, 'John', 'Doe');
      expect(result).toEqual(mockUser);

      // Check that the firstName-only fallback log was called (appears after the primary search empty log)
      const infoCallsWithFallback = mockLogger.info.mock.calls.filter((call: any) =>
        call[0]?.includes('retrying with firstName only')
      );
      expect(infoCallsWithFallback.length).toBeGreaterThan(0);
    });

    it('should fallback to last name last token if last name has spaces', async () => {
      const mockUser = { firstName: 'John', lastName: 'De Luca' };

      // Expected calls:
      // 1. fetchByName('John', 'De Luca') -> primary fetch returns []
      // 2. fetchByName('John', 'De Luca') -> fallback fetch returns []
      // 3. fetchByName('John', 'Luca') -> primary fetch returns [mockUser]

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) }) // Primary for ('John', 'De Luca')
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) }) // Fallback for ('John', 'De Luca')
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [mockUser] }) }); // Primary for ('John', 'Luca')

      const result = await findUserByNameWithFallbacks(mockDeps, mockTemplate, 'John', 'De Luca');
      expect(result).toEqual(mockUser);

      // Check that the last token fallback log was called (appears after the primary search empty log)
      const infoCallsWithLastToken = mockLogger.info.mock.calls.filter((call: any) =>
        call[0]?.includes('retrying with last token')
      );
      expect(infoCallsWithLastToken.length).toBeGreaterThan(0);
    });

    it('should merge phone from direct lookup when name search result has no phoneNumber', async () => {
      const searchUser = {
        firstName: 'Maria',
        lastName: 'Garcia',
        targetUserResourceId: 'uid-name',
        email: 'maria@example.com',
      };
      const directUserData = {
        resourceId: 'uid-name',
        phoneNumber: '+34912345678',
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria@example.com',
      };

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [searchUser] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: directUserData }) });

      const result = await findUserByNameWithFallbacks(mockDeps, mockTemplate, 'Maria', 'Garcia');

      expect(result).toEqual({ ...searchUser, phoneNumber: '+34912345678' });
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/api/target-users/uid-name'),
        expect.any(Object)
      );
    });
  });
});
