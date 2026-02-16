/**
 * Unit tests for vishing-conversations-summary-tool
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateVishingConversationsSummary } from './vishing-conversations-summary-tool';

const mockGenerateText = vi.fn();
vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

vi.mock('../../model-providers', () => ({
  getModelWithOverride: vi.fn(() => ({})),
  Model: { OPENAI_GPT_5_1: 'gpt-5.1' },
  ModelProvider: { OPENAI: 'openai' },
}));

vi.mock('../../utils/core/logger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('../../utils/content-processors/json-cleaner', () => ({
  cleanResponse: vi.fn((text: string) => text),
}));

describe('vishing-conversations-summary-tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validNestedResponse = JSON.stringify({
    summary: {
      timeline: [
        { timestamp: '0:01', label: 'Introduction', snippet: 'Agent introduced as bank support.' },
        { timestamp: '0:38', label: 'Data Request', snippet: 'Agent asked for OTP.' },
      ],
      disclosedInfo: [{ item: 'OTP code', timestamp: '0:45' }],
      outcome: 'data_disclosed',
    },
    nextSteps: [
      { title: 'Change Passwords', description: 'Change any exposed credentials immediately.' },
      { title: 'Contact Bank', description: 'Notify your bank if financial info was shared.' },
    ],
  });

  const validFlatResponse = JSON.stringify({
    timeline: [
      { timestamp: '0:01', label: 'Introduction', snippet: 'Call started.' },
      { timestamp: '0:30', label: 'Simulation Reveal', snippet: 'Simulation ended.' },
    ],
    disclosedInfo: [],
    outcome: 'refused',
    nextSteps: [{ title: 'Well Done', description: 'You correctly refused to share information.' }],
  });

  it('should return summary with statusCard for data_disclosed outcome', async () => {
    mockGenerateText.mockResolvedValue({ text: validNestedResponse });

    const messages = [
      { role: 'agent' as const, text: 'Hello, this is your bank.', timestamp: 0 },
      { role: 'user' as const, text: 'I will not share my OTP.', timestamp: 5 },
    ];

    const result = await generateVishingConversationsSummary(messages);

    expect(result.summary.outcome).toBe('data_disclosed');
    expect(result.summary.disclosedInfo).toHaveLength(1);
    expect(result.summary.disclosedInfo[0].item).toBe('OTP code');
    expect(result.statusCard.variant).toBe('warning');
    expect(result.statusCard.title).toBe('Data Disclosed');
    expect(result.nextSteps).toHaveLength(2);
  });

  it('should return summary with statusCard for refused outcome', async () => {
    mockGenerateText.mockResolvedValue({ text: validFlatResponse });

    const messages = [
      { role: 'agent' as const, text: 'Verify your account.' },
      { role: 'user' as const, text: 'No, I will call the bank directly.' },
    ];

    const result = await generateVishingConversationsSummary(messages);

    expect(result.summary.outcome).toBe('refused');
    expect(result.summary.disclosedInfo).toEqual([]);
    expect(result.statusCard.variant).toBe('success');
    expect(result.statusCard.title).toBe('No Data Disclosed');
    expect(result.nextSteps).toHaveLength(1);
  });

  it('should use default nextSteps when LLM returns invalid nextSteps in flat format', async () => {
    const invalidNextSteps = JSON.stringify({
      timeline: [{ timestamp: '0:01', label: 'Introduction', snippet: 'Test.' }],
      disclosedInfo: [],
      outcome: 'other',
      nextSteps: [{ invalid: 'structure' }, null, 123],
    });

    mockGenerateText.mockResolvedValue({ text: invalidNextSteps });

    const result = await generateVishingConversationsSummary([{ role: 'user', text: 'Hi' }]);

    expect(result.nextSteps.length).toBeGreaterThan(0);
    expect(result.nextSteps[0]).toHaveProperty('title');
    expect(result.nextSteps[0]).toHaveProperty('description');
  });

  it('should include timestamps in prompt when present', async () => {
    mockGenerateText.mockResolvedValue({ text: validFlatResponse });

    await generateVishingConversationsSummary([
      { role: 'agent', text: 'Hello', timestamp: 0 },
      { role: 'user', text: 'No', timestamp: 10 },
    ]);

    const callArgs = mockGenerateText.mock.calls[0][0];
    expect(callArgs.prompt).toContain('[0s]');
    expect(callArgs.prompt).toContain('[10s]');
  });

  it('should omit timestamps in prompt when not present', async () => {
    mockGenerateText.mockResolvedValue({ text: validFlatResponse });

    await generateVishingConversationsSummary([
      { role: 'agent', text: 'Hello' },
      { role: 'user', text: 'No' },
    ]);

    const callArgs = mockGenerateText.mock.calls[0][0];
    expect(callArgs.prompt).toContain('Agent: Hello');
    expect(callArgs.prompt).toContain('User: No');
  });

  it('should map detected outcome to Simulation Detected status card', async () => {
    const detectedResponse = JSON.stringify({
      summary: {
        timeline: [{ timestamp: '0:01', label: 'Introduction', snippet: 'Test.' }],
        disclosedInfo: [],
        outcome: 'detected',
      },
      nextSteps: [{ title: 'Good job', description: 'You detected the simulation.' }],
    });

    mockGenerateText.mockResolvedValue({ text: detectedResponse });

    const result = await generateVishingConversationsSummary([{ role: 'user', text: 'This is a test' }]);

    expect(result.statusCard.title).toBe('Simulation Detected');
    expect(result.statusCard.variant).toBe('success');
  });

  it('should map other outcome to Call Completed status card', async () => {
    const otherResponse = JSON.stringify({
      summary: {
        timeline: [{ timestamp: '0:01', label: 'Other', snippet: 'Call dropped.' }],
        disclosedInfo: [],
        outcome: 'other',
      },
      nextSteps: [],
    });

    mockGenerateText.mockResolvedValue({ text: otherResponse });

    const result = await generateVishingConversationsSummary([{ role: 'user', text: 'Hello' }]);

    expect(result.statusCard.title).toBe('Call Completed');
    expect(result.statusCard.variant).toBe('info');
  });

  it('should normalize non-standard timeline labels like Detected', async () => {
    const responseWithDetectedLabel = JSON.stringify({
      summary: {
        timeline: [
          { timestamp: '0:05', label: 'Introduction', snippet: 'Hello from security team.' },
          { timestamp: '0:22', label: 'Detected', snippet: 'User says this sounds like a simulation.' },
        ],
        disclosedInfo: [],
        outcome: 'Detected',
      },
      nextSteps: [{ title: 'Keep verifying', description: 'Continue verifying unknown callers.' }],
    });

    mockGenerateText.mockResolvedValue({ text: responseWithDetectedLabel });

    const result = await generateVishingConversationsSummary([{ role: 'user', text: 'Is this a simulation?' }]);

    expect(result.summary.timeline[1]?.label).toBe('Simulation Reveal');
    expect(result.summary.outcome).toBe('detected');
    expect(result.statusCard.title).toBe('Simulation Detected');
  });

  it('should normalize underscore and hyphen enum variants', async () => {
    const responseWithEnumVariants = JSON.stringify({
      summary: {
        timeline: [
          { timestamp: '0:01', label: 'credibility_building', snippet: 'Caller builds trust.' },
          { timestamp: '0:18', label: 'data-request', snippet: 'Caller asks for account details.' },
        ],
        disclosedInfo: [{ item: 'Account number', timestamp: '0:21' }],
        outcome: 'data-disclosed',
      },
      nextSteps: [{ title: 'Rotate credentials', description: 'Update exposed credentials immediately.' }],
    });

    mockGenerateText.mockResolvedValue({ text: responseWithEnumVariants });

    const result = await generateVishingConversationsSummary([{ role: 'user', text: 'Test enum variants' }]);

    expect(result.summary.timeline[0]?.label).toBe('Credibility Building');
    expect(result.summary.timeline[1]?.label).toBe('Data Request');
    expect(result.summary.outcome).toBe('data_disclosed');
    expect(result.statusCard.title).toBe('Data Disclosed');
  });
});
