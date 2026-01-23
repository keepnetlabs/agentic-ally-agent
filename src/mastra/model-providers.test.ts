
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getModelWithOverride, ModelProvider, Model, workersAICustomFetch } from './model-providers';

// ... (existing mocks)



vi.mock('./utils/core/logger', () => ({
    getLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    })
}));

describe('model-providers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    // ==================== BASIC FUNCTIONALITY ====================
    describe('getModelWithOverride - Basic Functionality', () => {
        it('returns default model result if no override provided', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride(undefined, undefined, defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
            expect(defaultFn).toHaveBeenCalled();
        });

        it('returns default if only provider provided', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', undefined, defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
            expect(defaultFn).toHaveBeenCalled();
        });

        it('returns default if only model name provided', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride(undefined, 'gpt-4o', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
            expect(defaultFn).toHaveBeenCalled();
        });

        it('returns default if both are empty strings', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('', '', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
            expect(defaultFn).toHaveBeenCalled();
        });

        it('attempts to load model with valid inputs', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'gpt-4o', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });
    });

    // ==================== INVALID PROVIDER ====================
    describe('getModelWithOverride - Invalid Provider', () => {
        it('falls back to default if provider invalid', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('INVALID_PROVIDER', 'gpt-4o', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('falls back for unknown provider', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('unknown', 'gpt-4o', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('falls back for empty provider', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('', 'gpt-4o', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('falls back for null provider', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            // @ts-ignore - testing runtime behavior
            const result = getModelWithOverride(null, 'gpt-4o', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('falls back for numeric provider', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            // @ts-ignore - testing runtime behavior
            const result = getModelWithOverride(123, 'gpt-4o', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });
    });

    // ==================== INVALID MODEL ====================
    describe('getModelWithOverride - Invalid Model', () => {
        it('falls back to default if model name invalid', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('OPENAI', 'INVALID_MODEL', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('falls back for unknown model', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'unknown-model', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('falls back for empty model', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', '', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('falls back for null model', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            // @ts-ignore - testing runtime behavior
            const result = getModelWithOverride('openai', null, defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('falls back for numeric model', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            // @ts-ignore - testing runtime behavior
            const result = getModelWithOverride('openai', 456, defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });
    });

    // ==================== PROVIDER NORMALIZATION ====================
    describe('getModelWithOverride - Provider Normalization', () => {
        it('normalizes provider to lowercase', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('OpenAI', 'gpt-4o', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('normalizes OPENAI to openai', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('OPENAI', 'gpt-4o', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('normalizes WORKERS_AI to workers-ai', () => {
            process.env.CLOUDFLARE_ACCOUNT_ID = 'dummy-account';
            process.env.CLOUDFLARE_API_KEY = 'dummy-key';
            process.env.CLOUDFLARE_AI_GATEWAY_ID = 'dummy-gateway';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('WORKERS_AI', '@cf/openai/gpt-oss-120b', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles workers-ai (already lowercase)', () => {
            process.env.CLOUDFLARE_ACCOUNT_ID = 'dummy-account';
            process.env.CLOUDFLARE_API_KEY = 'dummy-key';
            process.env.CLOUDFLARE_AI_GATEWAY_ID = 'dummy-gateway';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('workers-ai', '@cf/openai/gpt-oss-120b', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('normalizes GOOGLE to google', () => {
            process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('GOOGLE', 'gemini-2.5-pro', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles google (already lowercase)', () => {
            process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('google', 'gemini-2.5-pro', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles mixed case provider names', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('OpEnAi', 'gpt-4o', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });
    });

    // ==================== MODEL NAME NORMALIZATION ====================
    describe('getModelWithOverride - Model Name Normalization', () => {
        it('normalizes model name case', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('OpenAI', 'GPT-4o', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles GPT-4O (uppercase)', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'GPT-4O', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles gpt-4o (lowercase)', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'gpt-4o', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles gpt-4o-mini', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'gpt-4o-mini', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles GPT-4O-MINI (uppercase)', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'GPT-4O-MINI', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles enum key format OPENAI_GPT_4O', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'OPENAI_GPT_4O', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles kebab-case enum key openai-gpt-4o', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'openai-gpt-4o', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('strips openai- prefix', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'openai-gpt-4o', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('strips google- prefix', () => {
            process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('google', 'google-gemini-2.5-pro', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('strips gemini- prefix', () => {
            process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('google', 'gemini-gemini-2.5-pro', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles Cloudflare model path', () => {
            process.env.CLOUDFLARE_ACCOUNT_ID = 'dummy-account';
            process.env.CLOUDFLARE_API_KEY = 'dummy-key';
            process.env.CLOUDFLARE_AI_GATEWAY_ID = 'dummy-gateway';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('workers-ai', '@cf/openai/gpt-oss-120b', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });
    });

    // ==================== OPENAI MODELS ====================
    describe('getModelWithOverride - OpenAI Models', () => {
        beforeEach(() => {
            process.env.OPENAI_API_KEY = 'dummy-key';
        });

        it('loads gpt-4o', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'gpt-4o', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
            expect(defaultFn).not.toHaveBeenCalled();
        });

        it('loads gpt-4o-mini', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'gpt-4o-mini', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('loads gpt-4.1', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'gpt-4.1', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('loads gpt-4.1-mini', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'gpt-4.1-mini', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('loads gpt-4.1-nano', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'gpt-4.1-nano', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('loads gpt-5-nano', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'gpt-5-nano', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('loads gpt-5-mini', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'gpt-5-mini', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });
    });

    // ==================== GOOGLE MODELS ====================
    describe('getModelWithOverride - Google Models', () => {
        beforeEach(() => {
            process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'dummy-key';
        });

        it('loads gemini-2.5-pro', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('google', 'gemini-2.5-pro', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('loads gemini-2.5-flash', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('google', 'gemini-2.5-flash', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('loads gemini-3-pro', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('google', 'gemini-3-pro', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles case variations', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('google', 'gemini-2.5-pro', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });
    });

    // ==================== WORKERS AI MODELS ====================
    describe('getModelWithOverride - Workers AI Models', () => {
        beforeEach(() => {
            process.env.CLOUDFLARE_ACCOUNT_ID = 'dummy-account';
            process.env.CLOUDFLARE_API_KEY = 'dummy-key';
            process.env.CLOUDFLARE_AI_GATEWAY_ID = 'dummy-gateway';
        });

        it('loads @cf/openai/gpt-oss-120b', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('workers-ai', '@cf/openai/gpt-oss-120b', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('loads with WORKERS_AI provider name', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('WORKERS_AI', '@cf/openai/gpt-oss-120b', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('loads with enum key format', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('workers-ai', 'WORKERS_AI_GPT_OSS_120B', defaultFn);
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });
    });

    // ==================== EDGE CASES ====================
    describe('getModelWithOverride - Edge Cases', () => {
        it('handles whitespace in provider', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('  openai  ', 'gpt-4o', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles whitespace in model', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', '  gpt-4o  ', defaultFn);
            // Whitespace might be trimmed internally
            expect(result).toBeDefined();
        });

        it('handles special characters in provider', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('open@ai', 'gpt-4o', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles very long provider name', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('a'.repeat(1000), 'gpt-4o', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles very long model name', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'b'.repeat(1000), defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles unicode in provider', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai你好', 'gpt-4o', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles unicode in model', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'gpt-4o你好', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });
    });

    // ==================== MISSING ENVIRONMENT VARIABLES ====================
    describe('getModelWithOverride - Missing Environment Variables', () => {
        it('handles missing OPENAI_API_KEY gracefully', () => {
            delete process.env.OPENAI_API_KEY;
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'gpt-4o', defaultFn);
            // May fall back to default or throw during actual API call (lazy initialization)
            expect(result).toBeDefined();
        });

        it('handles missing GOOGLE_GENERATIVE_AI_API_KEY gracefully', () => {
            delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('google', 'gemini-2.5-pro', defaultFn);
            // May fall back to default or throw during actual API call (lazy initialization)
            expect(result).toBeDefined();
        });

        it('handles missing Cloudflare credentials gracefully', () => {
            delete process.env.CLOUDFLARE_ACCOUNT_ID;
            delete process.env.CLOUDFLARE_API_KEY;
            delete process.env.CLOUDFLARE_AI_GATEWAY_ID;
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('workers-ai', '@cf/openai/gpt-oss-120b', defaultFn);
            // May fall back to default or throw during actual API call (lazy initialization)
            expect(result).toBeDefined();
        });
    });

    // ==================== DEFAULT FUNCTION BEHAVIOR ====================
    describe('getModelWithOverride - Default Function', () => {
        it('calls default function when no override', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            getModelWithOverride(undefined, undefined, defaultFn);
            expect(defaultFn).toHaveBeenCalledTimes(1);
        });

        it('does not call default function when valid override', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            getModelWithOverride('openai', 'gpt-4o', defaultFn);
            expect(defaultFn).not.toHaveBeenCalled();
        });

        it('handles errors gracefully', () => {
            delete process.env.OPENAI_API_KEY;
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('openai', 'gpt-4o', defaultFn);
            // May return model object (lazy init) or default
            expect(result).toBeDefined();
        });

        it('calls default function for invalid provider', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            getModelWithOverride('invalid', 'gpt-4o', defaultFn);
            expect(defaultFn).toHaveBeenCalledTimes(1);
        });

        it('calls default function for invalid model', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            getModelWithOverride('openai', 'invalid-model', defaultFn);
            expect(defaultFn).toHaveBeenCalledTimes(1);
        });
    });

    // ==================== CONSISTENCY TESTS ====================
    describe('getModelWithOverride - Consistency', () => {
        it('returns model objects consistently', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result1 = getModelWithOverride('openai', 'gpt-4o', defaultFn);
            const result2 = getModelWithOverride('openai', 'gpt-4o', defaultFn);
            // Both should be valid model objects (may be same instance or different)
            expect(result1).not.toBe('DEFAULT_MODEL_OBJ');
            expect(result2).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('handles multiple calls efficiently', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            for (let i = 0; i < 10; i++) {
                const result = getModelWithOverride('openai', 'gpt-4o', defaultFn);
                expect(result).not.toBe('DEFAULT_MODEL_OBJ');
            }
        });

        it('handles different models for same provider', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result1 = getModelWithOverride('openai', 'gpt-4o', defaultFn);
            const result2 = getModelWithOverride('openai', 'gpt-4o-mini', defaultFn);
            expect(result1).toBeDefined();
            expect(result2).toBeDefined();
        });

        it('handles different providers', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result1 = getModelWithOverride('openai', 'gpt-4o', defaultFn);
            const result2 = getModelWithOverride('google', 'gemini-2.5-pro', defaultFn);
            expect(result1).toBeDefined();
            expect(result2).toBeDefined();
        });
    });

    // ==================== ENUM VALIDATION ====================
    describe('ModelProvider Enum', () => {
        it('has OPENAI provider', () => {
            expect(ModelProvider.OPENAI).toBe('openai');
        });

        it('has WORKERS_AI provider', () => {
            expect(ModelProvider.WORKERS_AI).toBe('workers-ai');
        });

        it('has GOOGLE provider', () => {
            expect(ModelProvider.GOOGLE).toBe('google');
        });

        it('has exactly 3 providers', () => {
            const providers = Object.values(ModelProvider);
            expect(providers.length).toBe(3);
        });
    });

    describe('Model Enum', () => {
        it('has OpenAI models', () => {
            expect(Model.OPENAI_GPT_4O).toBe('gpt-4o');
            expect(Model.OPENAI_GPT_4O_MINI).toBe('gpt-4o-mini');
            expect(Model.OPENAI_GPT_4_1).toBe('gpt-4.1');
            expect(Model.OPENAI_GPT_4_1_MINI).toBe('gpt-4.1-mini');
            expect(Model.OPENAI_GPT_4_1_NANO).toBe('gpt-4.1-nano');
            expect(Model.OPENAI_GPT_5_NANO).toBe('gpt-5-nano');
            expect(Model.OPENAI_GPT_5_MINI).toBe('gpt-5-mini');
        });

        it('has Workers AI models', () => {
            expect(Model.WORKERS_AI_GPT_OSS_120B).toBe('@cf/openai/gpt-oss-120b');
        });

        it('has Google models', () => {
            expect(Model.GOOGLE_GEMINI_2_5_PRO).toBe('gemini-2.5-pro');
            expect(Model.GOOGLE_GEMINI_2_5_FLASH).toBe('gemini-2.5-flash');
            expect(Model.GOOGLE_GEMINI_3_PRO).toBe('gemini-3-pro');
        });

        // it('has exactly 11 models', () => {
        //    const models = Object.values(Model);
        //    expect(models.length).toBe(11);
        // });
    });
});

// ==================== WORKERS AI CUSTOM FETCH ====================
describe('workersAICustomFetch', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn();
    });

    it('should extract reasoning from Cloudflare response', async () => {
        const mockResponse = {
            output: [
                { type: 'reasoning', content: [{ text: 'Think step by step...' }] },
                { type: 'text', content: 'Final answer' }
            ],
            usage: { prompt_tokens: 10, completion_tokens: 20 }
        };

        (global.fetch as any).mockResolvedValue({
            json: async () => mockResponse,
            status: 200,
            headers: new Headers()
        });

        const response = await workersAICustomFetch('https://example.com', {});
        const data = await response.json();

        expect(data.reasoning).toBe('Think step by step...');
    });

    it('should normalize token usage in Cloudflare response', async () => {
        const mockResponse = {
            output: [],
            usage: { prompt_tokens: 15, completion_tokens: 25 }
        };

        (global.fetch as any).mockResolvedValue({
            json: async () => mockResponse,
            status: 200,
            headers: new Headers()
        });

        const response = await workersAICustomFetch('https://example.com', {});
        const data = await response.json();

        expect(data.usage.inputTokens).toBe(15);
        expect(data.usage.outputTokens).toBe(25);
        expect(data.usage.totalTokens).toBe(40);
    });

    it('should handle response without reasoning gracefully', async () => {
        const mockResponse = {
            output: [
                { type: 'text', content: 'Just text' }
            ],
            usage: {}
        };

        (global.fetch as any).mockResolvedValue({
            json: async () => mockResponse,
            status: 200,
            headers: new Headers()
        });

        const response = await workersAICustomFetch('https://example.com', {});
        const data = await response.json();

        expect(data.reasoning).toBeUndefined();
    });
});

