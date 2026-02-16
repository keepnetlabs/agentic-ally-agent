/**
 * Integration test: Smishing flow (smishingWorkflowExecutorTool → createSmishingWorkflow)
 *
 * Verifies the full chain: Tool → Policy Summary → Workflow (analyze → sms → landing → save).
 * Mocks: AI (generateText), KV, Product API, brand resolver.
 * Runs: Real tool + real workflow logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { smishingWorkflowExecutorTool } from '../../tools/orchestration/smishing-workflow-executor-tool';
import { SMISHING } from '../../constants';

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  saveSmishingBase: vi.fn(),
  saveSmishingSms: vi.fn(),
  saveSmishingLandingPage: vi.fn(),
  getWhitelabelingConfig: vi.fn(),
  resolveLogoAndBrand: vi.fn(),
  generateContextualBrand: vi.fn(),
  detectIndustry: vi.fn(),
  validateLandingPage: vi.fn(),
  fixBrokenImages: vi.fn(),
  validateImageUrlCached: vi.fn(),
  normalizeImgAttributes: vi.fn(),
  postProcessPhishingLandingHtml: vi.fn(),
  waitForKVConsistency: vi.fn(),
  withRetry: vi.fn(),
  streamDirectReasoning: vi.fn(),
  getPolicySummary: vi.fn(),
}));

vi.mock('ai', () => ({ generateText: mocks.generateText }));

vi.mock('../../utils/core/policy-cache', () => ({
  getPolicySummary: mocks.getPolicySummary,
}));

vi.mock('../../services/kv-service', () => ({
  KVService: vi.fn().mockImplementation(function () {
    return {
      saveSmishingBase: mocks.saveSmishingBase,
      saveSmishingSms: mocks.saveSmishingSms,
      saveSmishingLandingPage: mocks.saveSmishingLandingPage,
    };
  }),
}));

vi.mock('../../services/product-service', () => ({
  ProductService: vi.fn().mockImplementation(function () {
    return {
      getWhitelabelingConfig: mocks.getWhitelabelingConfig,
    };
  }),
}));

vi.mock('../../utils/phishing/brand-resolver', () => ({
  resolveLogoAndBrand: mocks.resolveLogoAndBrand,
  generateContextualBrand: mocks.generateContextualBrand,
}));

vi.mock('../../utils/landing-page', () => ({
  detectIndustry: mocks.detectIndustry,
  validateLandingPage: mocks.validateLandingPage,
  logValidationResults: vi.fn(),
  fixBrokenImages: mocks.fixBrokenImages,
}));

vi.mock('../../utils/landing-page/image-validator', () => ({
  validateImageUrlCached: mocks.validateImageUrlCached,
  normalizeImgAttributes: mocks.normalizeImgAttributes,
  DEFAULT_GENERIC_LOGO: 'default-logo.png',
}));

vi.mock('../../utils/content-processors/phishing-html-postprocessors', () => ({
  postProcessPhishingLandingHtml: mocks.postProcessPhishingLandingHtml,
}));

vi.mock('../../utils/kv-consistency', () => ({
  waitForKVConsistency: mocks.waitForKVConsistency,
  buildExpectedSmishingKeys: vi.fn().mockReturnValue([]),
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: mocks.withRetry,
}));

vi.mock('../../utils/core/reasoning-stream', () => ({
  streamDirectReasoning: mocks.streamDirectReasoning,
}));

vi.mock('../../model-providers', () => ({
  getModelWithOverride: vi.fn().mockReturnValue('mock-model'),
}));

vi.mock('../../utils/prompt-builders/smishing-prompts', () => ({
  buildSmishingAnalysisPrompts: vi.fn().mockReturnValue({ systemPrompt: 'sys', userPrompt: 'usr' }),
  buildSmishingSmsPrompts: vi.fn().mockReturnValue({ systemPrompt: 'sys', userPrompt: 'usr' }),
}));

vi.mock('../../utils/prompt-builders/phishing-prompts', () => ({
  buildLandingPagePrompts: vi.fn().mockReturnValue({
    systemPrompt: 'sys',
    userPrompt: 'usr',
    userContextMessage: undefined,
    emailContextMessage: undefined,
  }),
}));

describe('Smishing Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getPolicySummary.mockResolvedValue('');
    mocks.saveSmishingBase.mockResolvedValue(true);
    mocks.saveSmishingSms.mockResolvedValue(true);
    mocks.saveSmishingLandingPage.mockResolvedValue(true);
    mocks.getWhitelabelingConfig.mockResolvedValue({ mainLogoUrl: 'https://logo.test/logo.png' });
    mocks.resolveLogoAndBrand.mockResolvedValue({
      logoUrl: 'https://logo.test/logo.png',
      brandName: 'TestBrand',
      isRecognizedBrand: true,
    });
    mocks.generateContextualBrand.mockResolvedValue({
      brandName: 'ContextBrand',
      logoUrl: 'https://logo.test/logo.png',
    });
    mocks.detectIndustry.mockResolvedValue({
      industry: 'Technology',
      colors: { primary: '#000', secondary: '#fff', accent: '#f00', gradient: 'linear-gradient(#000,#fff)' },
      typography: { headingClass: 'font-bold', bodyClass: 'font-normal' },
      patterns: { cardStyle: 'rounded', buttonStyle: 'btn', inputStyle: 'input' },
      logoExample: 'logo.png',
    });
    mocks.validateLandingPage.mockReturnValue({ isValid: true, errors: [] });
    mocks.fixBrokenImages.mockImplementation((html: string) => html);
    mocks.validateImageUrlCached.mockResolvedValue(true);
    mocks.normalizeImgAttributes.mockImplementation((html: string) => html);
    mocks.postProcessPhishingLandingHtml.mockImplementation(({ html }: { html: string }) => html);
    mocks.waitForKVConsistency.mockResolvedValue(true);
    mocks.withRetry.mockImplementation(async (fn: () => Promise<unknown>) => fn());
    mocks.streamDirectReasoning.mockResolvedValue(undefined);

    // AI response: analysis + sms + landing (messages must include {PHISHINGURL})
    const mockAiResponse = {
      text: JSON.stringify({
        scenario: 'Parcel Delivery Update',
        name: 'Delivery Alert - Medium',
        description: 'SMS delivery scam simulation',
        category: 'Urgency',
        method: 'Click-Only',
        psychologicalTriggers: ['Urgency', 'Curiosity'],
        tone: 'Urgent',
        keyRedFlags: ['Unknown sender', 'Urgent link'],
        targetAudienceAnalysis: 'Operations team',
        messageStrategy: 'Short alert with link',
        messages: ['Your parcel is ready. Track at {PHISHINGURL}', 'Click to confirm delivery.'],
        pages: [{ type: 'login', template: '<html>Login Page</html>' }],
      }),
    };
    mocks.generateText.mockResolvedValue(mockAiResponse);
  });

  it('should run full smishing flow: tool → workflow → KV save', { timeout: 15000 }, async () => {
    const result = await smishingWorkflowExecutorTool.execute({
      context: {
        workflowType: SMISHING.WORKFLOW_TYPE,
        topic: 'Delivery Update',
        difficulty: 'Medium',
        language: 'en-gb',
      },
    } as any);

    expect(result.success).toBe(true);
    expect(result.data?.smishingId).toBeDefined();
    expect(result.data?.scenario).toBe('Parcel Delivery Update');

    expect(mocks.getPolicySummary).toHaveBeenCalled();
    expect(mocks.saveSmishingBase).toHaveBeenCalled();
    expect(mocks.saveSmishingSms).toHaveBeenCalled();
    expect(mocks.saveSmishingLandingPage).toHaveBeenCalled();
  });

  it('should handle policy summary unavailable gracefully', { timeout: 15000 }, async () => {
    mocks.getPolicySummary.mockRejectedValueOnce(new Error('Policy fetch failed'));

    const result = await smishingWorkflowExecutorTool.execute({
      context: {
        workflowType: SMISHING.WORKFLOW_TYPE,
        topic: 'Account Alert',
      },
    } as any);

    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
