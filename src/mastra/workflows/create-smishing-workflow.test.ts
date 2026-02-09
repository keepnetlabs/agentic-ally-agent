import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSmishingWorkflow } from './create-smishing-workflow';

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
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  loggerDebug: vi.fn()
}));

vi.mock('ai', () => ({
  generateText: mocks.generateText,
}));

vi.mock('../services/kv-service', () => ({
  KVService: vi.fn().mockImplementation(function () {
    return {
      saveSmishingBase: mocks.saveSmishingBase,
      saveSmishingSms: mocks.saveSmishingSms,
      saveSmishingLandingPage: mocks.saveSmishingLandingPage,
    };
  })
}));

vi.mock('../services/product-service', () => ({
  ProductService: vi.fn().mockImplementation(function () {
    return {
      getWhitelabelingConfig: mocks.getWhitelabelingConfig
    };
  })
}));

vi.mock('../constants', () => ({
  LANDING_PAGE: {
    FLOWS: {
      'Click-Only': ['login'],
      'Data-Submission': ['login', 'verify']
    },
    PAGE_TYPES: ['login', 'verify', 'success', 'info']
  },
  STRING_TRUNCATION: {
    LOGO_URL_PREFIX_LENGTH: 20,
    LOGO_URL_PREFIX_LENGTH_ALT: 20
  },
  KV_NAMESPACES: {
    SMISHING: 'SMISHING_KV'
  },
  SMISHING: {
    DIFFICULTY_LEVELS: ['Easy', 'Medium', 'Hard'],
    DEFAULT_DIFFICULTY: 'Medium',
    ATTACK_METHODS: ['Click-Only', 'Data-Submission'],
    DEFAULT_ATTACK_METHOD: 'Data-Submission'
  },
  PHISHING_EMAIL: {
    MAX_DESCRIPTION_LENGTH: 300
  }
}));

vi.mock('../model-providers', () => ({
  getModelWithOverride: vi.fn().mockReturnValue('mock-model')
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: vi.fn((err) => err instanceof Error ? err : new Error(String(err))),
  logErrorInfo: vi.fn()
}));

vi.mock('../services/error-service', () => ({
  errorService: {
    validation: vi.fn((msg) => ({ message: msg }))
  }
}));

vi.mock('../utils/phishing/brand-resolver', () => ({
  resolveLogoAndBrand: mocks.resolveLogoAndBrand,
  generateContextualBrand: mocks.generateContextualBrand
}));

vi.mock('../utils/landing-page', () => ({
  detectIndustry: mocks.detectIndustry,
  validateLandingPage: mocks.validateLandingPage,
  logValidationResults: vi.fn(),
  fixBrokenImages: mocks.fixBrokenImages
}));

vi.mock('../utils/landing-page/image-validator', () => ({
  validateImageUrlCached: mocks.validateImageUrlCached,
  normalizeImgAttributes: mocks.normalizeImgAttributes,
  DEFAULT_GENERIC_LOGO: 'default-logo.png'
}));

vi.mock('../utils/content-processors/phishing-html-postprocessors', () => ({
  postProcessPhishingLandingHtml: mocks.postProcessPhishingLandingHtml
}));

vi.mock('../utils/kv-consistency', () => ({
  waitForKVConsistency: mocks.waitForKVConsistency,
  buildExpectedSmishingKeys: vi.fn().mockReturnValue([])
}));

vi.mock('../utils/core/resilience-utils', () => ({
  withRetry: mocks.withRetry
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
    debug: mocks.loggerDebug
  })
}));

vi.mock('../utils/prompt-builders/smishing-prompts', () => ({
  buildSmishingAnalysisPrompts: vi.fn().mockReturnValue({ systemPrompt: 'sys', userPrompt: 'usr' }),
  buildSmishingSmsPrompts: vi.fn().mockReturnValue({ systemPrompt: 'sys', userPrompt: 'usr' })
}));

vi.mock('../utils/prompt-builders/phishing-prompts', () => ({
  buildLandingPagePrompts: vi.fn().mockReturnValue({ systemPrompt: 'sys', userPrompt: 'usr' })
}));

vi.mock('../utils/core/reasoning-stream', () => ({
  streamDirectReasoning: mocks.streamDirectReasoning
}));

describe('CreateSmishingWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.saveSmishingBase.mockResolvedValue(true);
    mocks.saveSmishingSms.mockResolvedValue(true);
    mocks.saveSmishingLandingPage.mockResolvedValue(true);
    mocks.getWhitelabelingConfig.mockResolvedValue({
      mainLogoUrl: 'https://whitelabel.com/logo.png'
    });
    mocks.resolveLogoAndBrand.mockResolvedValue({
      logoUrl: 'https://logo.com/logo.png',
      brandName: 'TestBrand',
      isRecognizedBrand: true,
      brandColors: { primary: '#000', secondary: '#fff', accent: '#f00' }
    });
    mocks.generateContextualBrand.mockResolvedValue({
      brandName: 'ContextBrand',
      logoUrl: 'https://context.com/logo.png'
    });
    mocks.detectIndustry.mockResolvedValue({
      industry: 'Technology',
      colors: { primary: '#000', secondary: '#111', accent: '#222', gradient: 'linear-gradient(#000,#111)' },
      typography: { headingClass: 'h', bodyClass: 'b' },
      patterns: { cardStyle: 'card', buttonStyle: 'btn', inputStyle: 'input' },
      logoExample: 'logo'
    });
    mocks.validateLandingPage.mockReturnValue({ isValid: true, errors: [] });
    mocks.fixBrokenImages.mockImplementation((html) => html);
    mocks.validateImageUrlCached.mockResolvedValue(true);
    mocks.normalizeImgAttributes.mockImplementation((html) => html);
    mocks.postProcessPhishingLandingHtml.mockImplementation(({ html }) => html);
    mocks.waitForKVConsistency.mockResolvedValue(true);
    mocks.withRetry.mockImplementation(async (fn) => await fn());

    mocks.generateText.mockResolvedValue({
      text: JSON.stringify({
        scenario: 'Test Scenario',
        name: 'Test Scenario - Medium',
        description: 'Test Description',
        category: 'Urgency',
        method: 'Click-Only',
        psychologicalTriggers: ['Fear'],
        tone: 'Urgent',
        keyRedFlags: ['Odd link'],
        targetAudienceAnalysis: 'Fits IT',
        messageStrategy: 'Short alert',
        messages: ['Update at {PHISHINGURL}'],
        pages: [{ type: 'login', template: '<html>Login</html>' }]
      })
    });
  });

  it('should execute successfully for standard smishing', async () => {
    const run = await createSmishingWorkflow.createRunAsync();
    const input = {
      topic: 'Password Reset',
      language: 'en-gb',
      difficulty: 'Medium' as const,
      method: 'Click-Only' as const,
      targetProfile: { department: 'IT' }
    };

    const result = await run.start({ inputData: input });
    expect(result.status).toBe('success');

    const output = (result as any).result;
    expect(output.smishingId).toBeDefined();
    expect(output.messages).toBeDefined();
    expect(output.landingPage).toBeDefined();
    expect(mocks.saveSmishingBase).toHaveBeenCalled();
    expect(mocks.saveSmishingSms).toHaveBeenCalled();
    expect(mocks.saveSmishingLandingPage).toHaveBeenCalled();
  });

  it('should skip sms generation when includeSms is false', async () => {
    const run = await createSmishingWorkflow.createRunAsync();
    const input = {
      topic: 'No SMS',
      language: 'en-gb',
      includeSms: false,
      includeLandingPage: false
    };

    const result = await run.start({ inputData: input });
    expect(result.status).toBe('success');

    const output = (result as any).result;
    expect(output.messages).toBeUndefined();
    expect(output.landingPage).toBeUndefined();
    expect(mocks.generateText).toHaveBeenCalledTimes(1);
    expect(mocks.saveSmishingSms).not.toHaveBeenCalled();
    expect(mocks.saveSmishingLandingPage).not.toHaveBeenCalled();
  });

  it('should skip landing page generation when includeLandingPage is false', async () => {
    const run = await createSmishingWorkflow.createRunAsync();
    const input = {
      topic: 'No Landing',
      language: 'en-gb',
      includeSms: true,
      includeLandingPage: false
    };

    const result = await run.start({ inputData: input });
    expect(result.status).toBe('success');

    const output = (result as any).result;
    expect(output.messages).toBeDefined();
    expect(output.landingPage).toBeUndefined();
    expect(mocks.generateText).toHaveBeenCalledTimes(2);
    expect(mocks.saveSmishingLandingPage).not.toHaveBeenCalled();
  });

  it('should retry sms generation when {PHISHINGURL} is missing', async () => {
    mocks.generateText
      .mockResolvedValueOnce({
        text: JSON.stringify({
          scenario: 'Test Scenario',
          name: 'Test Scenario - Medium',
          description: 'Test Description',
          category: 'Urgency',
          method: 'Click-Only',
          psychologicalTriggers: ['Fear'],
          tone: 'Urgent',
          keyRedFlags: ['Odd link'],
          targetAudienceAnalysis: 'Fits IT',
          messageStrategy: 'Short alert'
        })
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ messages: ['No link here'] })
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ messages: ['Now with {PHISHINGURL}'] })
      });

    const run = await createSmishingWorkflow.createRunAsync();
    const input = {
      topic: 'Retry SMS',
      language: 'en-gb',
      includeLandingPage: false
    };

    const result = await run.start({ inputData: input });
    expect(result.status).toBe('success');

    const output = (result as any).result;
    expect(output.messages[0]).toContain('{PHISHINGURL}');
    expect(mocks.generateText).toHaveBeenCalledTimes(3);
  });

  it('should handle missing required fields in analysis', async () => {
    mocks.generateText.mockResolvedValueOnce({
      text: JSON.stringify({
        name: 'Missing Scenario',
        description: 'Test',
        method: 'Click-Only'
      })
    });

    const run = await createSmishingWorkflow.createRunAsync();
    const input = { topic: 'Invalid', language: 'en-gb' };

    try {
      await run.start({ inputData: input });
    } catch (e: any) {
      expect(e.message).toContain('Smishing analysis workflow error');
    }
  });

  it('should truncate long analysis description to max length', async () => {
    mocks.generateText.mockResolvedValueOnce({
      text: JSON.stringify({
        scenario: 'Long Description Scenario',
        name: 'Long Description',
        description: 'A'.repeat(500),
        category: 'Urgency',
        method: 'Click-Only'
      })
    });

    const run = await createSmishingWorkflow.createRunAsync();
    const result = await run.start({
      inputData: {
        topic: 'Long Description',
        language: 'en-gb',
        includeSms: false,
        includeLandingPage: false
      }
    });

    expect(result.status).toBe('success');
    expect((result as any).result.analysis.description.length).toBeLessThanOrEqual(300);
  });

  it('should use contextual brand generation when brand is unrecognized and whitelabel is unavailable', async () => {
    mocks.getWhitelabelingConfig.mockResolvedValueOnce(null);
    mocks.resolveLogoAndBrand.mockResolvedValueOnce({
      logoUrl: '',
      brandName: '',
      isRecognizedBrand: false
    });
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const run = await createSmishingWorkflow.createRunAsync();
    const result = await run.start({
      inputData: {
        topic: 'Generic Internal Notice',
        language: 'en-gb',
        includeSms: false,
        includeLandingPage: false
      }
    });

    expect(result.status).toBe('success');
    expect(mocks.generateContextualBrand).toHaveBeenCalled();
    expect((result as any).result.analysis.brandName).toBe('ContextBrand');

    randomSpy.mockRestore();
  });

  it('should fail workflow when sms messages still miss {PHISHINGURL} after retry', async () => {
    mocks.generateText
      .mockResolvedValueOnce({
        text: JSON.stringify({
          scenario: 'Retry Fail Scenario',
          name: 'Retry Fail',
          description: 'Test',
          category: 'Urgency',
          method: 'Click-Only'
        })
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ messages: ['Message without link'] })
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ messages: ['Still no link'] })
      });

    const run = await createSmishingWorkflow.createRunAsync();
    const result = await run.start({
      inputData: {
        topic: 'Retry Link Missing',
        language: 'en-gb',
        includeLandingPage: false
      }
    });

    expect(result.status).toBe('failed');
    expect((result as any).error).toContain('SMS messages must include {PHISHINGURL}');
  });

  it('should fallback to en-gb when analysis language is missing', async () => {
    mocks.generateText.mockResolvedValueOnce({
      text: JSON.stringify({
        scenario: 'No Language',
        name: 'No Language',
        description: 'Test',
        category: 'Urgency',
        method: 'Click-Only'
      })
    });

    const run = await createSmishingWorkflow.createRunAsync();
    const result = await run.start({
      inputData: {
        topic: 'Missing Language',
        includeSms: false,
        includeLandingPage: false
      } as any
    });

    expect(result.status).toBe('success');
    expect(mocks.saveSmishingBase).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      'en-gb'
    );
  });
});
