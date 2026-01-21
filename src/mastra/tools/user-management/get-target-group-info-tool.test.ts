import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTargetGroupInfoTool } from './get-target-group-info-tool';
import { requestStorage } from '../../utils/core/request-storage';
import { errorService } from '../../services/error-service';
import '../../../../src/__tests__/setup';

const mockToken = 'group-token-123';
const mockCompanyId = 'company-xyz';
const mockBaseApiUrl = 'https://platform.test';
const groupSearchUrl = `${mockBaseApiUrl}/api/target-groups/search`;

describe('getTargetGroupInfoTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestStorage.enterWith({
      token: mockToken,
      companyId: mockCompanyId,
      baseApiUrl: mockBaseApiUrl,
    });
    global.fetch = vi.fn();
  });

  it('resolves group metadata by name', async () => {
    const mockGroup = {
      targetGroupResourceId: 'group-123',
      groupName: 'IT Department',
      departmentName: 'Information Technology',
      memberCount: 42,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockGroup] }),
    });

    const result = await getTargetGroupInfoTool.execute({
      context: { groupName: 'IT Department' },
    } as any);

    expect(result.success).toBe(true);
    expect(result.groupInfo?.targetGroupResourceId).toBe('group-123');
    expect(result.groupInfo?.memberCount).toBe(42);

    const firstCall = (global.fetch as any).mock.calls[0];
    expect(firstCall[0]).toBe(groupSearchUrl);

    const payload = JSON.parse(firstCall[1].body);
    const filterItems = payload.filter.FilterGroups[1].FilterItems;
    expect(filterItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ FieldName: 'Name', Value: 'IT Department' }),
      ])
    );
  });

  it('skips fetch when targetGroupResourceId is provided', async () => {
    const fetchSpy = global.fetch as any;

    const result = await getTargetGroupInfoTool.execute({
      context: {
        targetGroupResourceId: 'group-999',
        groupName: 'Should not matter',
      },
    } as any);

    expect(result.success).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.groupInfo?.targetGroupResourceId).toBe('group-999');
  });

  it('returns error when token is missing', async () => {
    requestStorage.enterWith({ companyId: mockCompanyId });
    const result = await getTargetGroupInfoTool.execute({
      context: { groupName: 'Any Group' },
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects short group names', async () => {
    const result = await getTargetGroupInfoTool.execute({
      context: { groupName: 'IT' }, // < 3 chars
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('at least 3 characters');
  });

  it('retries with simplified name on empty result', async () => {
    // First call returns empty
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });
    // Second call returns result
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ targetGroupResourceId: 'g-retry', groupName: 'Finance' }] }),
    });

    const result = await getTargetGroupInfoTool.execute({
      context: { groupName: 'Finance Group' },
    } as any);

    expect(result.success).toBe(true);
    expect(result.groupInfo?.targetGroupResourceId).toBe('g-retry');

    // Check second call used simplified name
    const calls = (global.fetch as any).mock.calls;
    expect(calls.length).toBe(2);

    // First call with "Finance Group"
    const firstPayload = JSON.parse(calls[0][1].body);
    expect(firstPayload.filter.FilterGroups[1].FilterItems[0].Value).toBe('Finance Group');

    // Second call with "Finance" (stripped "Group")
    const secondPayload = JSON.parse(calls[1][1].body);
    expect(secondPayload.filter.FilterGroups[1].FilterItems[0].Value).toBe('Finance');
  });

  it('emits UI signal via writer', async () => {
    const mockWriter = { write: vi.fn() };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ targetGroupResourceId: 'g-signal', groupName: 'Signal' }] }),
    });

    await getTargetGroupInfoTool.execute({
      context: { groupName: 'Signal Group' },
      writer: mockWriter,
    } as any);

    expect(mockWriter.write).toHaveBeenCalled();
    const callArgs = mockWriter.write.mock.calls.map((c) => c[0]);
    expect(callArgs.some((arg) => arg.type === 'text-delta' && arg.delta.includes('::ui:target_group::'))).toBe(true);
  });

  it('prioritizes exact name match', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { targetGroupResourceId: 'g-1', groupName: 'Sales Support' },
          { targetGroupResourceId: 'g-2', groupName: 'Sales' }, // Exact match
          { targetGroupResourceId: 'g-3', groupName: 'Sales Admin' },
        ],
      }),
    });

    const result = await getTargetGroupInfoTool.execute({
      context: { groupName: 'Sales' },
    } as any);

    expect(result.groupInfo?.targetGroupResourceId).toBe('g-2');
  });

  it('handles result structure variation', async () => {
    // API might return { results: [...] } instead of { items: [...] } or wrapper { data: { results: ... } }
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          results: [{ targetGroupResourceId: 'g-nested', groupName: 'Nested' }]
        }
      }),
    });

    const result = await getTargetGroupInfoTool.execute({
      context: { groupName: 'Nested' },
    } as any);

    expect(result.success).toBe(true);
    expect(result.groupInfo?.targetGroupResourceId).toBe('g-nested');
  });
});

