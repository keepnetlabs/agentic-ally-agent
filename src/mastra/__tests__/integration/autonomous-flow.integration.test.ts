/**
 * Integration test: Autonomous flow (executeAutonomousGeneration)
 *
 * Verifies full chains:
 * - Group smishing: selectGroupTrainingTopic → generateSmishingSimulation → workflow → upload → assign
 * - Group phishing: selectGroupTrainingTopic → generatePhishingSimulationForGroup → workflow → upload → assign
 * - User smishing: getUserInfoTool → generateContentForUser → generateSmishingSimulation → upload → assign
 * - User phishing: getUserInfoTool → generateContentForUser → generatePhishingSimulation → upload → assign
 * Mocks: selectGroupTrainingTopic, getUserInfoTool, AI, KV, getPolicySummary, upload/assign tools.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeAutonomousGeneration } from '../../services/autonomous/autonomous-service';
import { requestStorage } from '../../utils/core/request-storage';

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  saveSmishingBase: vi.fn(),
  saveSmishingSms: vi.fn(),
  saveSmishingLandingPage: vi.fn(),
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
  streamDirectReasoning: vi.fn(),
  getPolicySummary: vi.fn(),
  selectGroupTrainingTopic: vi.fn(),
  uploadSmishingExecute: vi.fn(),
  assignSmishingExecute: vi.fn(),
  uploadPhishingExecute: vi.fn(),
  assignPhishingExecute: vi.fn(),
  getUserInfoExecute: vi.fn(),
}));

vi.mock('ai', () => ({ generateText: mocks.generateText }));

vi.mock('../../utils/core/policy-cache', () => ({
  getPolicySummary: mocks.getPolicySummary,
}));

vi.mock('../../services/autonomous/group-topic-service', () => ({
  selectGroupTrainingTopic: mocks.selectGroupTrainingTopic,
}));

vi.mock('../../services/kv-service', () => ({
  KVService: vi.fn().mockImplementation(function () {
    return {
      saveSmishingBase: mocks.saveSmishingBase,
      saveSmishingSms: mocks.saveSmishingSms,
      saveSmishingLandingPage: mocks.saveSmishingLandingPage,
      getSmishing: vi.fn().mockResolvedValue({
        base: { name: 'Test', topic: 'Security', difficulty: 'Medium', method: 'Click-Only' },
        sms: { messages: ['Test {PHISHINGURL}'] },
        landing: { pages: [] },
      }),
      savePhishingBase: mocks.savePhishingBase,
      savePhishingEmail: mocks.savePhishingEmail,
      savePhishingLandingPage: mocks.savePhishingLandingPage,
      getPhishing: vi.fn().mockResolvedValue({
        base: { name: 'Test', topic: 'Security', difficulty: 'Medium', method: 'Click-Only' },
        email: { subject: 'Test', template: '<html>Test {PHISHINGURL}</html>', fromAddress: 'test@test.com', fromName: 'Test' },
        landing: { pages: [] },
      }),
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
  postProcessPhishingEmailHtml: mocks.postProcessPhishingEmailHtml ?? ((x: { html: string }) => x.html),
  postProcessPhishingLandingHtml: mocks.postProcessPhishingLandingHtml,
}));

vi.mock('../../utils/kv-consistency', () => ({
  waitForKVConsistency: mocks.waitForKVConsistency,
  buildExpectedSmishingKeys: vi.fn().mockReturnValue([]),
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: mocks.withRetry,
  withTimeout: vi.fn(<T>(promise: Promise<T>) => promise),
}));

vi.mock('../../utils/core/reasoning-stream', () => ({
  streamDirectReasoning: mocks.streamDirectReasoning,
}));

vi.mock('../../tools/user-management/upload-smishing-tool', () => ({
  uploadSmishingTool: {
    execute: mocks.uploadSmishingExecute,
  },
}));

vi.mock('../../tools/user-management/assign-smishing-tool', () => ({
  assignSmishingTool: {
    execute: mocks.assignSmishingExecute,
  },
}));

vi.mock('../../tools/user-management/get-user-info-tool', () => ({
  getUserInfoTool: {
    execute: mocks.getUserInfoExecute,
  },
}));

vi.mock('../../tools/user-management/upload-phishing-tool', () => ({
  uploadPhishingTool: {
    execute: mocks.uploadPhishingExecute,
  },
}));

vi.mock('../../tools/user-management/assign-phishing-tool', () => ({
  assignPhishingTool: {
    execute: mocks.assignPhishingExecute,
  },
}));

vi.mock('../../tools/orchestration', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tools/orchestration')>();
  return {
    ...actual,
    phishingWorkflowExecutorTool: {
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { phishingId: 'phishing-test-123' },
      }),
    },
  };
});

vi.mock('../../model-providers', () => ({
  getModelWithOverride: vi.fn().mockReturnValue('mock-model'),
  getDefaultAgentModel: vi.fn().mockReturnValue('mock-model'),
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

describe('Autonomous Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requestStorage.enterWith({
      token: 'test-token-32-chars-minimum-required',
      companyId: 'test-company',
      baseApiUrl: 'https://test-api.devkeepnet.com',
    });

    mocks.getPolicySummary.mockResolvedValue('');
    mocks.saveSmishingBase.mockResolvedValue(true);
    mocks.saveSmishingSms.mockResolvedValue(true);
    mocks.saveSmishingLandingPage.mockResolvedValue(true);
    mocks.savePhishingBase.mockResolvedValue(true);
    mocks.savePhishingEmail.mockResolvedValue(true);
    mocks.savePhishingLandingPage.mockResolvedValue(true);
    mocks.postProcessPhishingEmailHtml?.mockImplementation?.((x: { html: string }) => x.html);
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
      colors: {
        primary: '#000',
        secondary: '#fff',
        accent: '#f00',
        gradient: 'linear-gradient(#000,#fff)',
      },
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
    mocks.withRetry.mockImplementation(async (operation: () => Promise<unknown>) => operation());
    mocks.streamDirectReasoning.mockResolvedValue(undefined);

    mocks.selectGroupTrainingTopic.mockResolvedValue({
      topic: 'Phishing & Email Security',
      phishingPrompt: 'Create phishing for email security',
      smishingPrompt: 'Create smishing for email security',
      trainingPrompt: 'Create training for email security',
      objectives: ['Understand phishing'],
      scenarios: ['Email phishing'],
    });

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

    mocks.uploadSmishingExecute.mockResolvedValue({
      success: true,
      data: {
        resourceId: 'res-smishing-123',
        languageId: 'lang-1',
        smishingId: 'smishing-456',
      },
    });

    mocks.assignSmishingExecute.mockResolvedValue({
      success: true,
      message: 'Assigned successfully',
    });

    mocks.uploadPhishingExecute.mockResolvedValue({
      success: true,
      data: {
        resourceId: 'res-phishing-123',
        languageId: 'lang-1',
        phishingId: 'phishing-test-123',
        isQuishing: false,
      },
    });

    mocks.assignPhishingExecute.mockResolvedValue({
      success: true,
      message: 'Assigned successfully',
    });
  });

  it('should run full autonomous group smishing flow', { timeout: 20000 }, async () => {
    const result = await executeAutonomousGeneration({
      token: 'test-token-32-chars-minimum-required',
      targetGroupResourceId: 'group-1',
      actions: ['smishing'],
    });

    expect(result.success).toBe(true);
    expect(result.smishingResult?.success).toBe(true);
    expect(result.actions).toContain('smishing');
    expect(result.message).toBeDefined();

    expect(mocks.selectGroupTrainingTopic).toHaveBeenCalled();
    expect(mocks.uploadSmishingExecute).toHaveBeenCalled();
    expect(mocks.assignSmishingExecute).toHaveBeenCalled();
  });

  it('should run full autonomous group phishing flow', { timeout: 20000 }, async () => {
    const result = await executeAutonomousGeneration({
      token: 'test-token-32-chars-minimum-required',
      targetGroupResourceId: 'group-1',
      actions: ['phishing'],
    });

    expect(result.success).toBe(true);
    expect(result.phishingResult?.success).toBe(true);
    expect(result.actions).toContain('phishing');
    expect(result.message).toBeDefined();

    expect(mocks.selectGroupTrainingTopic).toHaveBeenCalled();
    expect(mocks.uploadPhishingExecute).toHaveBeenCalled();
    expect(mocks.assignPhishingExecute).toHaveBeenCalled();
  });

  it('should run full autonomous user smishing flow', { timeout: 20000 }, async () => {
    mocks.getUserInfoExecute.mockResolvedValue({
      success: true,
      userInfo: {
        targetUserResourceId: 'user-123',
        preferredLanguage: 'en-gb',
        department: 'IT',
      },
      analysisReport: {
        recommended_next_steps: {
          simulations: [{ title: 'SMS Security Test', scenario_type: 'CLICK_ONLY' }],
        },
      },
    });

    const result = await executeAutonomousGeneration({
      token: 'test-token-32-chars-minimum-required',
      targetUserResourceId: 'user-123',
      actions: ['smishing'],
    });

    expect(result.success).toBe(true);
    expect(result.smishingResult?.success).toBe(true);
    expect(result.actions).toContain('smishing');
    expect(result.userInfo?.targetUserResourceId).toBe('user-123');

    expect(mocks.getUserInfoExecute).toHaveBeenCalled();
    expect(mocks.uploadSmishingExecute).toHaveBeenCalled();
    expect(mocks.assignSmishingExecute).toHaveBeenCalled();
  });

  it('should run full autonomous user phishing flow', { timeout: 20000 }, async () => {
    mocks.getUserInfoExecute.mockResolvedValue({
      success: true,
      userInfo: {
        targetUserResourceId: 'user-456',
        preferredLanguage: 'en-gb',
        department: 'Finance',
      },
      analysisReport: {
        recommended_next_steps: {
          simulations: [{ title: 'Invoice Scam', scenario_type: 'CLICK_ONLY', vector: 'EMAIL' }],
        },
      },
    });

    const result = await executeAutonomousGeneration({
      token: 'test-token-32-chars-minimum-required',
      targetUserResourceId: 'user-456',
      actions: ['phishing'],
    });

    expect(result.success).toBe(true);
    expect(result.phishingResult?.success).toBe(true);
    expect(result.actions).toContain('phishing');
    expect(result.userInfo?.targetUserResourceId).toBe('user-456');

    expect(mocks.getUserInfoExecute).toHaveBeenCalled();
    expect(mocks.uploadPhishingExecute).toHaveBeenCalled();
    expect(mocks.assignPhishingExecute).toHaveBeenCalled();
  });

  it('should reject when neither user nor group specified', async () => {
    const result = await executeAutonomousGeneration({
      token: 'test-token',
      actions: ['smishing'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Must specify either user or group');
    expect(mocks.selectGroupTrainingTopic).not.toHaveBeenCalled();
  });
});
