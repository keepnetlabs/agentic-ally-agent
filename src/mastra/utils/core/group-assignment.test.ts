import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fanOutGroupAssignment, type FanOutGroupAssignmentOptions } from './group-assignment';
import type { AgenticActivitiesPayload, WorkerSendResponse } from './worker-api-client';

vi.mock('./logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('./url-validator', () => ({
  resolveBaseApiUrl: (url?: string) => url ?? 'https://api.example.com',
}));

const mockFetchGroupMembers = vi.fn();
vi.mock('./group-members', () => ({
  fetchGroupMembers: (...args: unknown[]) => mockFetchGroupMembers(...args),
}));

function makeMember(id: string) {
  return { resourceId: id, firstName: 'F', lastName: 'L' };
}

function makeOpts(overrides: Partial<FanOutGroupAssignmentOptions> = {}): FanOutGroupAssignmentOptions {
  return {
    token: 'tok',
    groupResourceId: 'grp-1',
    baseApiUrl: 'https://api.example.com',
    buildPayload: (uid: string) => ({ targetUserResourceId: uid }) as unknown as AgenticActivitiesPayload,
    callApi: vi.fn().mockResolvedValue({} as WorkerSendResponse) as any,
    ...overrides,
  };
}

describe('fanOutGroupAssignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty result for groups with no members', async () => {
    mockFetchGroupMembers.mockResolvedValue([]);
    const result = await fanOutGroupAssignment(makeOpts());

    expect(result).toEqual({ totalUsers: 0, succeeded: 0, failed: 0, failedUsers: [] });
  });

  it('processes a single user successfully', async () => {
    mockFetchGroupMembers.mockResolvedValue([makeMember('u-1')]);
    const callApi = vi.fn().mockResolvedValue({});
    const result = await fanOutGroupAssignment(makeOpts({ callApi }));

    expect(result.totalUsers).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(callApi).toHaveBeenCalledTimes(1);
  });

  it('processes multiple users in parallel chunks', async () => {
    const members = Array.from({ length: 10 }, (_, i) => makeMember(`u-${i}`));
    mockFetchGroupMembers.mockResolvedValue(members);
    const callApi = vi.fn().mockResolvedValue({});

    const result = await fanOutGroupAssignment(makeOpts({ callApi, concurrency: 3 }));

    expect(result.totalUsers).toBe(10);
    expect(result.succeeded).toBe(10);
    expect(result.failed).toBe(0);
    expect(callApi).toHaveBeenCalledTimes(10);
  });

  it('handles partial failures (some succeed, some fail)', async () => {
    const members = [makeMember('ok-1'), makeMember('fail-1'), makeMember('ok-2'), makeMember('fail-2')];
    mockFetchGroupMembers.mockResolvedValue(members);

    const callApi = vi.fn().mockImplementation((payload: AgenticActivitiesPayload) => {
      if ((payload as Record<string, string>).targetUserResourceId?.startsWith('fail')) {
        return Promise.reject(new Error('API error'));
      }
      return Promise.resolve({});
    });

    const result = await fanOutGroupAssignment(makeOpts({ callApi, concurrency: 10 }));

    expect(result.totalUsers).toBe(4);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(2);
    expect(result.failedUsers).toHaveLength(2);
    expect(result.failedUsers[0].error).toBe('API error');
  });

  it('caps failedUsers array at MAX_FAILED_USERS_REPORTED (50)', async () => {
    const members = Array.from({ length: 70 }, (_, i) => makeMember(`u-${i}`));
    mockFetchGroupMembers.mockResolvedValue(members);
    const callApi = vi.fn().mockRejectedValue(new Error('boom'));

    const result = await fanOutGroupAssignment(makeOpts({ callApi, concurrency: 70 }));

    expect(result.failed).toBe(70);
    expect(result.failedUsers).toHaveLength(50);
  });

  it('returns limitExceeded when group exceeds maxUsers', async () => {
    const members = Array.from({ length: 15 }, (_, i) => makeMember(`u-${i}`));
    mockFetchGroupMembers.mockResolvedValue(members);
    const callApi = vi.fn();

    const result = await fanOutGroupAssignment(makeOpts({ callApi, maxUsers: 10 }));

    expect(result.limitExceeded).toBe(true);
    expect(result.totalUsers).toBe(15);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(callApi).not.toHaveBeenCalled();
  });

  it('uses default MAX_GROUP_ASSIGN_USERS from constants as maxUsers', async () => {
    const members = Array.from({ length: 5 }, (_, i) => makeMember(`u-${i}`));
    mockFetchGroupMembers.mockResolvedValue(members);
    const callApi = vi.fn().mockResolvedValue({});

    const result = await fanOutGroupAssignment(makeOpts({ callApi }));

    expect(result.limitExceeded).toBeUndefined();
    expect(result.succeeded).toBe(5);
  });

  it('passes correct payload from buildPayload to callApi', async () => {
    mockFetchGroupMembers.mockResolvedValue([makeMember('u-42')]);
    const callApi = vi.fn().mockResolvedValue({});
    const buildPayload = vi.fn().mockReturnValue({ custom: 'data' });

    await fanOutGroupAssignment(makeOpts({ callApi, buildPayload }));

    expect(buildPayload).toHaveBeenCalledWith('u-42');
    expect(callApi).toHaveBeenCalledWith({ custom: 'data' });
  });

  it('handles non-Error rejection reasons gracefully', async () => {
    mockFetchGroupMembers.mockResolvedValue([makeMember('u-1')]);
    const callApi = vi.fn().mockRejectedValue('string-error');

    const result = await fanOutGroupAssignment(makeOpts({ callApi }));

    expect(result.failed).toBe(1);
    expect(result.failedUsers[0].error).toBe('string-error');
  });

  it('resolves baseApiUrl via resolveBaseApiUrl', async () => {
    mockFetchGroupMembers.mockResolvedValue([]);
    await fanOutGroupAssignment(makeOpts({ baseApiUrl: 'https://dash.example.com' }));

    expect(mockFetchGroupMembers).toHaveBeenCalledWith('tok', 'grp-1', 'https://dash.example.com');
  });

  it('handles undefined baseApiUrl with default', async () => {
    mockFetchGroupMembers.mockResolvedValue([]);
    await fanOutGroupAssignment(makeOpts({ baseApiUrl: undefined }));

    expect(mockFetchGroupMembers).toHaveBeenCalledWith('tok', 'grp-1', 'https://api.example.com');
  });
});
