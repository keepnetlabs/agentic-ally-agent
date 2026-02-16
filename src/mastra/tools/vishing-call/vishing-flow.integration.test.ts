/**
 * Integration test: Vishing flow (getUserInfo → listPhoneNumbers → initiateVishingCall)
 *
 * Verifies the tools work together when resolving a user by email and initiating a call.
 * Mocks external APIs (platform user search, ElevenLabs).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestStorage } from '../../utils/core/request-storage';
import { getUserInfoTool } from '../user-management/get-user-info-tool';
import { listPhoneNumbersTool, initiateVishingCallTool } from './index';

const mockBaseApiUrl = 'https://api.test';

describe('Vishing Flow Integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ELEVENLABS_API_KEY = 'test-key';
    process.env.ELEVENLABS_AGENT_ID = 'test-agent';
    requestStorage.enterWith({
      token: 'test-token',
      companyId: 'test-company',
      baseApiUrl: mockBaseApiUrl,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_AGENT_ID;
  });

  it('should resolve user by email and initiate call when all APIs succeed', async () => {
    const mockUser = {
      targetUserResourceId: 'user-vish',
      firstName: 'Alice',
      lastName: 'Test',
      email: 'alice@example.com',
      phoneNumber: '+905551234567',
    };
    const mockTimeline = { data: { results: [] } };
    const mockPhoneNumbers = [
      { phone_number: '+15551234567', phone_number_id: 'pn-1' },
      { phone_number: '+15559876543', phone_number_id: 'pn-2' },
    ];
    const mockCallResponse = {
      conversation_id: 'conv-123',
      callSid: 'CA-abc',
    };

    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [mockUser] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockTimeline })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhoneNumbers,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCallResponse,
      });

    const userResult = await getUserInfoTool.execute({
      context: { email: 'alice@example.com', skipAnalysis: true },
    } as any);

    expect(userResult.success).toBe(true);
    expect(userResult.userInfo?.targetUserResourceId).toBe('user-vish');
    expect(userResult.userInfo?.phoneNumber).toBe('+905551234567');

    const listResult = await listPhoneNumbersTool.execute({ context: {} } as any);
    expect(listResult.phoneNumbers).toHaveLength(2);
    expect(listResult.phoneNumbers?.[0]?.phone_number_id).toBe('pn-1');

    const callResult = await initiateVishingCallTool.execute({
      context: {
        agentPhoneNumberId: 'pn-1',
        toNumber: userResult.userInfo?.phoneNumber ?? '',
        prompt: 'You are a bank officer. Verify account.',
        firstMessage: 'Hello, this is the bank calling.',
      },
    } as any);

    expect(callResult.success).toBe(true);
    expect(callResult.conversationId).toBe('conv-123');
    expect(callResult.callSid).toBe('CA-abc');

    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('should handle user not found gracefully', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });

    const userResult = await getUserInfoTool.execute({
      context: { email: 'nonexistent@example.com', skipAnalysis: true },
    } as any);

    expect(userResult.success).toBe(false);
    expect(userResult.error).toBeDefined();
    expect(userResult.userInfo).toBeUndefined();
  });

  it('should handle initiate call failure gracefully', async () => {
    const mockUser = {
      targetUserResourceId: 'user-vish',
      firstName: 'Alice',
      lastName: 'Test',
      email: 'alice@example.com',
      phoneNumber: '+905551234567',
    };
    const mockTimeline = { data: { results: [] } };
    const mockPhoneNumbers = [{ phone_number: '+15551234567', phone_number_id: 'pn-1' }];

    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [mockUser] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockTimeline })
      .mockResolvedValueOnce({ ok: true, json: async () => mockPhoneNumbers })
      .mockResolvedValueOnce({ ok: false, status: 422, text: async () => 'Invalid phone number' });

    const userResult = await getUserInfoTool.execute({
      context: { email: 'alice@example.com', skipAnalysis: true },
    } as any);
    expect(userResult.success).toBe(true);

    const listResult = await listPhoneNumbersTool.execute({ context: {} } as any);
    expect(listResult.phoneNumbers).toHaveLength(1);

    const callResult = await initiateVishingCallTool.execute({
      context: {
        agentPhoneNumberId: 'pn-1',
        toNumber: mockUser.phoneNumber,
        prompt: 'Test',
        firstMessage: 'Hello',
      },
    } as any);

    expect(callResult.success).toBe(false);
    expect(callResult.error).toBeDefined();
  });
});
