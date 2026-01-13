
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getModelWithOverride } from './model-providers';

// Mock logger
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

    describe('getModelWithOverride', () => {
        it('returns default model result if no override provided', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride(undefined, undefined, defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
            expect(defaultFn).toHaveBeenCalled();
        });

        it('falls back to default if provider invalid', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('INVALID_PROVIDER', 'gpt-4o', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('falls back to default if model name invalid', () => {
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');
            const result = getModelWithOverride('OPENAI', 'INVALID_MODEL', defaultFn);
            expect(result).toBe('DEFAULT_MODEL_OBJ');
        });

        it('attempts to load model valid inputs', () => {
            // We set dummy key so getModel doesn't throw immediate "missing env" error before we can see what happens,
            // although createOpenAI might validate key format, strictly speaking the provider check passes.
            process.env.OPENAI_API_KEY = 'dummy-key';

            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');

            // If getModel succeeds, it returns an object (stream/generateText compatible).
            // If it fails (e.g. network check?), it returns default.
            // But createOpenAI is usually lazy or just creates a config.

            const result = getModelWithOverride('openai', 'gpt-4o', defaultFn);

            // We expect it NOT to be the default string, but the object
            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });

        it('normalizes provider and model names (case/format)', () => {
            process.env.OPENAI_API_KEY = 'dummy-key';
            const defaultFn = vi.fn().mockReturnValue('DEFAULT_MODEL_OBJ');

            // "OpenAI" -> "openai", "GPT-4o" -> "gpt-4o"
            const result = getModelWithOverride('OpenAI', 'GPT-4o', defaultFn);

            expect(result).not.toBe('DEFAULT_MODEL_OBJ');
        });
    });
});
