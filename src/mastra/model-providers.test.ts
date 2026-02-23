/**
 * Unit tests for model-providers
 * Covers ModelProvider enum, Model enum, and getDefaultAgentModel return shape (with mocked env)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelProvider, Model } from './model-providers';

// Mock AI SDK and env-dependent code to avoid actual provider initialization
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => (modelId: string) => ({ id: modelId, provider: 'openai' })),
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => (modelId: string) => ({ id: modelId, provider: 'google' })),
}));

vi.mock('./utils/core/logger', () => ({
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

vi.mock('./utils/core/error-utils', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  logErrorInfo: vi.fn(),
}));

vi.mock('./services/error-service', () => ({
  errorService: { external: vi.fn() },
}));

describe('model-providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ModelProvider enum', () => {
    it('should have openai provider', () => {
      expect(ModelProvider.OPENAI).toBe('openai');
    });

    it('should have workers-ai provider', () => {
      expect(ModelProvider.WORKERS_AI).toBe('workers-ai');
    });

    it('should have google provider', () => {
      expect(ModelProvider.GOOGLE).toBe('google');
    });

    it('should have 3 provider values', () => {
      expect(Object.values(ModelProvider)).toHaveLength(3);
    });
  });

  describe('Model enum', () => {
    it('should have OpenAI models', () => {
      expect(Model.OPENAI_GPT_4O).toBe('gpt-4o');
      expect(Model.OPENAI_GPT_4O_MINI).toBe('gpt-4o-mini');
      expect(Model.OPENAI_GPT_5_1).toBe('gpt-5.1');
    });

    it('should have Workers AI model', () => {
      expect(Model.WORKERS_AI_GPT_OSS_120B).toBe('@cf/openai/gpt-oss-120b');
    });

    it('should have Google Gemini models', () => {
      expect(Model.GOOGLE_GEMINI_2_5_PRO).toBe('gemini-2.5-pro');
      expect(Model.GOOGLE_GEMINI_2_5_FLASH).toBe('gemini-2.5-flash');
    });
  });

  describe('getDefaultAgentModel', () => {
    it('should return model when OPENAI_API_KEY is set', async () => {
      const orig = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const { getDefaultAgentModel } = await import('./model-providers');
      const model = getDefaultAgentModel();

      expect(model).toBeDefined();
      expect(model).toHaveProperty('id');
      expect(model.id).toBe(Model.OPENAI_GPT_5_1);

      process.env.OPENAI_API_KEY = orig;
    });
  });

  describe('getLightAgentModel', () => {
    it('should return lightweight model when OPENAI_API_KEY is set', async () => {
      const orig = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const { getLightAgentModel } = await import('./model-providers');
      const model = getLightAgentModel();

      expect(model).toBeDefined();
      expect(model.id).toBe(Model.OPENAI_GPT_4O_MINI);

      process.env.OPENAI_API_KEY = orig;
    });
  });
});
