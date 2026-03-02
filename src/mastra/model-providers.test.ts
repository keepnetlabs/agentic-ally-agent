/**
 * Unit tests for model-providers
 * Covers ModelProvider enum, Model enum, and getDefaultAgentModel return shape (with mocked env)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelProvider, Model } from './model-providers';
import type { LanguageModel } from './types/language-model';

// Minimal mock shape for AI SDK v5 LanguageModelV2 (uses modelId, not id)
const mockModel = (modelId: string): LanguageModel =>
  ({ modelId, provider: 'openai' }) as LanguageModel;

// Mock AI SDK and env-dependent code to avoid actual provider initialization
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => (modelId: string) => mockModel(modelId)),
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => (modelId: string) => mockModel(modelId)),
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
      expect(model).toHaveProperty('modelId');
      expect(model.modelId).toBe(Model.OPENAI_GPT_5_1);

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
      expect(model.modelId).toBe(Model.OPENAI_GPT_4O_MINI);

      process.env.OPENAI_API_KEY = orig;
    });
  });

  describe('getModel', () => {
    it('should return model for valid provider and model', async () => {
      const orig = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const { getModel } = await import('./model-providers');
      const model = getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_4O_MINI);
      expect(model).toBeDefined();
      expect(model.modelId).toBe(Model.OPENAI_GPT_4O_MINI);

      process.env.OPENAI_API_KEY = orig;
    });

    it('should use cached provider on second call', async () => {
      const orig = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const { getModel } = await import('./model-providers');
      const model1 = getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_4O_MINI);
      const model2 = getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_4O);
      expect(model1).toBeDefined();
      expect(model2).toBeDefined();
      expect(model1.modelId).toBe(Model.OPENAI_GPT_4O_MINI);
      expect(model2.modelId).toBe(Model.OPENAI_GPT_4O);

      process.env.OPENAI_API_KEY = orig;
    });
  });

  describe('getModelWithOverride', () => {
    it('should use default when modelProvider and modelName are empty', async () => {
      const defaultMock = vi.fn(() => mockModel('default-model'));
      const { getModelWithOverride } = await import('./model-providers');
      const result = getModelWithOverride(undefined, undefined, defaultMock as any);
      expect(defaultMock).toHaveBeenCalled();
      expect(result.modelId).toBe('default-model');
    });

    it('should use default when modelProvider is empty string', async () => {
      const defaultMock = vi.fn(() => mockModel('default-model'));
      const { getModelWithOverride } = await import('./model-providers');
      const result = getModelWithOverride('', 'gpt-4o', defaultMock as any);
      expect(defaultMock).toHaveBeenCalled();
      expect(result.modelId).toBe('default-model');
    });

    it('should return override model when valid openai provider and model', async () => {
      const orig = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const defaultMock = vi.fn(() => mockModel('default'));
      const { getModelWithOverride } = await import('./model-providers');
      const result = getModelWithOverride('openai', 'gpt-4o-mini', defaultMock as any);
      expect(defaultMock).not.toHaveBeenCalled();
      expect(result.modelId).toBe(Model.OPENAI_GPT_4O_MINI);

      process.env.OPENAI_API_KEY = orig;
    });

    it('should accept uppercase provider format', async () => {
      const orig = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const defaultMock = vi.fn(() => mockModel('default'));
      const { getModelWithOverride } = await import('./model-providers');
      const result = getModelWithOverride('OPENAI', 'OPENAI_GPT_4O_MINI', defaultMock as any);
      expect(defaultMock).not.toHaveBeenCalled();
      expect(result.modelId).toBe(Model.OPENAI_GPT_4O_MINI);

      process.env.OPENAI_API_KEY = orig;
    });

    it('should fall back to default when model is invalid', async () => {
      const orig = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const defaultMock = vi.fn(() => mockModel('default-model'));
      const { getModelWithOverride } = await import('./model-providers');
      const result = getModelWithOverride('openai', 'invalid-model-xyz', defaultMock as any);
      expect(defaultMock).toHaveBeenCalled();
      expect(result.modelId).toBe('default-model');

      process.env.OPENAI_API_KEY = orig;
    });

    it('should fall back to default when modelProvider is null', async () => {
      const defaultMock = vi.fn(() => mockModel('fallback'));
      const { getModelWithOverride } = await import('./model-providers');
      const result = getModelWithOverride(null as any, 'gpt-4o', defaultMock as any);
      expect(defaultMock).toHaveBeenCalled();
      expect(result.modelId).toBe('fallback');
    });

    it('should use default when modelName is empty string with valid provider', async () => {
      const orig = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const defaultMock = vi.fn(() => mockModel('default'));
      const { getModelWithOverride } = await import('./model-providers');
      const result = getModelWithOverride('openai', '', defaultMock as any);
      expect(defaultMock).toHaveBeenCalled();
      expect(result.modelId).toBe('default');

      process.env.OPENAI_API_KEY = orig;
    });
  });

  describe('workersAICustomFetch', () => {
    it('should transform Cloudflare response to AI SDK v5 format', async () => {
      const mockResponse = {
        output: [
          { type: 'message', content: [{ type: 'text', text: 'Hi' }] },
          { type: 'reasoning', content: [{ type: 'text', text: 'reasoning text' }] },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      };
      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        status: 200,
        headers: new Headers(),
      });

      global.fetch = fetchMock;

      const { workersAICustomFetch } = await import('./model-providers');
      const response = await workersAICustomFetch('https://example.com');
      const data = await response.json();

      expect(data.reasoning).toBe('reasoning text');
      expect(data.usage.inputTokens).toBe(10);
      expect(data.usage.outputTokens).toBe(5);
      expect(data.usage.totalTokens).toBe(15);

      global.fetch = undefined as any;
    });

    it('should handle response without reasoning', async () => {
      const mockResponse = {
        output: [{ type: 'message', content: [{ type: 'text', text: 'Hi' }] }],
        usage: { prompt_tokens: 5, completion_tokens: 3 },
      };
      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        status: 200,
        headers: new Headers(),
      });
      global.fetch = fetchMock;

      const { workersAICustomFetch } = await import('./model-providers');
      const response = await workersAICustomFetch('https://example.com');
      const data = await response.json();

      expect(data.reasoning).toBeUndefined();
      expect(data.usage.inputTokens).toBe(5);
      expect(data.usage.outputTokens).toBe(3);

      global.fetch = undefined as any;
    });
  });
});
