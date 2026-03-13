import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchGroupMembers, fetchGroupMembersPage } from './group-members';
import '../../../__tests__/setup';

vi.mock('./logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('fetchGroupMembers', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  it('should return all members across pages', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            results: [
              { resourceId: 'u1', firstName: 'John', lastName: 'Doe', status: 'Active' },
              { resourceId: 'u2', firstName: 'Jane', lastName: 'Smith', status: 'Active' },
            ],
            totalNumberOfPages: 1,
            totalNumberOfRecords: 2,
          },
        }),
      } as Response);

    const result = await fetchGroupMembers('token', 'group-123', 'https://api.test.com');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      resourceId: 'u1',
      firstName: 'John',
      lastName: 'Doe',
      department: undefined,
      email: undefined,
      preferredLanguage: undefined,
      phoneNumber: undefined,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/target-groups/group-123/users'),
      expect.any(Object)
    );
  });

  it('should exclude non-Active users', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          results: [
            { resourceId: 'u1', firstName: 'A', lastName: 'B', status: 'Active' },
            { resourceId: 'u2', firstName: 'C', lastName: 'D', status: 'Inactive' },
          ],
          totalNumberOfPages: 1,
        },
      }),
    } as Response);

    const result = await fetchGroupMembers('token', 'g', 'https://api.test.com');
    expect(result).toHaveLength(1);
    expect(result[0].resourceId).toBe('u1');
  });

  it('should throw on API error', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => 'Access denied',
    } as Response);

    await expect(fetchGroupMembers('token', 'g', 'https://api.test.com')).rejects.toThrow(
      /Failed to fetch group members/
    );
  });
});

describe('fetchGroupMembersPage', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  it('should return users and pagination metadata', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          results: [{ resourceId: 'u1', firstName: 'A', lastName: 'B', status: 'Active' }],
          totalNumberOfPages: 3,
          totalNumberOfRecords: 250,
        },
      }),
    } as Response);

    const result = await fetchGroupMembersPage('token', 'g', 'https://api.test.com', 1);
    expect(result.users).toHaveLength(1);
    expect(result.totalPages).toBe(3);
    expect(result.totalRecords).toBe(250);
  });

  it('should throw on API error', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => '',
    } as Response);

    await expect(
      fetchGroupMembersPage('token', 'g', 'https://api.test.com', 1)
    ).rejects.toThrow(/Failed to fetch group members page/);
  });
});
