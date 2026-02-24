/**
 * Unit tests for initiate-vishing-call-tool
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initiateVishingCallTool } from './initiate-vishing-call-tool';

const expectedUrl = 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call';

describe('initiateVishingCallTool', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.ELEVENLABS_API_KEY = 'test-api-key';
    process.env.ELEVENLABS_AGENT_ID = 'test-agent-id';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  const validContext = {
    agentPhoneNumberId: 'pn-123',
    toNumber: '+905551234567',
    prompt: 'You are a bank officer. Verify account.',
    firstMessage: 'Hello, this is the bank calling.',
  };

  it('should return error when ELEVENLABS_API_KEY is not set', async () => {
    delete process.env.ELEVENLABS_API_KEY;

    const result = await initiateVishingCallTool.execute({
      context: validContext,
      writer: null,
    } as never);

    expect(result.success).toBe(false);
    expect(result.error).toContain('ELEVENLABS_API_KEY');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return error for invalid phone number format', async () => {
    const result = await initiateVishingCallTool.execute({
      context: { ...validContext, toNumber: 'invalid' },
      writer: null,
    } as never);

    expect(result.success).toBe(false);
    expect(result.error).toContain('E.164');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return error for phone number without leading slash', async () => {
    const result = await initiateVishingCallTool.execute({
      context: { ...validContext, toNumber: '905551234567' },
      writer: null,
    } as never);

    expect(result.success).toBe(false);
    expect(result.error).toContain('E.164');
  });

  it('should initiate call successfully', async () => {
    const mockData = {
      conversation_id: 'conv-123',
      callSid: 'CA-abc',
    };

    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await initiateVishingCallTool.execute({
      context: validContext,
      writer: null,
    } as never);

    expect(result.success).toBe(true);
    expect(result.conversationId).toBe('conv-123');
    expect(result.callSid).toBe('CA-abc');
    expect(global.fetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'xi-api-key': 'test-api-key',
        }),
      })
    );
  });

  it('should use custom agentId when provided', async () => {
    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ conversation_id: 'c1', callSid: 's1' }),
    });

    await initiateVishingCallTool.execute({
      context: { ...validContext, agentId: 'custom-agent-456' },
      writer: null,
    } as never);

    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.agent_id).toBe('custom-agent-456');
  });

  it('should return user-friendly error for 422 status', async () => {
    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      text: async () => 'Invalid phone number or agent config',
    });

    const result = await initiateVishingCallTool.execute({
      context: validContext,
      writer: null,
    } as never);

    expect(result.success).toBe(false);
    expect(result.error).toContain('phone number or agent configuration');
    expect(result.error).toContain('Please check');
  });

  it('should return generic error for other API errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server error',
    });

    const result = await initiateVishingCallTool.execute({
      context: validContext,
      writer: null,
    } as never);

    expect(result.success).toBe(false);
    expect(result.error).toContain('500');
  });

  it('should return timeout error on AbortError', async () => {
    (global.fetch as ReturnType<typeof vi.fn>) = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));

    const result = await initiateVishingCallTool.execute({
      context: validContext,
      writer: null,
    } as never);

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });

  it('should return generic error on other fetch failures', async () => {
    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await initiateVishingCallTool.execute({
      context: validContext,
      writer: null,
    } as never);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('should emit UI signal when writer is provided', async () => {
    const mockWriter = {
      write: vi.fn().mockResolvedValue(undefined),
    };

    (global.fetch as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ conversation_id: 'conv-ui', callSid: 'CA-ui' }),
    });

    const result = await initiateVishingCallTool.execute({
      context: validContext,
      writer: mockWriter,
    } as never);

    expect(result.success).toBe(true);
    expect(mockWriter.write).toHaveBeenCalled();
    const deltaCall = mockWriter.write.mock.calls.find((c: unknown[]) =>
      (c as [{ delta?: string }])[0]?.delta?.includes('::ui:vishing_call_started::')
    );
    expect(deltaCall).toBeDefined();
  });
});
