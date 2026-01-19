
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    extractAndPrepareThreadId,
    buildFinalPromptWithModelOverride
} from './chat-orchestration-helpers';

describe('chat-orchestration-helpers', () => {
    beforeEach(() => {
        vi.resetAllMocks();
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

});
