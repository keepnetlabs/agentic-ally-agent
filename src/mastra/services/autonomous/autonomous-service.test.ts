import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeAutonomousGeneration } from './autonomous-service';
import '../../../../src/__tests__/setup';
import * as userManagementModule from '../../tools/user-management';
import * as generatorsModule from './autonomous-content-generators';

vi.mock('../../tools/user-management', () => ({
  getUserInfoTool: {
    execute: vi.fn(),
  },
}));

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('./autonomous-content-generators', () => ({
  buildExecutiveReport: vi.fn(),
  generateContentForUser: vi.fn(),
  generateContentForGroup: vi.fn(),
}));

describe('executeAutonomousGeneration', () => {
  const mockToken = 'test-jwt-token';
  const mockGetUserInfo = vi.mocked((userManagementModule as any).getUserInfoTool.execute);
  const mockBuildExecutiveReport = vi.mocked(generatorsModule.buildExecutiveReport);
  const mockGenerateContentForUser = vi.mocked(generatorsModule.generateContentForUser);
  const mockGenerateContentForGroup = vi.mocked(generatorsModule.generateContentForGroup);

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUserInfo.mockResolvedValue({
      success: true,
      userInfo: {
        targetUserResourceId: 'user-123',
        department: 'IT',
      },
      recentActivities: [],
      analysisReport: {
        recommended_next_steps: {
          simulations: [{ title: 'Phishing Test' }],
          microlearnings: [{ title: 'Training Test' }],
        },
      },
    });

    mockBuildExecutiveReport.mockReturnValue('Executive report text');
    mockGenerateContentForUser.mockResolvedValue({
      phishingResult: { success: true },
      trainingResult: { success: true },
      smishingResult: { success: true },
    } as any);
    mockGenerateContentForGroup.mockResolvedValue({
      phishingResult: { success: true },
      trainingResult: { success: true },
      smishingResult: { success: true },
    } as any);
  });

  it('returns error when neither user nor group assignment is provided', async () => {
    const result = await executeAutonomousGeneration({
      token: mockToken,
      actions: ['phishing'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Must specify either user or group assignment');
  });

  it('calls getUserInfoTool with name context for user assignment', async () => {
    await executeAutonomousGeneration({
      token: mockToken,
      firstName: 'John',
      lastName: 'Doe',
      actions: ['phishing'],
    });

    expect(mockGetUserInfo).toHaveBeenCalledWith({
      context: { firstName: 'John', lastName: 'Doe' },
    });
  });

  it('calls getUserInfoTool with direct user context when targetUserResourceId exists', async () => {
    await executeAutonomousGeneration({
      token: mockToken,
      targetUserResourceId: 'user-42',
      departmentName: 'Finance',
      actions: ['training'],
    });

    expect(mockGetUserInfo).toHaveBeenCalledWith({
      context: { targetUserResourceId: 'user-42', departmentName: 'Finance' },
    });
  });

  it('passes smishing action through user generation flow', async () => {
    const result = await executeAutonomousGeneration({
      token: mockToken,
      firstName: 'Jane',
      lastName: 'Doe',
      actions: ['smishing'],
    });

    expect(mockGenerateContentForUser).toHaveBeenCalledTimes(1);
    expect(mockGenerateContentForUser.mock.calls[0][2]).toEqual(['smishing']);
    expect(result.success).toBe(true);
    expect(result.smishingResult?.success).toBe(true);
  });

  it('applies preferredLanguage override to userInfo before generation', async () => {
    await executeAutonomousGeneration({
      token: mockToken,
      firstName: 'Jane',
      lastName: 'Doe',
      preferredLanguage: 'tr-tr',
      actions: ['phishing'],
    });

    const toolResultArg = mockGenerateContentForUser.mock.calls[0][0] as any;
    expect(toolResultArg.userInfo.preferredLanguage).toBe('tr-tr');
  });

  it('uses group generation flow and includes smishing action', async () => {
    const result = await executeAutonomousGeneration({
      token: mockToken,
      targetGroupResourceId: 'group-123',
      actions: ['training', 'smishing'],
    });

    expect(mockGenerateContentForGroup).toHaveBeenCalledTimes(1);
    expect(mockGenerateContentForGroup).toHaveBeenCalledWith(
      ['training', 'smishing'],
      undefined,
      'group-123'
    );
    expect(result.success).toBe(true);
    expect(result.smishingResult?.success).toBe(true);
  });

  it('returns user info retrieval error when getUserInfoTool fails', async () => {
    mockGetUserInfo.mockResolvedValueOnce({
      success: false,
      error: 'User not found',
    });

    const result = await executeAutonomousGeneration({
      token: mockToken,
      firstName: 'John',
      lastName: 'Doe',
      actions: ['phishing'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('User not found');
  });

  it('preserves actions in catch-path errors', async () => {
    mockGetUserInfo.mockRejectedValueOnce(new Error('Network down'));

    const result = await executeAutonomousGeneration({
      token: mockToken,
      firstName: 'John',
      lastName: 'Doe',
      actions: ['phishing', 'smishing'],
    });

    expect(result.success).toBe(false);
    expect(result.actions).toEqual(['phishing', 'smishing']);
  });
});
