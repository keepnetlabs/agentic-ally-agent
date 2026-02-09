import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPhishingWorkflow } from './create-phishing-workflow';
import { generateText } from 'ai';
import { KVService } from '../services/kv-service';
import { ProductService } from '../services/product-service';

// Mocks using flattened hoisted object for reliability
const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
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
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  loggerDebug: vi.fn()
}));

// Mock Dependencies
vi.mock('ai', () => ({
  generateText: mocks.generateText,
  streamText: mocks.streamText,
}));

vi.mock('../services/kv-service', () => ({
  KVService: vi.fn().mockImplementation(function () {
    return {
      savePhishingBase: mocks.savePhishingBase,
      savePhishingEmail: mocks.savePhishingEmail,
      savePhishingLandingPage: mocks.savePhishingLandingPage
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

// Fix circular dependency by mocking constants
vi.mock('../constants', () => ({
  MODEL_PROVIDERS: {
    NAMES: ['OPENAI', 'WORKERS_AI', 'GOOGLE'],
    DEFAULT: 'OPENAI'
  },
  LANDING_PAGE: {
    FLOWS: {
      'Click-Only': ['login'],
      'Data-Submission': ['login', 'verify']
    },
    PAGE_TYPES: ['login', 'success', 'info'],
    PLACEHOLDERS: {
      SIMULATION_LINK: '{SIMULATION_LINK}',
      TRACK_ID: '{TRACK_ID}',
      EMAIL: '{EMAIL}'
    }
  },
  STRING_TRUNCATION: {
    LOGO_URL_PREFIX_LENGTH: 20,
    LOGO_URL_PREFIX_LENGTH_ALT: 20
  },
  KV_NAMESPACES: {
    PHISHING: 'PHISHING_KV'
  },
  PHISHING: {
    DIFFICULTY_LEVELS: ['Easy', 'Medium', 'Hard'],
    DEFAULT_DIFFICULTY: 'Medium',
    ATTACK_METHODS: ['Click-Only', 'Data-Submission'],
    DEFAULT_ATTACK_METHOD: 'Data-Submission',
    TIMING: {
      GENERATION_SECONDS_MIN: 20,
      GENERATION_SECONDS_MAX: 30
    },
    MIN_TOPIC_LENGTH: 3,
    MAX_TOPIC_LENGTH: 200
  },
  PHISHING_EMAIL: {
    MAX_SUBJECT_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 300,
    MANDATORY_TAGS: ['{PHISHINGURL}'],
    RECOMMENDED_TAGS: ['{FIRSTNAME}']
  }
}));

// Mock model providers to avoid import issues
vi.mock('../model-providers', () => ({
  getModelWithOverride: vi.fn().mockReturnValue('mock-model')
}));

// Mock error utilities
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
  postProcessPhishingEmailHtml: mocks.postProcessPhishingEmailHtml,
  postProcessPhishingLandingHtml: mocks.postProcessPhishingLandingHtml
}));

vi.mock('../utils/kv-consistency', () => ({
  waitForKVConsistency: mocks.waitForKVConsistency,
  buildExpectedPhishingKeys: vi.fn().mockReturnValue([])
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

// Mock prompt builders to avoid complex dependencies
vi.mock('../utils/prompt-builders/phishing-prompts', () => ({
  buildAnalysisPrompts: vi.fn().mockReturnValue({ systemPrompt: 'sys', userPrompt: 'usr' }),
  buildEmailPrompts: vi.fn().mockReturnValue({ systemPrompt: 'sys', userPrompt: 'usr' }),
  buildLandingPagePrompts: vi.fn().mockReturnValue({ systemPrompt: 'sys', userPrompt: 'usr' })
}));

vi.mock('../utils/phishing/retry-generator', () => ({
  retryGenerationWithStrongerPrompt: mocks.retryGenerationWithStrongerPrompt || vi.fn()
}));

vi.mock('../utils/core/reasoning-stream', () => ({
  streamDirectReasoning: mocks.streamDirectReasoning || vi.fn()
}));

describe('CreatePhishingWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mocks.savePhishingBase.mockResolvedValue(true);
    mocks.savePhishingEmail.mockResolvedValue(true);
    mocks.savePhishingLandingPage.mockResolvedValue(true);
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
      colors: { primary: '#000' }
    });
    mocks.validateLandingPage.mockReturnValue({ isValid: true, errors: [] });
    mocks.fixBrokenImages.mockImplementation((html) => html);
    mocks.validateImageUrlCached.mockResolvedValue(true);
    mocks.normalizeImgAttributes.mockImplementation((html) => html);
    mocks.postProcessPhishingEmailHtml.mockImplementation(({ html }) => html);
    mocks.postProcessPhishingLandingHtml.mockImplementation(({ html }) => html);
    mocks.waitForKVConsistency.mockResolvedValue(true);
    mocks.withRetry.mockImplementation(async (fn) => await fn());

    // Setup default AI responses
    mocks.generateText.mockResolvedValue({
      text: JSON.stringify({
        scenario: 'Test Scenario',
        category: 'Urgency',
        fromAddress: 'security@test.com',
        fromName: 'Security Team',
        method: 'Click-Only',
        isQuishing: false,
        psychologicalTriggers: ['Fear'],
        subject: 'Urgent Alert',
        template: '<html>Test Email {CUSTOMMAINLOGO}</html>',
        pages: [{ type: 'login', template: '<html>Login Page</html>' }]
      })
    });

    mocks.retryGenerationWithStrongerPrompt.mockResolvedValue({
      response: { text: JSON.stringify({ subject: 'Retry Success', template: '<html>Retry</html>' }) },
      parsedResult: { subject: 'Retry Success', template: '<html>Retry</html>' }
    });
    mocks.streamDirectReasoning.mockResolvedValue(true);
  });

  describe('Workflow Execution', () => {
    it('should execute successfully for standard phishing', async () => {
      const run = await createPhishingWorkflow.createRunAsync();

      const input = {
        topic: 'Password Reset',
        language: 'en',
        isQuishing: false,
        difficulty: 'Medium' as const,
        method: 'Click-Only' as const,
        targetProfile: { department: 'IT' }
      };

      const result = await run.start({ inputData: input });

      expect(result.status).toBe('success');
      const output = (result as any).result;

      expect(output.phishingId).toBeDefined();
      expect(output.subject).toBe('Urgent Alert');
      expect(mocks.savePhishingBase).toHaveBeenCalled();
    });

    it('should execute successfully for quishing', async () => {
      // Mock analysis to return quishing scenario
      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          scenario: 'QR Code Scan',
          category: 'Urgency',
          fromAddress: 'hr@test.com',
          fromName: 'HR',
          method: 'Data-Submission',
          isQuishing: true
        })
      });

      const run = await createPhishingWorkflow.createRunAsync();
      const input = {
        topic: 'HR Survey',
        isQuishing: true,
        language: 'en'
      };

      const result = await run.start({ inputData: input });
      expect(result.status).toBe('success');
      expect((result as any).result.analysis.isQuishing).toBe(true);
    });

    it('should handle analysis step failure', async () => {
      mocks.generateText.mockRejectedValue(new Error('AI invalid response'));

      const run = await createPhishingWorkflow.createRunAsync();
      const input = { topic: 'Fail', language: 'en', isQuishing: false };

      try {
        await run.start({ inputData: input });
      } catch (e: any) {
        expect(e.message).toContain('Phishing analysis workflow error');
      }
    });

    it('should handle email generation failure', async () => {
      // First call (Analysis) succeeds
      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          scenario: 'Test', category: 'Test', fromAddress: 'test@test.com', fromName: 'Test', method: 'Click-Only'
        })
      });

      // Second call (Email) fails
      mocks.generateText.mockRejectedValueOnce(new Error('Email Gen Failed'));

      const run = await createPhishingWorkflow.createRunAsync();
      const input = { topic: 'Fail Email', language: 'en', isQuishing: false };

      try {
        await run.start({ inputData: input });
      } catch (e: any) {
        expect(e.message).toContain('Phishing email generation workflow error');
      }
    });

    it('should skip email generation if includeEmail is false', async () => {
      const run = await createPhishingWorkflow.createRunAsync();
      const input = {
        topic: 'No Email',
        language: 'en',
        isQuishing: false,
        includeEmail: false,
        includeLandingPage: false
      };

      const result = await run.start({ inputData: input });

      expect(result.status).toBe('success');
      const output = (result as any).result;

      // Should have analysis but no email content
      expect(output.analysis).toBeDefined();
      expect(output.subject).toBeUndefined();
      expect(output.template).toBeUndefined();

      expect(output.template).toBeUndefined();

      // Should not have called email generation prompt
      // generateText is called only once for analysis
      expect(mocks.generateText).toHaveBeenCalledTimes(1);
    });

    it('should handle landing page generation failure', async () => {
      // First call (Analysis) succeeds
      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          scenario: 'Test', category: 'Test', fromAddress: 'test@test.com', fromName: 'Test', method: 'Click-Only'
        })
      });

      // Second call (Email) succeeds
      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          subject: 'Test', template: '<html>Test</html>'
        })
      });

      // Third call (Landing Page) fails
      mocks.generateText.mockRejectedValueOnce(new Error('Landing Page Gen Failed'));

      const run = await createPhishingWorkflow.createRunAsync();
      const input = { topic: 'Fail Landing', language: 'en', isQuishing: false };

      try {
        await run.start({ inputData: input });
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });

    it('should skip landing page generation if includeLandingPage is false', async () => {
      const run = await createPhishingWorkflow.createRunAsync();
      const input = {
        topic: 'No Landing Page',
        language: 'en',
        isQuishing: false,
        includeEmail: true,
        includeLandingPage: false
      };

      const result = await run.start({ inputData: input });

      expect(result.status).toBe('success');
      const output = (result as any).result;

      // Should have email content but no landing page
      expect(output.subject).toBeDefined();
      expect(output.template).toBeDefined();
      expect(output.landingPage).toBeUndefined();

      expect(output.landingPage).toBeUndefined();

      // generateText called twice: analysis + email (no landing page)
      expect(mocks.generateText).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Validation', () => {
    it('should truncate description if longer than 300 characters', async () => {
      const longDescription = 'A'.repeat(350);
      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          scenario: 'Test',
          category: 'Test',
          fromAddress: 'test@test.com',
          fromName: 'Test',
          method: 'Click-Only',
          description: longDescription
        })
      });

      const run = await createPhishingWorkflow.createRunAsync();
      const input = { topic: 'Long Description', language: 'en', isQuishing: false, includeEmail: false, includeLandingPage: false };

      const result = await run.start({ inputData: input });

      expect(result.status).toBe('success');
      const output = (result as any).result;
      expect(output.analysis.description.length).toBeLessThanOrEqual(300);
    });

    it('should handle missing required fields in analysis', async () => {
      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          scenario: 'Test',
          // Missing category, fromAddress, method
        })
      });

      const run = await createPhishingWorkflow.createRunAsync();
      const input = { topic: 'Invalid', language: 'en', isQuishing: false };

      try {
        await run.start({ inputData: input });
      } catch (e: any) {
        expect(e.message).toContain('Phishing analysis workflow error');
      }
    });

    it('should handle missing required fields in email', async () => {
      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          scenario: 'Test',
          category: 'Test',
          fromAddress: 'test@test.com',
          fromName: 'Test',
          method: 'Click-Only'
        })
      });

      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          subject: 'Test'
          // Missing template
        })
      });

      const run = await createPhishingWorkflow.createRunAsync();
      const input = { topic: 'Invalid Email', language: 'en', isQuishing: false, includeLandingPage: false };

      try {
        await run.start({ inputData: input });
      } catch (e: any) {
        expect(e.message).toContain('Phishing email generation workflow error');
      }
    });

    it('should default isQuishing to false when missing from both agent input and AI response', async () => {
      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          scenario: 'Test',
          category: 'Test',
          fromAddress: 'test@test.com',
          fromName: 'Test',
          method: 'Click-Only'
        })
      });

      const run = await createPhishingWorkflow.createRunAsync();
      const result = await run.start({
        inputData: {
          topic: 'No Quishing Field',
          language: 'en',
          includeEmail: false,
          includeLandingPage: false
        }
      });

      expect(result.status).toBe('success');
      expect((result as any).result.analysis.isQuishing).toBe(false);
    });
  });

  describe('Save to KV', () => {
    it('should handle KV save failure', async () => {
      mocks.savePhishingBase.mockRejectedValue(new Error('KV Save Failed'));

      const run = await createPhishingWorkflow.createRunAsync();
      const input = { topic: 'KV Fail', language: 'en', isQuishing: false };

      try {
        await run.start({ inputData: input });
      } catch (e: any) {
        expect(e.message).toContain('KV Save Failed');
      }
    });
  });

  describe('Whitelabel & Branding', () => {
    it('should use whitelabel logo if brand is not recognized', async () => {
      mocks.resolveLogoAndBrand.mockResolvedValue({
        logoUrl: '',
        isRecognizedBrand: false
      });

      const run = await createPhishingWorkflow.createRunAsync();
      const input = { topic: 'Generic IT', language: 'en', isQuishing: false };

      await run.start({ inputData: input });

      expect(mocks.getWhitelabelingConfig).toHaveBeenCalled();
    });

    it('should replace CUSTOMMAINLOGO in email template', async () => {
      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          scenario: 'Test',
          category: 'Test',
          fromAddress: 'test@test.com',
          fromName: 'Test',
          method: 'Click-Only'
        })
      });

      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          subject: 'Test',
          template: '<html><img src="{CUSTOMMAINLOGO}" /></html>'
        })
      });

      const run = await createPhishingWorkflow.createRunAsync();
      const input = { topic: 'Logo Test', language: 'en', isQuishing: false, includeLandingPage: false };

      const result = await run.start({ inputData: input });

      expect(result.status).toBe('success');
      const output = (result as any).result;
      // Template should have logo URL replaced
      expect(output.template).not.toContain('{CUSTOMMAINLOGO}');
    });

    it('should use contextual brand generation when brand is unrecognized and no whitelabel logo', async () => {
      mocks.getWhitelabelingConfig.mockResolvedValueOnce(null);
      mocks.resolveLogoAndBrand.mockResolvedValueOnce({
        logoUrl: '',
        brandName: '',
        isRecognizedBrand: false
      });

      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const run = await createPhishingWorkflow.createRunAsync();
      const result = await run.start({
        inputData: {
          topic: 'Generic Internal Notice',
          language: 'en',
          includeEmail: false,
          includeLandingPage: false
        }
      });

      expect(result.status).toBe('success');
      expect(mocks.generateContextualBrand).toHaveBeenCalled();
      expect((result as any).result.analysis.brandName).toBe('ContextBrand');

      randomSpy.mockRestore();
    });
  });

  describe('Attack Methods', () => {
    it('should execute successfully for Data-Submission method', async () => {
      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          scenario: 'Data Collection',
          category: 'Urgency',
          fromAddress: 'it@test.com',
          fromName: 'IT',
          method: 'Data-Submission',
          isQuishing: false
        })
      });

      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          subject: 'Submit Data',
          template: '<html>Submit Form</html>'
        })
      });

      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          pages: [
            { type: 'login', template: '<html>Login</html>' },
            { type: 'verify', template: '<html>Verify</html>' }
          ]
        })
      });

      const run = await createPhishingWorkflow.createRunAsync();
      const input = {
        topic: 'Data Submission Test',
        language: 'en',
        isQuishing: false,
        method: 'Data-Submission' as const
      };

      const result = await run.start({ inputData: input });

      expect(result.status).toBe('success');
      const output = (result as any).result;
      expect(output.landingPage.pages.length).toBe(2);
    });
    it('should prioritize agent-provided isQuishing over AI output', async () => {
      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({ scenario: 'Test', category: 'Test', fromAddress: 'a@a.com', fromName: 'A', method: 'Click-Only', isQuishing: false })
      });

      const run = await createPhishingWorkflow.createRunAsync();
      const input = { topic: 'Test', language: 'en', isQuishing: true };

      const result = await run.start({ inputData: input });
      expect((result as any).result.analysis.isQuishing).toBe(true);
    });
  });

  describe('Reasoning & Streaming', () => {
    it('should stream reasoning if present in AI response', async () => {
      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({ scenario: 'Test', category: 'Test', fromAddress: 'a@a.com', fromName: 'A', method: 'Click-Only' }),
        response: {
          body: {
            reasoning: 'AI reasoning text'
          }
        }
      } as any);

      const writer = { write: vi.fn() };
      const run = await createPhishingWorkflow.createRunAsync();
      await run.start({ inputData: { topic: 'Reasoning Test', language: 'en', writer } });

      expect(mocks.streamDirectReasoning).toHaveBeenCalledWith('AI reasoning text', expect.anything());
    });
  });

  describe('Advanced Retry Logic', () => {
    it('should use retryGenerationWithStrongerPrompt if primary email generation fails', async () => {
      // Analysis succeeds
      mocks.generateText.mockResolvedValueOnce({
        text: JSON.stringify({ scenario: 'Test', category: 'Test', fromAddress: 'a@a.com', fromName: 'A', method: 'Click-Only' })
      });
      // Email Gen fails primary attempt
      mocks.generateText.mockRejectedValueOnce(new Error('Primary Fail'));

      const run = await createPhishingWorkflow.createRunAsync();
      const result = await run.start({ inputData: { topic: 'Retry Test', language: 'en' } });

      expect(result.status).toBe('success');
      expect(mocks.retryGenerationWithStrongerPrompt).toHaveBeenCalled();
      expect((result as any).result.subject).toBe('Retry Success');
    });

    it('should fail email generation when industry design is missing from analysis', async () => {
      mocks.detectIndustry.mockResolvedValueOnce(undefined as any);
      mocks.resolveLogoAndBrand.mockResolvedValueOnce({
        logoUrl: '',
        brandName: '',
        isRecognizedBrand: false
      });

      const run = await createPhishingWorkflow.createRunAsync();
      const input = { topic: 'Missing Industry Design', language: 'en', includeLandingPage: false };

      const result = await run.start({ inputData: input });
      expect(result.status).toBe('failed');
      expect((result as any).error).toContain('Cannot read properties of undefined');
    });

    it('should fail landing page generation when industry design is missing and email is skipped', async () => {
      mocks.detectIndustry.mockResolvedValueOnce(undefined as any);
      mocks.resolveLogoAndBrand.mockResolvedValueOnce({
        logoUrl: '',
        brandName: '',
        isRecognizedBrand: false
      });

      const run = await createPhishingWorkflow.createRunAsync();
      const input = {
        topic: 'Landing Without Industry',
        language: 'en',
        includeEmail: false,
        includeLandingPage: true
      };

      const result = await run.start({ inputData: input });
      expect(result.status).toBe('failed');
      expect((result as any).error).toContain('Cannot read properties of undefined');
    });
  });

  describe('KV Save Behavior', () => {
    it('should save only base content when email and landing page are disabled', async () => {
      const run = await createPhishingWorkflow.createRunAsync();
      const result = await run.start({
        inputData: {
          topic: 'Base Only',
          language: 'en',
          includeEmail: false,
          includeLandingPage: false
        }
      });

      expect(result.status).toBe('success');
      expect(mocks.savePhishingBase).toHaveBeenCalledTimes(1);
      expect(mocks.savePhishingEmail).not.toHaveBeenCalled();
      expect(mocks.savePhishingLandingPage).not.toHaveBeenCalled();
    });
  });
});
