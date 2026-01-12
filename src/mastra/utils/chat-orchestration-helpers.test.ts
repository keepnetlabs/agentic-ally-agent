
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    preparePIIMaskedInput,
    extractAndPrepareThreadId,
    buildFinalPromptWithModelOverride,
    injectOrchestratorContext
} from './chat-orchestration-helpers';
import * as piiMaskingUtils from './parsers/pii-masking-utils';

// Mock dependencies
vi.mock('./parsers/pii-masking-utils');

describe('chat-orchestration-helpers', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('preparePIIMaskedInput', () => {
        it('masks combined routing context and prompt', () => {
            const prompt = 'My name is John';
            const routingContext = 'User: I am John';

            const mockMapping = { '[PERSON1]': 'John' };
            const mockMaskedText = 'User: I am [PERSON1]\n---CONTENT_SEPARATOR---\nMy name is [PERSON1]';

            vi.mocked(piiMaskingUtils.maskPII).mockReturnValue({
                maskedText: mockMaskedText,
                mapping: mockMapping
            });

            const result = preparePIIMaskedInput(prompt, routingContext);

            expect(piiMaskingUtils.maskPII).toHaveBeenCalledWith(
                expect.stringContaining('---CONTENT_SEPARATOR---')
            );
            expect(result.orchestratorInput).toContain('User: I am [PERSON1]');
            expect(result.maskedPrompt).toBe('My name is [PERSON1]');
            expect(result.piiMapping).toBe(mockMapping);
        });

        it('handles empty routing context', () => {
            const prompt = 'Hello';
            const routingContext = '';

            const mockMaskedText = '\n---CONTENT_SEPARATOR---\nHello';
            vi.mocked(piiMaskingUtils.maskPII).mockReturnValue({
                maskedText: mockMaskedText,
                mapping: {},
            });

            const result = preparePIIMaskedInput(prompt, routingContext);

            // Should just be the masked prompt if context is empty
            expect(result.orchestratorInput).toBe('Hello');
            expect(result.maskedPrompt).toBe('Hello');
        });
    });

    describe('extractAndPrepareThreadId', () => {
        it('returns provided conversationId', () => {
            const body = { conversationId: 'conv-123' };
            expect(extractAndPrepareThreadId(body as any)).toBe('conv-123');
        });

        it('returns provided threadId', () => {
            const body = { threadId: 'thread-123' };
            expect(extractAndPrepareThreadId(body as any)).toBe('thread-123');
        });

        it('returns provided sessionId', () => {
            const body = { sessionId: 'sess-123' };
            expect(extractAndPrepareThreadId(body as any)).toBe('sess-123');
        });

        it('generates a new UUID if no ID provided', () => {
            const body = {};
            const id = extractAndPrepareThreadId(body as any);
            expect(id).toBeDefined();
            expect(id.length).toBeGreaterThan(10); // UUID length
        });
    });

    describe('buildFinalPromptWithModelOverride', () => {
        it('returns original prompt if no override', () => {
            expect(buildFinalPromptWithModelOverride('prompt')).toBe('prompt');
        });

        it('adds provider override', () => {
            expect(buildFinalPromptWithModelOverride('prompt', 'OPENAI')).toContain('[Use this model provider: OPENAI]');
        });

        it('adds provider and model override', () => {
            expect(buildFinalPromptWithModelOverride('prompt', 'OPENAI', 'gpt-4')).toContain('[Use this model: OPENAI - gpt-4]');
        });
    });

    describe('injectOrchestratorContext', () => {
        it('returns finalPrompt if no taskContext', () => {
            expect(injectOrchestratorContext('prompt', undefined, {})).toBe('prompt');
        });

        it('unmasks PII in taskContext and injects it', () => {
            const finalPrompt = 'Do X';
            const taskContext = 'Ask [PERSON1]';
            const piiMapping = { '[PERSON1]': 'Alice' };

            vi.mocked(piiMaskingUtils.unmaskPII).mockReturnValue('Ask Alice');

            const result = injectOrchestratorContext(finalPrompt, taskContext, piiMapping);

            expect(piiMaskingUtils.unmaskPII).toHaveBeenCalledWith(taskContext, piiMapping);
            expect(result).toContain('[CONTEXT FROM ORCHESTRATOR: Ask Alice]');
            expect(result).toContain(finalPrompt);
        });
    });
});
