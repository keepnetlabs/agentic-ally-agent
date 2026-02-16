/**
 * Integration test: Phishing flow (phishingWorkflowExecutorTool → createPhishingWorkflow)
 *
 * Verifies the full chain: Tool → Policy Summary → Workflow (analyze → email → landing → save).
 * Mocks: AI (generateText), KV, Product API, brand resolver.
 * Runs: Real tool + real workflow logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { phishingWorkflowExecutorTool } from '../../tools/orchestration/phishing-workflow-executor-tool';
import { PHISHING } from '../../constants';

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  savePhishingBase: vi.fn(),
  savePhishingEmail: vi.fn(),
  savePhishingLandingPage: vi.fn(),
  getWhitelabelingConfig: vi.fn(),
  resolveLogoAndBrand: vi.fn(),
  generateContextualBrand: vi.fn(),
  detectIndustry: vi.fn(),
  validateLandingPage: vi.fn(),
  fixBrokenImages: vi.fn(),
  validateImageUrlCached: vi.fn(),
  normalizeImgAttributes: vi.fn(),
  postProcessPhishingEmailHtml: vi.fn(),
  postProcessPhishingLandingHtml: vi.fn(),
  waitForKVConsistency: vi.fn(),
  withRetry: vi.fn(),
  retryGenerationWithStrongerPrompt: vi.fn(),
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
      savePhishingBase: mocks.savePhishingBase,
      savePhishingEmail: mocks.savePhishingEmail,
      savePhishingLandingPage: mocks.savePhishingLandingPage,
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
  postProcessPhishingEmailHtml: mocks.postProcessPhishingEmailHtml,
  postProcessPhishingLandingHtml: mocks.postProcessPhishingLandingHtml,
}));

vi.mock('../../utils/kv-consistency', () => ({
  waitForKVConsistency: mocks.waitForKVConsistency,
  buildExpectedPhishingKeys: vi.fn().mockReturnValue([]),
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: mocks.withRetry,
}));

vi.mock('../../utils/phishing/retry-generator', () => ({
  retryGenerationWithStrongerPrompt: mocks.retryGenerationWithStrongerPrompt,
}));

vi.mock('../../utils/core/reasoning-stream', () => ({
  streamDirectReasoning: mocks.streamDirectReasoning,
}));

vi.mock('../../model-providers', () => ({
  getModelWithOverride: vi.fn().mockReturnValue('mock-model'),
}));

vi.mock('../../utils/prompt-builders/phishing-prompts', () => ({
  buildAnalysisPrompts: vi.fn().mockReturnValue({ systemPrompt: 'sys', userPrompt: 'usr' }),
  buildEmailPrompts: vi.fn().mockReturnValue({ systemPrompt: 'sys', userPrompt: 'usr' }),
  buildLandingPagePrompts: vi.fn().mockReturnValue({
    systemPrompt: 'sys',
    userPrompt: 'usr',
    userContextMessage: undefined,
    emailContextMessage: undefined,
  }),
}));

describe('Phishing Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getPolicySummary.mockResolvedValue('');
    mocks.savePhishingBase.mockResolvedValue(true);
    mocks.savePhishingEmail.mockResolvedValue(true);
    mocks.savePhishingLandingPage.mockResolvedValue(true);
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
    mocks.postProcessPhishingEmailHtml.mockImplementation(({ html }: { html: string }) => html);
    mocks.postProcessPhishingLandingHtml.mockImplementation(({ html }: { html: string }) => html);
    mocks.waitForKVConsistency.mockResolvedValue(true);
    mocks.withRetry.mockImplementation(async (fn: () => Promise<unknown>) => fn());
    mocks.streamDirectReasoning.mockResolvedValue(undefined);

    // AI responses: analysis, email, landing (same structure works for all steps)
    const mockAiResponse = {
      text: JSON.stringify({
        scenario: 'Password Reset Alert',
        name: 'Password Reset - Medium',
        description: 'IT security alert for password expiry',
        category: 'Credential Harvesting',
        fromAddress: 'security@company.com',
        fromName: 'IT Security Team',
        method: 'Click-Only',
        isQuishing: false,
        psychologicalTriggers: ['Urgency', 'Authority'],
        keyRedFlags: ['Urgent tone', 'Generic greeting'],
        targetAudienceAnalysis: 'IT department',
        subjectLineStrategy: 'Urgency',
        subject: 'Urgent: Verify your password',
        template: '<html><body>Dear {FIRSTNAME}, verify now. {PHISHINGURL}</body></html>',
        pages: [{ type: 'login', template: '<html>Login Page</html>' }],
      }),
    };
    mocks.generateText.mockResolvedValue(mockAiResponse);

    mocks.retryGenerationWithStrongerPrompt.mockResolvedValue({
      response: mockAiResponse,
      parsedResult: {
        subject: 'Urgent: Verify your password',
        template: '<html><body>Dear {FIRSTNAME}, verify now. {PHISHINGURL}</body></html>',
      },
    });
  });

  it('should run full phishing flow: tool → workflow → KV save', { timeout: 15000 }, async () => {
    const result = await phishingWorkflowExecutorTool.execute({
      context: {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Password Reset',
        difficulty: 'Medium',
        language: 'en-gb',
      },
    } as any);

    expect(result.success).toBe(true);
    expect(result.data?.phishingId).toBeDefined();
    expect(result.data?.subject).toBe('Urgent: Verify your password');
    expect(result.data?.scenario).toBe('Password Reset Alert');

    expect(mocks.getPolicySummary).toHaveBeenCalled();
    expect(mocks.savePhishingBase).toHaveBeenCalled();
    expect(mocks.savePhishingEmail).toHaveBeenCalled();
    expect(mocks.savePhishingLandingPage).toHaveBeenCalled();
  });

  it('should handle policy summary unavailable gracefully', { timeout: 15000 }, async () => {
    mocks.getPolicySummary.mockRejectedValueOnce(new Error('Policy fetch failed'));

    const result = await phishingWorkflowExecutorTool.execute({
      context: {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Invoice Scam',
      },
    } as any);

    // Tool may fail or use fallback - we verify it doesn't crash
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
