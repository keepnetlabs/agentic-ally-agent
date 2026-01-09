import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTargetGroupInfoTool } from './get-target-group-info-tool';
import { requestStorage } from '../../utils/core/request-storage';
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

  it('fails gracefully when group search returns empty', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const result = await getTargetGroupInfoTool.execute({
      context: { groupName: 'Unknown Group' },
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

