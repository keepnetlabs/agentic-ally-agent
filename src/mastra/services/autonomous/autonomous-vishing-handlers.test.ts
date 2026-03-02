import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateText } from 'ai';
import { initiateAutonomousVishingCall } from './autonomous-vishing-handlers';

vi.mock('ai', () => ({ generateText: vi.fn() }));
vi.mock('../../model-providers', () => ({
  getDefaultAgentModel: vi.fn().mockReturnValue({ id: 'test-model' }),
}));
vi.mock('../../tools/vishing-call', () => ({
  listPhoneNumbersTool: {
    execute: vi.fn().mockResolvedValue({
      success: true,
      phoneNumbers: [{ phone_number_id: 'phone-123' }],
    }),
  },
}));

const mockGenerateText = vi.mocked(generateText);

describe('AutonomousVishingHandlers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, ELEVENLABS_API_KEY: 'test-key' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
      ok: true,
        json: () => Promise.resolve({ conversation_id: 'conv-1', callSid: 'sid-1' }),
      })
    );
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('always calls LLM for scenario generation (even with empty context)', async () => {
    const llmOutput = {
      role: 'IT Support Specialist',
      pretext: 'Security audit callback',
      firstMessage: 'Hello, this is IT Security. We detected unusual login activity. Can you confirm a few details?',
    };
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(llmOutput) } as never);

    const result = await initiateAutonomousVishingCall({
      toNumber: '+905551234567',
      executiveReport: '',
      toolResult: { userInfo: { department: 'IT', preferredLanguage: 'en-gb' } },
    });

    expect(result.success).toBe(true);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.conversation_initiation_client_data.conversation_config_override.agent.first_message).toBe(
      llmOutput.firstMessage
    );
  });

  it('passes department and language to LLM with minimal context', async () => {
    const llmOutput = {
      role: 'HR Benefits Representative',
      pretext: 'Benefits enrollment deadline',
      firstMessage: 'Hi, this is HR. Your benefits deadline is today. Do you have a moment?',
    };
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(llmOutput) } as never);

    const result = await initiateAutonomousVishingCall({
      toNumber: '+905551234567',
      executiveReport: 'Short',
      toolResult: { userInfo: { department: 'HR' } },
    });

    expect(result.success).toBe(true);
    const generateCall = mockGenerateText.mock.calls[0][0];
    expect(generateCall.messages[1].content).toContain('Target department: HR');
  });

  it('calls LLM when executiveReport has sufficient context', async () => {
    const llmOutput = {
      role: 'Custom Bank Officer',
      pretext: 'Urgent fraud verification for recent purchase',
      firstMessage: 'Hello, this is the Fraud Prevention Team. We need to verify a recent transaction. Can you confirm?',
    };
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(llmOutput) } as never);

    const result = await initiateAutonomousVishingCall({
      toNumber: '+905551234567',
      executiveReport:
        'User shows susceptibility to financial pretexts. Recommended focus: bank fraud, transaction verification. Growth area: verifying caller identity before sharing any details.',
      toolResult: { userInfo: { department: 'Finance', preferredLanguage: 'en-gb' } },
    });

    expect(result.success).toBe(true);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.conversation_initiation_client_data.conversation_config_override.agent.first_message).toBe(
      llmOutput.firstMessage
    );
    expect(body.conversation_initiation_client_data.conversation_config_override.agent.prompt.prompt).toContain(
      'Custom Bank Officer'
    );
  });

  it('passes Turkish to LLM prompt when preferredLanguage is tr-tr', async () => {
    const llmOutput = {
      role: 'Banka Güvenlik Görevlisi',
      pretext: 'Şüpheli işlem doğrulaması',
      firstMessage: 'Merhaba, Güvenlik Ekibinden arıyorum. Son bir işlemi doğrulamamız gerekiyor. Birkaç bilgiyi onaylayabilir misiniz?',
    };
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(llmOutput) } as never);

    await initiateAutonomousVishingCall({
      toNumber: '+905551234567',
      executiveReport: 'A'.repeat(100),
      toolResult: { userInfo: { department: 'Finance', preferredLanguage: 'tr-tr' } },
    });

    const generateCall = mockGenerateText.mock.calls[0][0];
    expect(generateCall.messages[0].content).toContain('tr-tr');
    expect(generateCall.messages[0].content).toContain('MUST be written entirely in tr-tr (BCP-47)');
  });

  it('returns error when LLM fails (no fallback)', async () => {
    mockGenerateText.mockRejectedValue(new Error('LLM unavailable'));

    const result = await initiateAutonomousVishingCall({
      toNumber: '+905551234567',
      executiveReport: 'A'.repeat(100),
      toolResult: { userInfo: { department: 'Sales' } },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Vishing scenario generation failed');
  });

  it('returns error when ELEVENLABS_API_KEY is not set', async () => {
    delete process.env.ELEVENLABS_API_KEY;

    const result = await initiateAutonomousVishingCall({
      toNumber: '+905551234567',
      toolResult: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('ELEVENLABS_API_KEY');
  });

  it('returns error when phone number is invalid', async () => {
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({
        role: 'Security Officer',
        pretext: 'Verification',
        firstMessage: 'Hello, security verification call.',
      }),
    } as never);

    const result = await initiateAutonomousVishingCall({
      toNumber: 'invalid',
      toolResult: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('E.164');
  });

  it('always calls LLM for Turkish - generates dynamically', async () => {
    const llmOutput = {
      role: 'BT Güvenlik Görevlisi',
      pretext: 'Şüpheli giriş aktivitesi doğrulaması',
      firstMessage: 'Merhaba, BT Güvenlik biriminden arıyorum. Hesabınızda olağandışı giriş tespit ettik. Birkaç bilgiyi doğrulayabilir misiniz?',
    };
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(llmOutput) } as never);

    const result = await initiateAutonomousVishingCall({
      toNumber: '+905551234567',
      executiveReport: 'Short',
      toolResult: { userInfo: { department: 'IT', preferredLanguage: 'tr-tr' } },
    });

    expect(result.success).toBe(true);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);

    const generateCall = mockGenerateText.mock.calls[0][0];
    expect(generateCall.messages[0].content).toContain('tr-tr');

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.conversation_initiation_client_data.conversation_config_override.agent.first_message).toContain(
      'Merhaba'
    );
  });

  it('returns error when LLM fails - Turkish context (no fallback)', async () => {
    mockGenerateText.mockRejectedValue(new Error('LLM unavailable'));

    const result = await initiateAutonomousVishingCall({
      toNumber: '+905551234567',
      executiveReport: 'A'.repeat(100),
      toolResult: { userInfo: { department: 'Sales', preferredLanguage: 'tr-tr' } },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Vishing scenario generation failed');
  });
});
